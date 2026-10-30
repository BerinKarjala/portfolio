import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { deflateSync } from "node:zlib";
import worker from "./worker.js";

// Exercise the reviewed plans while they were valid without extending their
// production expiry. Timers stay real; only the test clock is fixed.
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.UTC(2026, 9, 27, 12)); });
afterEach(() => vi.useRealTimers());

it("fails closed when the reviewed private canary plan has expired", async () => {
  vi.setSystemTime(Date.UTC(2026, 9, 28));
  const { env, request, ai, calls } = fixture();
  const response = await worker.fetch(request("session", {}, { "X-CSS-Studio-Canary": canary }), env);
  expect(response.status).toBe(503);
  expect(ai.run).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});

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
                imageAvailable: true,
                imageTransformsRemaining: 5000,
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

function privateImageFixture() {
  // Full PNG bytes exercise native-normalizer wiring through a mocked Images
  // boundary; this does not claim live service decoding or account eligibility.
  function crc(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++)
        value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
  }
  function chunk(name, bytes = Buffer.alloc(0)) {
    const result = Buffer.alloc(bytes.length + 12);
    result.writeUInt32BE(bytes.length);
    result.write(name, 4);
    result.set(bytes, 8);
    result.writeUInt32BE(crc(result.subarray(4, -4)), result.length - 4);
    return result;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(512);
  ihdr.writeUInt32BE(512, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.alloc(512 * (512 * 4 + 1)))),
    chunk("IEND"),
  ]);
  const input = vi.fn(),
    transform = vi.fn(),
    output = vi.fn(),
    response = vi.fn();
  input.mockImplementation((stream) => ({
    transform: (options) => {
      transform(options);
      return {
        output: async (options) => {
          output(options);
          expect(
            Buffer.from(await new Response(stream).arrayBuffer()).equals(png),
          ).toBe(true);
          return {
            response: async () => {
              response();
              return new Response(png, {
                headers: { "Content-Type": "image/png" },
              });
            },
          };
        },
      };
    },
  }));
  return {
    png,
    images: { input, info: vi.fn() },
    input,
    transform,
    output,
    response,
  };
}

it("advertises image operations and monthly diagnostics only for the exact private image gate", async () => {
  const { env, request, ai, calls } = fixture(),
    image = privateImageFixture();
  env.IMAGES = image.images;
  const session = await worker.fetch(
    request("session", {}, { "X-CSS-Studio-Canary": canary }),
    env,
  );
  const headers = {
    "X-CSS-Studio-Canary": canary,
    Cookie: session.headers.get("set-cookie").split(";")[0],
  };
  for (const value of [
    undefined,
    "",
    "KLEIN-4B",
    "other-model",
    "klein-4b,other",
  ]) {
    const status = await worker.fetch(
      request("status", null, {
        ...headers,
        ...(value === undefined ? {} : { "X-CSS-Studio-Canary-Image": value }),
      }),
      env,
    );
    const snapshot = await status.json();
    expect(snapshot.operations).toEqual(["theme"]);
    expect(snapshot).not.toHaveProperty("imageTransformsRemaining");
  }
  const rejected = await worker.fetch(
    request(
      "propose",
      {
        id: crypto.randomUUID(),
        operation: "image",
        prompt: "Winter forest",
        history: [],
        context: {
          family: "seasons",
          id: "winter",
          mode: "dark",
          contrast: true,
        },
      },
      headers,
    ),
    env,
  );
  expect(rejected.status).toBe(503);
  expect(calls.some((call) => call.action === "reserve")).toBe(false);
  const enabled = await worker.fetch(
    request("status", null, {
      ...headers,
      "X-CSS-Studio-Canary-Image": "klein-4b",
    }),
    env,
  );
  expect(await enabled.json()).toMatchObject({
    operations: ["theme", "image", "refine"],
    imageTransformsRemaining: 5000,
  });
  expect(ai.run).not.toHaveBeenCalled();
  expect(image.input).not.toHaveBeenCalled();
  expect(image.images.info).not.toHaveBeenCalled();
});

it.each(["llama", "gpt-oss-20b"])(
  "preserves the %s text adapter and reservation when the private image gate is active",
  async (model) => {
    const { env, request, ai, calls } = fixture(),
      image = privateImageFixture();
    env.CANARY_MODEL = model;
    env.IMAGES = image.images;
    if (model === "gpt-oss-20b")
      ai.run.mockResolvedValueOnce(
        Response.json({
          output: [
            {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    message: "Winter",
                    overrides: { accent: "#88bbff" },
                  }),
                },
              ],
            },
          ],
        }),
      );
    const headers = {
      "X-CSS-Studio-Canary": canary,
      "X-CSS-Studio-Canary-Image": "klein-4b",
    };
    const session = await worker.fetch(request("session", {}, headers), env);
    const response = await worker.fetch(
      request(
        "propose",
        {
          id: crypto.randomUUID(),
          operation: "theme",
          prompt: "Winter colors",
          history: [],
          context: {
            family: "seasons",
            id: "winter",
            mode: "dark",
            contrast: true,
          },
        },
        { ...headers, Cookie: session.headers.get("set-cookie").split(";")[0] },
      ),
      env,
    );
    expect(response.status).toBe(200);
    expect(ai.run).toHaveBeenCalledTimes(1);
    expect(ai.run.mock.calls[0][0]).toBe(
      model === "llama"
        ? "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
        : "@cf/openai/gpt-oss-20b",
    );
    expect(calls.find((call) => call.action === "reserve").value).toMatchObject(
      {
        operation: "theme",
        reservedNeurons: model === "llama" ? 1000 : 4000,
        imageTransforms: 0,
      },
    );
    expect(image.input).not.toHaveBeenCalled();
  },
);

it("runs one private Klein image and one native normalization under the existing shared reservation", async () => {
  const { env, request, ai, calls } = fixture(),
    image = privateImageFixture();
  env.IMAGES = image.images;
  ai.run.mockResolvedValueOnce(
    Response.json({ image: image.png.toString("base64") }),
  );
  const session = await worker.fetch(
    request("session", {}, { "X-CSS-Studio-Canary": canary }),
    env,
  );
  const id = crypto.randomUUID();
  const result = await worker.fetch(
    request(
      "propose",
      {
        id,
        operation: "image",
        prompt: "A quiet winter forest",
        history: [],
        context: {
          family: "seasons",
          id: "winter",
          mode: "dark",
          contrast: true,
        },
      },
      {
        "X-CSS-Studio-Canary": canary,
        "X-CSS-Studio-Canary-Image": "klein-4b",
        Cookie: session.headers.get("set-cookie").split(";")[0],
      },
    ),
    env,
  );
  expect(result.status).toBe(200);
  const form = await result.formData(),
    proposal = JSON.parse(form.get("proposal"));
  expect(proposal.requestId).toBe(id);
  expect(proposal.receipt).toMatch(/^media-v1\./);
  expect(form.get("image").type).toBe("image/png");
  expect(
    Buffer.from(await form.get("image").arrayBuffer()).equals(image.png),
  ).toBe(true);
  expect(ai.run).toHaveBeenCalledTimes(1);
  expect(ai.run.mock.calls[0][0]).toBe("@cf/black-forest-labs/flux-2-klein-4b");
  expect(image.input).toHaveBeenCalledTimes(1);
  expect(image.transform).toHaveBeenCalledExactlyOnceWith({
    width: 512,
    height: 512,
    fit: "cover",
  });
  expect(image.output).toHaveBeenCalledExactlyOnceWith({
    format: "image/png",
    anim: false,
  });
  expect(image.response).toHaveBeenCalledTimes(1);
  expect(calls.find((call) => call.action === "reserve").value).toMatchObject({
    operation: "image",
    reservedNeurons: 500,
    imageTransforms: 1,
  });
  expect(calls.find((call) => call.action === "settle").value).toMatchObject({
    outcome: "complete",
  });
  expect(
    calls.find((call) => call.action === "settle").value.measuredNeurons,
  ).toBeUndefined();
});

it("never lets an image header bypass public, secret, approved-model or binding gates", async () => {
  for (const variation of [
    "public",
    "wrong-secret",
    "invalid-configuration",
    "invalid-model-header",
    "no-images",
    "info-only",
  ]) {
    const { env, request, ai, calls } = fixture(),
      image = privateImageFixture();
    env.IMAGES = image.images;
    const headers = {
      "X-CSS-Studio-Canary-Image": "klein-4b",
      ...(variation === "public"
        ? {}
        : {
            "X-CSS-Studio-Canary":
              variation === "wrong-secret" ? "wrong" : canary,
          }),
    };
    if (variation === "invalid-configuration") env.CANARY_MODEL = "unapproved";
    if (variation === "invalid-model-header")
      headers["X-CSS-Studio-Canary-Model"] = "unapproved";
    if (variation === "no-images") delete env.IMAGES;
    if (variation === "info-only") env.IMAGES = { info: image.images.info };
    const session = await worker.fetch(request("session", {}, headers), env);
    if (["no-images", "info-only"].includes(variation)) {
      expect(session.status).toBe(200);
      const cookie = session.headers.get("set-cookie").split(";")[0];
      expect(
        (
          await (
            await worker.fetch(
              request("status", null, { ...headers, Cookie: cookie }),
              env,
            )
          ).json()
        ).operations,
      ).toEqual(["theme"]);
    } else {
      expect(session.status).toBe(503);
      expect(calls).toHaveLength(0);
    }
    expect(ai.run).not.toHaveBeenCalled();
    expect(image.input).not.toHaveBeenCalled();
    expect(image.images.info).not.toHaveBeenCalled();
  }
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
