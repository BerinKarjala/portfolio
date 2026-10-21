import { expect, it, vi } from "vitest";
import { createApp } from "./http";
import { createIdentity } from "./identity";
const origin = "https://studio.test";
const secret = "ab".repeat(32);
const id = "00000000-0000-4000-8000-000000000001";
const input = {
  id,
  operation: "theme",
  prompt: "Calm autumn",
  history: [],
  context: { family: "seasons", id: "fall", mode: "light", contrast: false },
};
const post = (path, body = {}, cookie = "", headers = {}) =>
  new Request(origin + path, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-css-studio": "1",
      cookie,
      ...headers,
    },
    body: JSON.stringify(body),
  });
const testPolicy = {
  verifiedUntil: Date.now() + 86400000,
  reservedNeurons: 100,
  maxOutputTokens: 512,
  timeoutMs: 25,
};
async function fixture(changes = {}) {
  const identity = createIdentity(secret);
  const cookie = (await identity.issue()).cookie.split(";")[0];
  const ledger = {
    reserve: vi.fn(async () => ({
      admitted: true,
      day: "2026-10-20",
      deadline: Date.now() + 30000,
    })),
    settle: vi.fn(async () => ({ settled: true })),
    snapshot: vi.fn(async () => ({ available: true })),
  };
  const provider = {
    propose: vi.fn(async () => ({
      proposal: { message: "Calm", overrides: { accent: "#166534" } },
    })),
  };
  return {
    cookie,
    ledger,
    provider,
    app: createApp({
      origin,
      secret,
      ledger,
      provider,
      policy: testPolicy,
      ...changes,
    }),
  };
}
it("never dispatches or touches quota when no verified provider is wired, including a forged enable flag", async () => {
  const { ledger, provider } = await fixture();
  const app = createApp({ origin, secret, ledger });
  const response = await app(
    post("/api/css-studio/propose", { ...input, enabled: true }),
  );
  expect(response.status).toBe(503);
  expect(provider.propose).not.toHaveBeenCalled();
  expect(ledger.reserve).not.toHaveBeenCalled();
});
it("requires same-origin JSON/CSRF headers and a valid server-issued cookie before admission", async () => {
  const { app, ledger, cookie } = await fixture();
  expect(
    (
      await app(
        post("/api/css-studio/propose", input, cookie, {
          origin: "https://evil.test",
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await app(
        post("/api/css-studio/propose", input, cookie, { "x-css-studio": "" }),
      )
    ).status,
  ).toBe(403);
  expect(
    (await app(post("/api/css-studio/propose", input, "forged=true"))).status,
  ).toBe(401);
  expect(ledger.reserve).not.toHaveBeenCalled();
  const issued = await app(post("/api/css-studio/session"));
  expect(issued.headers.get("set-cookie")).toMatch(/HttpOnly/);
  const reused = await app(post("/api/css-studio/session", {}, cookie));
  expect(reused.headers.get("set-cookie")).toBeNull();
});
it("reserves server-owned cost before dispatch, validates output and suppresses duplicate or denied admission", async () => {
  const { app, ledger, provider, cookie } = await fixture();
  const response = await app(post("/api/css-studio/propose", input, cookie));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    requestId: id,
    message: "Calm",
  });
  expect(ledger.reserve).toHaveBeenCalledWith(
    expect.objectContaining({ reservedNeurons: 100 }),
  );
  expect(ledger.reserve.mock.invocationCallOrder[0]).toBeLessThan(
    provider.propose.mock.invocationCallOrder[0],
  );
  expect(ledger.settle).toHaveBeenCalledWith(
    expect.objectContaining({ outcome: "complete" }),
  );
  ledger.reserve.mockResolvedValue({
    admitted: false,
    status: 429,
    code: "shared-limit",
    retryAfter: 12,
  });
  expect(
    (await app(post("/api/css-studio/propose", input, cookie))).status,
  ).toBe(429);
  expect(provider.propose).toHaveBeenCalledOnce();
});
it("retains conservative accounting on timeout/unsafe output, refuses unimplemented image/media routes and redacts provider failures", async () => {
  const { app, ledger, provider, cookie } = await fixture();
  expect(
    (
      await app(
        post(
          "/api/css-studio/propose",
          { ...input, operation: "image" },
          cookie,
        ),
      )
    ).status,
  ).toBe(503);
  expect(ledger.reserve).not.toHaveBeenCalled();
  provider.propose.mockResolvedValue({
    proposal: { message: "bad", overrides: { css: "body{}" } },
  });
  expect(
    (await app(post("/api/css-studio/propose", input, cookie))).status,
  ).toBe(502);
  expect(ledger.settle).toHaveBeenLastCalledWith(
    expect.objectContaining({ outcome: "complete" }),
  );
  provider.propose.mockImplementation(() => new Promise(() => {}));
  const timeout = await app(post("/api/css-studio/propose", input, cookie));
  expect(timeout.status).toBe(504);
  expect(ledger.settle).toHaveBeenLastCalledWith(
    expect.objectContaining({ outcome: "uncertain" }),
  );
  expect(await timeout.text()).not.toMatch(/secret|token|prompt|Calm autumn/);
});
it("fails closed on ledger errors and expired cost configuration", async () => {
  const { app, ledger, provider, cookie } = await fixture();
  ledger.reserve.mockRejectedValue(Error("storage failure"));
  expect(
    (await app(post("/api/css-studio/propose", input, cookie))).status,
  ).toBe(503);
  expect(provider.propose).not.toHaveBeenCalled();
  const expired = await fixture({
    policy: { ...testPolicy, verifiedUntil: 0 },
  });
  expect(
    (await expired.app(post("/api/css-studio/propose", input, expired.cookie)))
      .status,
  ).toBe(503);
  expect(expired.ledger.reserve).not.toHaveBeenCalled();
});

it("accepts only the configured backend origin behind a same-origin public proxy, without enabling CORS", async () => {
  const { cookie, ledger, provider } = await fixture();
  const app = createApp({
    origin,
    endpointOrigin: "https://worker.test",
    secret,
    ledger,
    provider,
    policy: testPolicy,
  });
  const request = new Request("https://worker.test/api/css-studio/propose", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-css-studio": "1",
      cookie,
    },
    body: JSON.stringify(input),
  });
  const response = await app(request);
  expect(response.status).toBe(200);
  expect(response.headers.has("access-control-allow-origin")).toBe(false);
  expect(
    (await app(post("/api/css-studio/propose", input, cookie))).status,
  ).toBe(403);
});

it("does not dispatch an expired reservation, and retains a charge on confirmed provider exhaustion", async () => {
  const { app, ledger, provider, cookie } = await fixture();
  ledger.reserve.mockResolvedValue({
    admitted: true,
    deadline: Date.now() - 1,
  });
  expect(
    (await app(post("/api/css-studio/propose", input, cookie))).status,
  ).toBe(503);
  expect(provider.propose).not.toHaveBeenCalled();
  expect(ledger.settle).toHaveBeenLastCalledWith(
    expect.objectContaining({ outcome: "complete", measuredNeurons: 0 }),
  );
  const { ProviderLimitError } = await import("./http");
  ledger.reserve.mockResolvedValue({
    admitted: true,
    deadline: Date.now() + 30000,
  });
  provider.propose.mockRejectedValue(
    new ProviderLimitError("private provider credentials"),
  );
  const response = await app(post("/api/css-studio/propose", input, cookie));
  expect(response.status).toBe(429);
  expect(await response.text()).not.toContain("credentials");
  expect(ledger.settle).toHaveBeenLastCalledWith(
    expect.objectContaining({ outcome: "provider-exhausted" }),
  );
});

it("advertises only theme support when no inspected image provider is configured", async () => {
  const { app, cookie } = await fixture();
  const response = await app(
    new Request(origin + "/api/css-studio/status", { headers: { cookie } }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    available: true,
    operations: ["theme"],
  });
});

it("exposes media operations only with an inspected image adapter and bounded image plan", async () => {
  const policy = {
    ...testPolicy,
    imageNeurons: 1000,
    imageWidth: 1024,
    imageHeight: 1024,
    imageSteps: 4,
  };
  for (const inspected of [false, true]) {
    const provider = {
      propose: vi.fn(),
      image: {
        propose: vi.fn(),
        ...(inspected ? { inspectImage: vi.fn() } : {}),
      },
    };
    const { app, cookie } = await fixture({ provider, policy });
    const response = await app(
      new Request(origin + "/api/css-studio/status", { headers: { cookie } }),
    );
    expect((await response.json()).operations).toEqual(
      inspected ? ["theme", "image", "refine"] : ["theme"],
    );
  }
});

it("exposes monthly transform allowance only for an exact server-owned diagnostics opt-in", async () => {
  const { app, cookie, ledger, provider } = await fixture({
    diagnostics: true,
  });
  ledger.snapshot.mockResolvedValue({
    available: true,
    imageTransformsRemaining: 5000,
  });
  const status = () =>
    app(
      new Request(origin + "/api/css-studio/status", { headers: { cookie } }),
    );
  expect((await (await status()).json()).imageTransformsRemaining).toBe(5000);
  ledger.snapshot.mockResolvedValue({
    available: true,
    imageTransformsRemaining: 4999,
  });
  expect((await (await status()).json()).imageTransformsRemaining).toBe(4999);
  expect(provider.propose).not.toHaveBeenCalled();
  expect(ledger.reserve).not.toHaveBeenCalled();
});

it.each([undefined, false, "true", 1])(
  "omits monthly diagnostics for option %s, even with a request diagnostics header",
  async (diagnostics) => {
    const { app, cookie, ledger } = await fixture({ diagnostics });
    ledger.snapshot.mockResolvedValue({
      available: true,
      imageTransformsRemaining: 4999,
    });
    const response = await app(
      new Request(origin + "/api/css-studio/status", {
        headers: { cookie, "X-CSS-Studio-Diagnostics": "true" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty(
      "imageTransformsRemaining",
    );
    const query = await app(
      new Request(origin + "/api/css-studio/status?diagnostics=true", {
        headers: { cookie },
      }),
    );
    expect(query.status).toBe(403);
    expect(await query.json()).not.toHaveProperty("imageTransformsRemaining");
  },
);
