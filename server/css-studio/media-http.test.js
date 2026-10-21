import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { createApp } from "./http";
import { createIdentity } from "./identity";
import { ImageLimitError } from "./providerErrors.js";
import { KLEIN_IMAGE_MODEL, KLEIN_IMAGE_PLAN } from "./kleinProvider.js";
const secret = "ab".repeat(32),
  origin = "https://studio.test";
const image = () =>
  new Blob(
    [readFileSync("public/css-studio/images/spring/spring-01-woodland.webp")],
    { type: "image/webp" },
  );
const input = {
  id: "00000000-0000-4000-8000-000000000001",
  operation: "image",
  prompt: "A forest",
  history: [],
  context: { family: "seasons", id: "spring", mode: "light", contrast: false },
};
async function setup(policy = {}, clock = Date.now) {
  const identity = createIdentity(secret),
    cookie = (await identity.issue()).cookie.split(";")[0];
  const ledger = {
    reserve: vi.fn(async () => ({
      admitted: true,
      deadline: Date.now() + 30000,
    })),
    settle: vi.fn(async () => ({ settled: true })),
    snapshot: vi.fn(async () => ({ available: true })),
  };
  const provider = {
    propose: vi.fn(),
    image: {
      propose: vi.fn(async () => ({
        proposal: { message: "Forest", overrides: {} },
        image: image(),
      })),
      inspectImage: vi.fn(async () => ({ width: 1600, height: 1067 })),
    },
  };
  const app = createApp({
    origin,
    secret,
    ledger,
    provider,
    clock,
    policy: {
      verifiedUntil: Date.now() + 86400000,
      reservedNeurons: 100,
      maxOutputTokens: 512,
      timeoutMs: 200,
      imageNeurons: 1000,
      imageWidth: 1600,
      imageHeight: 1067,
      imageSteps: 4,
      ...policy,
    },
  });
  const post = (body) =>
    app(
      new Request(origin + "/api/css-studio/propose", {
        method: "POST",
        headers: {
          origin,
          "x-css-studio": "1",
          cookie,
          ...(body instanceof FormData
            ? {}
            : { "content-type": "application/json" }),
        },
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
    );
  return { app, post, provider, ledger, cookie, identity };
}
it("issues an owned receipt for validated output and verifies a refinement attachment before reserving/dispatching", async () => {
  const { post, provider, ledger } = await setup();
  const generated = await post(input);
  expect(generated.status).toBe(200);
  const form = await generated.formData(),
    proposal = JSON.parse(form.get("proposal"));
  expect(proposal.receipt).toMatch(/^media-v1\./);
  expect(form.get("image").size).toBe(image().size);
  const refinement = {
    ...input,
    id: crypto.randomUUID(),
    operation: "refine",
    baseImageId: "generated-00000000-0000-4000-8000-000000000001",
  };
  const attachment = new FormData();
  attachment.set("request", JSON.stringify(refinement));
  attachment.set("receipt", proposal.receipt);
  attachment.set("image", image(), "base.webp");
  expect((await post(attachment)).status).toBe(200);
  expect(provider.image.propose.mock.calls[1][1].baseImage.size).toBe(
    image().size,
  );
  expect(ledger.reserve.mock.calls[1][0]).toMatchObject({
    operation: "refine",
    reservedNeurons: 1000,
  });
  attachment.set(
    "image",
    new Blob(["changed"], { type: "image/webp" }),
    "base.webp",
  );
  expect((await post(attachment)).status).toBe(409);
  expect(ledger.reserve).toHaveBeenCalledTimes(2);
});
it("rejects missing proof, duplicate parts, wrong-owner receipts and unsafe provider output without leaking media", async () => {
  const { post, app, ledger, identity, provider } = await setup();
  const generated = await post(input);
  const proof = JSON.parse(
    (await generated.formData()).get("proposal"),
  ).receipt;
  const refinement = {
    ...input,
    id: crypto.randomUUID(),
    operation: "refine",
    baseImageId: "generated-00000000-0000-4000-8000-000000000001",
  };
  expect((await post(refinement)).status).toBe(409);
  const form = new FormData();
  form.set("request", JSON.stringify(refinement));
  form.set("receipt", proof);
  form.set("image", image(), "base.webp");
  form.append("image", image(), "extra.webp");
  expect((await post(form)).status).toBe(400);
  form.delete("image");
  form.set("image", image(), "base.webp");
  const other = (await identity.issue()).cookie.split(";")[0];
  const response = await app(
    new Request(origin + "/api/css-studio/propose", {
      method: "POST",
      headers: { origin, "x-css-studio": "1", cookie: other },
      body: form,
    }),
  );
  expect(response.status).toBe(409);
  expect(ledger.reserve).toHaveBeenCalledOnce();
  provider.image.propose.mockResolvedValue({
    proposal: { message: "bad", overrides: {} },
    image: new Blob(["<svg/>"], { type: "image/svg+xml" }),
  });
  expect((await post({ ...input, id: crypto.randomUUID() })).status).toBe(502);
});

it("admits every image transform atomically before dispatch and validates using the image adapter", async () => {
  const { post, provider, ledger } = await setup();
  provider.validateRequest = vi.fn(() => {
    throw Error("Theme-only adapter");
  });
  provider.image.validateRequest = vi.fn();
  provider.image.transformsFor = vi.fn((request) =>
    request.operation === "refine" ? 2 : 1,
  );
  const generated = await post(input);
  expect(generated.status).toBe(200);
  expect(provider.validateRequest).not.toHaveBeenCalled();
  expect(provider.image.validateRequest).toHaveBeenCalledExactlyOnceWith(input);
  expect(ledger.reserve).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ imageTransforms: 1 }),
  );
  const proposal = JSON.parse((await generated.formData()).get("proposal"));
  const attachment = new FormData();
  attachment.set(
    "request",
    JSON.stringify({
      ...input,
      id: crypto.randomUUID(),
      operation: "refine",
      baseImageId: "generated-00000000-0000-4000-8000-000000000001",
    }),
  );
  attachment.set("receipt", proposal.receipt);
  attachment.set("image", image(), "base.webp");
  ledger.reserve.mockResolvedValueOnce({
    admitted: false,
    status: 429,
    code: "image-transform-limit",
  });
  expect((await post(attachment)).status).toBe(429);
  expect(ledger.reserve.mock.calls[1][0].imageTransforms).toBe(2);
  expect(provider.image.propose).toHaveBeenCalledOnce();
});

it("does not refund fixed image charges from adapter-nominated usage", async () => {
  const { post, provider, ledger } = await setup();
  provider.image.propose.mockResolvedValue({
    proposal: { message: "Forest", overrides: {} },
    image: image(),
    usage: { verified: true, neurons: 0 },
  });
  expect((await post(input)).status).toBe(200);
  expect(ledger.settle).toHaveBeenCalledExactlyOnceWith(
    expect.not.objectContaining({ measuredNeurons: expect.anything() }),
  );
});

it("halts only monthly image allowance on known Images exhaustion", async () => {
  const { post, provider, ledger, app, cookie } = await setup();
  provider.image.propose.mockRejectedValue(new ImageLimitError());
  expect((await post(input)).status).toBe(429);
  expect(ledger.settle.mock.calls[0][0].outcome).toBe(
    "image-provider-exhausted",
  );
  ledger.snapshot.mockResolvedValue({ available: true, imageAvailable: false });
  const response = await app(
    new Request(origin + "/api/css-studio/status", { headers: { cookie } }),
  );
  expect((await response.json()).operations).toEqual(["theme"]);
});

it("requires the exact reviewed Klein cost and geometry before advertising media", async () => {
  for (const changed of [
    { imageNeurons: 499 },
    { imageWidth: 1024 },
    { imageHeight: 1024 },
    { imageSteps: 3 },
  ]) {
    const { post, provider, ledger } = await setup({
      ...KLEIN_IMAGE_PLAN,
      ...changed,
    });
    provider.image.model = KLEIN_IMAGE_MODEL;
    provider.image.transformsFor = () => 1;
    expect((await post(input)).status).toBe(503);
    expect(ledger.reserve).not.toHaveBeenCalled();
    expect(provider.image.propose).not.toHaveBeenCalled();
  }
});

it("expires the image review independently of a later text-plan extension", async () => {
  const nextReview = Date.UTC(2026, 9, 28);
  const { app, provider } = await setup(
    { ...KLEIN_IMAGE_PLAN, verifiedUntil: nextReview + 86400000 },
    () => nextReview,
  );
  provider.image.model = KLEIN_IMAGE_MODEL;
  provider.image.transformsFor = () => 1;
  const session = await app(
    new Request(origin + "/api/css-studio/session", {
      method: "POST",
      headers: {
        origin,
        "x-css-studio": "1",
        "content-type": "application/json",
      },
      body: "{}",
    }),
  );
  const response = await app(
    new Request(origin + "/api/css-studio/status", {
      headers: { cookie: session.headers.get("set-cookie").split(";")[0] },
    }),
  );
  expect((await response.json()).operations).toEqual(["theme"]);
});
