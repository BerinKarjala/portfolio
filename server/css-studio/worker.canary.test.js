import { expect, it, vi } from "vitest";
import worker from "./worker.js";

it("permits only the private free image-info diagnostic without activating images or touching inference/accounting", async () => {
  const { env, request, ai, calls } = fixture();
  const info = vi.fn(async () => ({
    width: 64,
    height: 64,
    format: "image/png",
  }));
  env.IMAGES = {
    info,
    input: vi.fn(() => {
      throw Error("No transformation allowed");
    }),
  };
  expect(
    (await worker.fetch(request("image-info-probe", {}), env)).status,
  ).toBe(404);
  const response = await worker.fetch(
    request("image-info-probe", {}, { "X-CSS-Studio-Canary": canary }),
    env,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    info: { width: 64, height: 64, format: "image/png" },
    inferencePerformed: false,
    transformationPerformed: false,
    cpuMeasured: false,
  });
  expect(info).toHaveBeenCalledOnce();
  expect(env.IMAGES.input).not.toHaveBeenCalled();
  expect(ai.run).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});
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
it("allows the configured preview origin only with private authentication and ignores forwarded origins", async () => {
  const { env, ai, calls, request } = fixture();
  const preview = "https://deploy-preview-245--berinkarjala.netlify.app";
  env.CANARY_APP_ORIGIN = preview;
  const headers = { Origin: preview, "X-CSS-Studio-Canary": canary };
  const session = await worker.fetch(request("session", {}, headers), env);
  expect(session.status).toBe(200);
  expect(session.headers.get("set-cookie")).toContain("HttpOnly");
  // The original production-origin canary remains compatible.
  expect(
    (
      await worker.fetch(
        request(
          "session",
          {},
          {
            "X-CSS-Studio-Canary": canary,
          },
        ),
        env,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await worker.fetch(
        request(
          "session",
          {},
          {
            Origin: preview,
            "X-Forwarded-Host": new URL(preview).host,
          },
        ),
        env,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await worker.fetch(
        request(
          "session",
          {},
          {
            Origin: "https://unrelated.example",
            "X-CSS-Studio-Canary": canary,
            "X-Forwarded-Host": new URL(preview).host,
            Forwarded: `host=${new URL(preview).host};proto=https`,
          },
        ),
        env,
      )
    ).status,
  ).toBe(403);
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
it.each(["configuration", "private header"])(
  "keeps GPT private and retains its approved whole-context reservation via %s",
  async (selection) => {
    const { env, ai, calls, request } = fixture();
    env.CANARY_MODEL = selection === "configuration" ? "gpt-oss-20b" : "llama";
    const headers = {
      "X-CSS-Studio-Canary": canary,
      ...(selection === "private header"
        ? { "X-CSS-Studio-Canary-Model": "gpt-oss-20b" }
        : {}),
    };
    ai.run.mockResolvedValue(
      Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  message: "Winter proposal",
                  overrides: { accent: "#88bbff" },
                }),
              },
            ],
          },
        ],
      }),
    );
    expect(
      await (
        await worker.fetch(
          request("status", null, {
            "X-CSS-Studio-Canary-Model": "gpt-oss-20b",
          }),
          env,
        )
      ).json(),
    ).toEqual({ available: false });
    const session = await worker.fetch(request("session", {}, headers), env);
    expect(session.status).toBe(200);
    const result = await worker.fetch(
      request(
        "propose",
        {
          id: crypto.randomUUID(),
          operation: "theme",
          prompt: "A winter theme",
          history: [],
          context: {
            family: "seasons",
            id: "winter",
            mode: "dark",
            contrast: true,
          },
        },
        {
          ...headers,
          Cookie: session.headers.get("set-cookie").split(";")[0],
        },
      ),
      env,
    );
    expect(result.status).toBe(200);
    expect((await result.json()).overrides.accent).toBe("#88bbff");
    expect(
      calls.find((item) => item.action === "reserve").value.reservedNeurons,
    ).toBe(4000);
    expect(
      calls.find((item) => item.action === "settle").value.measuredNeurons,
    ).toBeUndefined();
    expect(ai.run.mock.calls[0][0]).toBe("@cf/openai/gpt-oss-20b");
    expect(ai.run.mock.calls[0][1].input).toHaveLength(2);
    expect(ai.run).toHaveBeenCalledOnce();
  },
);
it("rejects an unapproved canary model before identity or inference", async () => {
  const { env, ai, calls, request } = fixture();
  env.CANARY_MODEL = "unapproved-model";
  expect(
    await (
      await worker.fetch(
        request("status", null, {
          "X-CSS-Studio-Canary": canary,
        }),
        env,
      )
    ).json(),
  ).toEqual({ available: false });
  expect(
    (
      await worker.fetch(
        request(
          "session",
          {},
          {
            "X-CSS-Studio-Canary": canary,
          },
        ),
        env,
      )
    ).status,
  ).toBe(503);
  expect(ai.run).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});
it("rejects unapproved private model headers without overriding invalid configuration", async () => {
  const { env, ai, calls, request } = fixture();
  for (const model of ["", "unapproved-model"]) {
    expect(
      (
        await worker.fetch(
          request(
            "session",
            {},
            {
              "X-CSS-Studio-Canary": canary,
              "X-CSS-Studio-Canary-Model": model,
            },
          ),
          env,
        )
      ).status,
    ).toBe(503);
  }
  env.CANARY_MODEL = "unapproved-model";
  expect(
    (
      await worker.fetch(
        request(
          "session",
          {},
          {
            "X-CSS-Studio-Canary": canary,
            "X-CSS-Studio-Canary-Model": "gpt-oss-20b",
          },
        ),
        env,
      )
    ).status,
  ).toBe(503);
  expect(ai.run).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});
