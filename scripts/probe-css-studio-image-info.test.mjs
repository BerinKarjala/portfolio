import { expect, it, vi } from "vitest";
import { probeImageInfo } from "./probe-css-studio-image-info.mjs";
const secret = "ab".repeat(32),
  token = "test-only-api-token";
const proof = {
  session: true,
  cookie: true,
  crossOriginRejected: true,
  remainingPrompts: 10,
  remainingImages: 3,
  sharedRemaining: 2000,
};
function fixture() {
  const fetch = vi.fn(async () =>
    Response.json({
      info: { width: 64, height: 64, format: "image/png" },
      elapsedWallMs: 4,
      inferencePerformed: false,
      transformationPerformed: false,
      cpuMeasured: false,
    }),
  );
  const proxy = vi.fn(async () => proof);
  const deploy = vi.fn(async ({ check }) =>
    check({
      secret,
      fetch,
      now: () => Date.UTC(2026, 9, 21, 18),
      log: () => {},
    }),
  );
  return {
    fetch,
    proxy,
    deploy,
    readiness: vi.fn(async () => ({
      imagesPlan: "unknown",
      billingVisibility: "forbidden",
    })),
    write: vi.fn(),
    log: vi.fn(),
    now: () => Date.UTC(2026, 9, 21, 18),
  };
}
it("reads billing separately, deploys the preserving configuration, and performs exactly one free metadata probe", async () => {
  const f = fixture();
  const result = await probeImageInfo({ token, ...f });
  expect(f.readiness).toHaveBeenCalledOnce();
  expect(f.deploy).toHaveBeenCalledOnce();
  expect(f.proxy).toHaveBeenCalledTimes(2);
  expect(f.fetch).toHaveBeenCalledExactlyOnceWith(
    "https://css-studio-ai.berin-karjala.workers.dev/api/css-studio/image-info-probe",
    expect.objectContaining({
      method: "POST",
      redirect: "error",
      body: "{}",
      headers: expect.objectContaining({
        Origin: "https://berinkarjala.netlify.app",
        "X-CSS-Studio-Canary": secret,
        "X-CSS-Studio": "1",
      }),
    }),
  );
  expect(result).toMatchObject({
    imagesPlan: "unknown",
    readyForTransform: false,
    inferencePerformed: false,
    transformationPerformed: false,
    cpuMeasured: false,
    info: { width: 64, height: 64, format: "image/png" },
    sharedRemaining: 2000,
  });
  expect(f.write).toHaveBeenCalledExactlyOnceWith(result);
  expect(JSON.stringify([result, f.log.mock.calls])).not.toMatch(
    /test-only-api-token|abababab/,
  );
});
it("rejects inconsistent quotas or metadata and never retries a failed probe", async () => {
  for (const changed of ["quota", "output", "error", "oversized"]) {
    const f = fixture();
    if (changed === "quota")
      f.proxy
        .mockResolvedValueOnce(proof)
        .mockResolvedValueOnce({ ...proof, sharedRemaining: 1500 });
    if (changed === "output")
      f.fetch.mockResolvedValueOnce(
        Response.json({
          info: { width: 64, height: 64, format: "image/png" },
          inferencePerformed: true,
        }),
      );
    if (changed === "error")
      f.fetch.mockResolvedValueOnce(new Response(secret, { status: 503 }));
    if (changed === "oversized")
      f.fetch.mockResolvedValueOnce(new Response("x".repeat(4097)));
    await expect(probeImageInfo({ token, ...f })).rejects.toThrow();
    expect(f.fetch).toHaveBeenCalledOnce();
    expect(f.write).not.toHaveBeenCalled();
    expect(JSON.stringify(f.log.mock.calls)).not.toContain(secret);
  }
});
it("does not dispatch metadata unless the session-only browser check passed", async () => {
  const f = fixture();
  f.proxy.mockResolvedValueOnce({ ...proof, crossOriginRejected: false });
  await expect(probeImageInfo({ token, ...f })).rejects.toThrow();
  expect(f.fetch).not.toHaveBeenCalled();
  expect(f.write).not.toHaveBeenCalled();
});
it("requires valid per-session allowance snapshots before dispatch", async () => {
  for (const change of [
    { remainingPrompts: undefined },
    { remainingImages: undefined },
    { remainingPrompts: -1 },
    { remainingImages: 4 },
  ]) {
    const f = fixture();
    f.proxy.mockResolvedValueOnce({ ...proof, ...change });
    await expect(probeImageInfo({ token, ...f })).rejects.toThrow();
    expect(f.fetch).not.toHaveBeenCalled();
  }
});
