import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { createApp } from "./http";
import { createIdentity } from "./identity";
import {
  ImageLimitError,
  ProviderLimitError,
  ProviderOutputError,
} from "./providerErrors.js";
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
async function setup(policy = {}, clock = Date.now, diagnostics = false) {
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
    diagnostics,
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
  const post = (body, headers = {}) =>
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
          ...headers,
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

it("projects only fixed private image failure evidence from the admitted payload", async () => {
  let now = Date.now();
  const { post, provider, ledger } = await setup({}, () => now, true);
  let latePhase;
  provider.image.propose.mockImplementation(async (_input, { onPhase }) => {
    latePhase = onPhase;
    onPhase("normalize");
    onPhase("private provider text must never become a phase");
    now += 23;
    throw Error("private provider error and credential");
  });
  ledger.settle.mockImplementation(async () => {
    latePhase("raster");
    return { settled: true };
  });
  const response = await post(input, {
    "X-CSS-Studio-Pilot-Id": "00000000-0000-4000-8000-000000000099",
  });
  expect(response.status).toBe(504);
  const body = await response.json();
  expect(body.diagnostic).toEqual({
    requestId: input.id,
    phase: "normalize",
    failure: "operation-failed",
    elapsedWallMs: 23,
    timeoutMs: 200,
  });
  expect(JSON.stringify(body)).not.toMatch(
    /private provider|credential|000000000099/,
  );
  expect(ledger.reserve).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ reservedNeurons: 1000 }),
  );
  expect(ledger.settle).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ outcome: "uncertain" }),
  );
  expect(ledger.settle.mock.calls[0][0]).not.toHaveProperty("measuredNeurons");
});

it("preserves output and allowance status/accounting while identifying their last phase", async () => {
  for (const [error, phase, status, failure, outcome] of [
    [new ProviderOutputError(), "raster", 502, "invalid-output", "complete"],
    [
      new ProviderLimitError(),
      "provider",
      429,
      "allowance-exhausted",
      "provider-exhausted",
    ],
    [
      new ImageLimitError(),
      "normalize",
      429,
      "allowance-exhausted",
      "image-provider-exhausted",
    ],
  ]) {
    const { post, provider, ledger } = await setup({}, Date.now, true);
    provider.image.propose.mockImplementation(async (_input, { onPhase }) => {
      onPhase(phase);
      throw error;
    });
    const response = await post(input);
    expect(response.status).toBe(status);
    expect((await response.json()).diagnostic).toMatchObject({
      requestId: input.id,
      phase,
      failure,
      timeoutMs: 200,
    });
    expect(ledger.settle).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome }),
    );
    expect(ledger.settle.mock.calls[0][0]).not.toHaveProperty(
      "measuredNeurons",
    );
  }
});

it("keeps failure diagnostics unavailable to request flags, truthy options and text operations", async () => {
  for (const diagnostics of [undefined, false, "true", 1, true]) {
    const { post, provider } = await setup({}, Date.now, diagnostics);
    const operation = diagnostics === true ? "theme" : "image";
    const selected = operation === "theme" ? provider : provider.image;
    selected.propose.mockRejectedValue(Error("private provider error"));
    const response = await post(
      { ...input, operation },
      {
        "X-CSS-Studio-Canary-Image": "klein-4b",
        "X-CSS-Studio-Diagnostics": "true",
      },
    );
    expect(response.status).toBe(504);
    expect(await response.json()).not.toHaveProperty("diagnostic");
    expect(selected.propose.mock.calls[0][1]).not.toHaveProperty("onPhase");
  }
});

it("records the request deadline before abort rejection and ignores late phase callbacks", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    for (const phase of ["provider", "normalize"]) {
      let now = Date.now(),
        latePhase,
        activeSignal;
      const entered = Promise.withResolvers();
      const { post, provider, ledger } = await setup(
        { timeoutMs: 18000 },
        () => now,
        true,
      );
      provider.image.propose.mockImplementation(
        (_input, { signal, onPhase }) => {
          activeSignal = signal;
          latePhase = onPhase;
          onPhase(phase);
          entered.resolve();
          return new Promise((_, reject) =>
            signal.addEventListener(
              "abort",
              () => {
                onPhase("receipt");
                reject(new DOMException("private abort details", "AbortError"));
              },
              { once: true },
            ),
          );
        },
      );
      const pending = post(input);
      await entered.promise;
      now += 18000;
      await vi.advanceTimersByTimeAsync(18000);
      const response = await pending;
      expect(response.status).toBe(504);
      const body = await response.json();
      expect(body.diagnostic).toEqual({
        requestId: input.id,
        phase,
        failure: "request-deadline",
        elapsedWallMs: 18000,
        timeoutMs: 18000,
      });
      latePhase("receipt");
      expect(body.diagnostic.phase).toBe(phase);
      expect(activeSignal.aborted).toBe(true);
      expect(ledger.settle).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ outcome: "uncertain" }),
      );
      expect(provider.image.propose).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    }
  } finally {
    vi.useRealTimers();
  }
});

it("reports refinement failures under the owned refinement request ID", async () => {
  const { post, provider, ledger } = await setup({}, Date.now, true);
  const generated = await post(input);
  const receipt = JSON.parse(
    (await generated.formData()).get("proposal"),
  ).receipt;
  const refinement = {
    ...input,
    id: crypto.randomUUID(),
    operation: "refine",
    baseImageId: "generated-00000000-0000-4000-8000-000000000001",
  };
  const form = new FormData();
  form.set("request", JSON.stringify(refinement));
  form.set("receipt", receipt);
  form.set("image", image(), "owned.webp");
  provider.image.propose.mockImplementation(async (_input, { onPhase }) => {
    onPhase("normalize");
    throw Error("private owned image decoder details");
  });
  const response = await post(form);
  expect(response.status).toBe(504);
  expect((await response.json()).diagnostic).toMatchObject({
    requestId: refinement.id,
    phase: "normalize",
    failure: "operation-failed",
  });
  expect(ledger.settle.mock.calls.map(([value]) => value.outcome)).toEqual([
    "complete",
    "uncertain",
  ]);
  expect(provider.image.propose).toHaveBeenCalledTimes(2);
});

it("retains one uncertain settlement when an uncooperative provider completes after the deadline", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    let now = Date.now();
    const entered = Promise.withResolvers(),
      late = Promise.withResolvers(),
      inspected = Promise.withResolvers();
    const { post, provider, ledger } = await setup(
      { timeoutMs: 18000 },
      () => now,
      true,
    );
    let latePhase;
    provider.image.propose.mockImplementation((_input, { onPhase }) => {
      latePhase = onPhase;
      onPhase("provider");
      entered.resolve();
      return late.promise;
    });
    provider.image.inspectImage.mockImplementation(async () => {
      inspected.resolve();
      throw Error("late receipt failure");
    });
    const pending = post(input);
    await entered.promise;
    now += 18000;
    await vi.advanceTimersByTimeAsync(18000);
    const response = await pending;
    const body = await response.json();
    expect(response.status).toBe(504);
    expect(body.diagnostic).toMatchObject({
      phase: "provider",
      failure: "request-deadline",
      elapsedWallMs: 18000,
    });
    latePhase("normalize");
    late.resolve({
      proposal: { message: "Late forest", overrides: {} },
      image: image(),
    });
    await inspected.promise;
    await vi.advanceTimersByTimeAsync(0);
    expect(body.diagnostic.phase).toBe("provider");
    expect(ledger.settle).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ outcome: "uncertain" }),
    );
    expect(provider.image.propose).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

it("marks receipt validation failures without changing completed reservations", async () => {
  const { post, provider, ledger } = await setup({}, Date.now, true);
  provider.image.inspectImage.mockRejectedValue(
    Error("private receipt internals"),
  );
  const response = await post(input);
  expect(response.status).toBe(502);
  expect((await response.json()).diagnostic).toMatchObject({
    phase: "receipt",
    failure: "invalid-output",
  });
  expect(ledger.settle).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ outcome: "complete" }),
  );
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
