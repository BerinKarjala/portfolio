import { expect, it, vi } from "vitest";
import worker from "./worker.js";
const origin = "https://berinkarjala.netlify.app";
const backend = "https://css-studio-ai.berin-karjala.workers.dev";
const canary = "cd".repeat(32);
function fixture() {
  const calls = [];
  const ai = {
    run: vi.fn(async () =>
      Response.json({
        response: { message: "Autumn", overrides: { accent: "#aa6633" } },
      }),
    ),
  };
  const stub = {
    fetch: vi.fn(async (_url, options) => {
      const { action, value } = JSON.parse(options.body);
      calls.push({ action, value });
      return Response.json(
        action === "reserve"
          ? { admitted: true, deadline: Date.now() + 30000 }
          : action === "settle"
            ? { settled: true }
            : {
                available: true,
                remaining: { prompts: 10, images: 3 },
                sharedRemaining: 8000,
              },
      );
    }),
  };
  const env = {
    APP_ORIGIN: origin,
    ENDPOINT_ORIGIN: backend,
    IDENTITY_SECRET: "ab".repeat(32),
    CANARY_SECRET: canary,
    AI: ai,
    QUOTA: { idFromName: () => "global", get: () => stub },
  };
  const request = (route, body, headers = {}) =>
    new Request(backend + "/api/css-studio/" + route, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: origin,
        "X-CSS-Studio": "1",
        "Content-Type": "application/json",
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  return { env, ai, calls, request };
}
it("keeps public requests unavailable even with AI, secrets and quota configured", async () => {
  const { env, ai, calls, request } = fixture();
  expect((await worker.fetch(request("status"), env)).status).toBe(200);
  expect(await (await worker.fetch(request("status"), env)).json()).toEqual({
    available: false,
  });
  expect((await worker.fetch(request("session", {}), env)).status).toBe(503);
  expect(
    (
      await worker.fetch(
        request("session", {}, { "X-CSS-Studio-Canary": "wrong" }),
        env,
      )
    ).status,
  ).toBe(503);
  expect(ai.run).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});
it("permits only the private canary, reserves the shared full bound and rejects oversized input before admission", async () => {
  const { env, ai, calls, request } = fixture();
  const session = await worker.fetch(
    request("session", {}, { "X-CSS-Studio-Canary": canary }),
    env,
  );
  expect(session.status).toBe(200);
  const cookie = session.headers.get("set-cookie").split(";")[0];
  const headers = { "X-CSS-Studio-Canary": canary, Cookie: cookie };
  const input = {
    id: crypto.randomUUID(),
    operation: "theme",
    prompt: "Calm autumn",
    history: [],
    context: { family: "seasons", id: "fall", mode: "light", contrast: false },
  };
  const result = await worker.fetch(request("propose", input, headers), env);
  expect(result.status).toBe(200);
  expect((await result.json()).overrides.accent).toBe("#aa6633");
  expect(calls.find((c) => c.action === "reserve").value.reservedNeurons).toBe(
    1000,
  );
  expect(
    calls.find((c) => c.action === "settle").value.measuredNeurons,
  ).toBeUndefined();
  const before = calls.length;
  expect(
    (
      await worker.fetch(
        request(
          "propose",
          {
            ...input,
            id: crypto.randomUUID(),
            history: Array.from({ length: 10 }, () => ({
              role: "user",
              text: "x".repeat(2000),
            })),
          },
          headers,
        ),
        env,
      )
    ).status,
  ).toBe(413);
  expect(calls).toHaveLength(before);
  expect(ai.run).toHaveBeenCalledOnce();
});
