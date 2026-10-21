import { expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  runPrivateImagePilot,
  deployImagePilot,
} from "./run-css-studio-image-pilot.mjs";
const secret = "ab".repeat(32);
const id = "a427c1c5-5940-44e2-9610-6eca34a18cc9";
async function fixture() {
  const bytes = await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#ccddee" },
  })
    .png()
    .toBuffer();
  let submitted = false;
  const fetch = vi.fn(async (url, options) => {
    const path = new URL(url).pathname;
    const privateRequest = new Headers(options.headers).has(
      "X-CSS-Studio-Canary",
    );
    if (path.endsWith("status"))
      return Response.json(
        privateRequest
          ? {
              available: true,
              day: "2026-10-21",
              operations: ["theme", "image", "refine"],
              remaining: {
                prompts: submitted ? 9 : 10,
                images: submitted ? 2 : 3,
              },
              sharedRemaining: submitted ? 1500 : 2000,
              imageTransformsRemaining: submitted ? 4999 : 5000,
            }
          : { available: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (path.endsWith("session"))
      return Response.json(
        { available: true },
        {
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie":
              "__Host-css-studio=test-only-signed-cookie; Path=/; Secure; HttpOnly; SameSite=Strict",
          },
        },
      );
    if (path.endsWith("propose")) {
      submitted = true;
      const form = new FormData();
      form.set(
        "proposal",
        JSON.stringify({
          requestId: id,
          message: "Background proposal ready to preview.",
          overrides: {},
          receipt: "media-v1." + "a".repeat(16) + "." + "b".repeat(30),
        }),
      );
      form.set(
        "image",
        new Blob([bytes], { type: "image/png" }),
        "background.png",
      );
      return new Response(form, { headers: { "Cache-Control": "no-store" } });
    }
    throw Error("Unexpected fixture request");
  });
  return {
    fetch,
    write: vi.fn(),
    log: vi.fn(),
    now: () => Date.UTC(2026, 9, 21, 20),
    makeId: () => id,
    trace: vi.fn(async (_, run) => ({
      result: await run(),
      telemetry: { cpuMeasured: false, reason: "timings-absent" },
    })),
    bytes,
  };
}
it("submits exactly one fixed image proposal and verifies full raster plus same-visitor daily/monthly charges", async () => {
  const f = await fixture();
  const record = await runPrivateImagePilot({ secret, ...f });
  const calls = f.fetch.mock.calls.filter(([url]) => url.endsWith("propose"));
  expect(calls).toHaveLength(1);
  const [url, options] = calls[0];
  expect(url).toBe(
    "https://css-studio-ai.berin-karjala.workers.dev/api/css-studio/propose",
  );
  expect(options.redirect).toBe("error");
  expect(new Headers(options.headers).get("X-CSS-Studio-Canary-Image")).toBe(
    "klein-4b",
  );
  expect(new Headers(options.headers).get("X-CSS-Studio-Pilot-Id")).toBe(id);
  expect(JSON.parse(options.body)).toMatchObject({
    id,
    operation: "image",
    history: [],
    context: { family: "seasons", id: "winter" },
  });
  expect(record).toMatchObject({
    valid: true,
    proposalRequests: 1,
    modelCompletionVerified: true,
    cpuMeasured: false,
    image: {
      width: 512,
      height: 512,
      mime: "image/png",
      bytes: f.bytes.length,
    },
    sharedBefore: 2000,
    sharedAfter: 1500,
    transformsBefore: 5000,
    transformsAfter: 4999,
  });
  expect(f.write).toHaveBeenCalledOnce();
  expect(JSON.stringify([record, f.log.mock.calls])).not.toMatch(
    /abababab|test-only-signed-cookie|media-v1/,
  );
});
it("does not submit with missing monthly visibility or insufficient allowance", async () => {
  for (const patch of [
    { imageTransformsRemaining: undefined },
    { imageTransformsRemaining: 0 },
    { sharedRemaining: 499 },
  ]) {
    const f = await fixture(),
      original = f.fetch.getMockImplementation();
    f.fetch.mockImplementation(async (url, options) => {
      const response = await original(url, options);
      if (
        url.endsWith("status") &&
        new Headers(options.headers).has("X-CSS-Studio-Canary")
      )
        return Response.json(
          { ...(await response.json()), ...patch },
          { headers: { "Cache-Control": "no-store" } },
        );
      return response;
    });
    await expect(runPrivateImagePilot({ secret, ...f })).rejects.toThrow();
    expect(
      f.fetch.mock.calls.filter(([url]) => url.endsWith("propose")),
    ).toHaveLength(0);
  }
});
it("retains safe failure evidence and never retries a failed proposal", async () => {
  const f = await fixture(),
    original = f.fetch.getMockImplementation();
  f.fetch.mockImplementation(async (url, options) =>
    url.endsWith("propose")
      ? new Response(secret, {
          status: 504,
          headers: { "Cache-Control": "no-store" },
        })
      : original(url, options),
  );
  await expect(runPrivateImagePilot({ secret, ...f })).rejects.toThrow();
  expect(
    f.fetch.mock.calls.filter(([url]) => url.endsWith("propose")),
  ).toHaveLength(1);
  expect(f.write).toHaveBeenCalledOnce();
  expect(f.write.mock.calls[0][0].record).toMatchObject({
    valid: false,
    proposalRequests: 1,
    modelCompletionVerified: false,
    httpStatus: 504,
  });
  expect(JSON.stringify(f.write.mock.calls)).not.toContain(secret);
});
it("rejects malformed image bytes and suppresses receipts in retained results", async () => {
  const f = await fixture(),
    original = f.fetch.getMockImplementation();
  f.fetch.mockImplementation(async (url, options) => {
    const response = await original(url, options);
    if (!url.endsWith("propose")) return response;
    const form = await response.formData();
    form.set(
      "image",
      new Blob(["invalid PNG"], { type: "image/png" }),
      "background.png",
    );
    return new Response(form, { headers: { "Cache-Control": "no-store" } });
  });
  await expect(runPrivateImagePilot({ secret, ...f })).rejects.toThrow();
  expect(f.write.mock.calls[0][0].record.valid).toBe(false);
  expect(f.write.mock.calls[0][0].image).toBeUndefined();
});
it("retains charged failure evidence without claiming model completion or retrying", async () => {
  const f = await fixture(),
    original = f.fetch.getMockImplementation();
  f.fetch.mockImplementation(async (url, options) => {
    const response = await original(url, options);
    return url.endsWith("propose")
      ? new Response("private provider error", {
          status: 504,
          headers: { "Cache-Control": "no-store" },
        })
      : response;
  });
  await expect(runPrivateImagePilot({ secret, ...f })).rejects.toThrow();
  expect(
    f.fetch.mock.calls.filter(([url]) => url.endsWith("propose")),
  ).toHaveLength(1);
  expect(f.write.mock.calls[0][0].record).toMatchObject({
    valid: false,
    modelCompletionVerified: false,
    accountingVerified: true,
    sharedAfter: 1500,
    transformsAfter: 4999,
    publicUnavailableVerifiedAfter: true,
  });
});
it("checks public availability even if the private post-status fails and reports unknown public state honestly", async () => {
  for (const fault of ["private", "public"]) {
    const f = await fixture(),
      original = f.fetch.getMockImplementation();
    let generated = false,
      publicAfter = 0;
    f.fetch.mockImplementation(async (url, options) => {
      const privateRequest = new Headers(options.headers).has(
        "X-CSS-Studio-Canary",
      );
      if (generated && url.endsWith("status")) {
        if (!privateRequest) publicAfter++;
        if (fault === "private" && privateRequest)
          throw Error("private status failure");
        if (fault === "public" && !privateRequest)
          return Response.json(
            { available: true },
            { headers: { "Cache-Control": "no-store" } },
          );
      }
      const response = await original(url, options);
      if (url.endsWith("propose")) generated = true;
      return response;
    });
    await expect(runPrivateImagePilot({ secret, ...f })).rejects.toThrow();
    expect(publicAfter).toBe(1);
    expect(f.write.mock.calls[0][0].record).toMatchObject({
      valid: false,
      publicInferenceEnabled: fault === "private" ? false : null,
      publicUnavailableVerifiedAfter: fault === "private",
    });
    expect(f.write.mock.calls[0][0].image).toBeUndefined();
  }
});
it("requires browser proof and rejects callback reentry before a second proposal", async () => {
  const pilot = vi.fn();
  await expect(
    deployImagePilot({
      token: "test-token",
      deploy: async ({ check }) => check({ secret }),
      proxy: async () => ({
        session: true,
        cookie: true,
        crossOriginRejected: false,
      }),
      pilot,
    }),
  ).rejects.toThrow();
  expect(pilot).not.toHaveBeenCalled();
  const f = await fixture();
  f.trace = async (_, run) => {
    await run();
    await run();
  };
  await expect(runPrivateImagePilot({ secret, ...f })).rejects.toThrow();
  expect(
    f.fetch.mock.calls.filter(([url]) => url.endsWith("propose")),
  ).toHaveLength(1);
});
