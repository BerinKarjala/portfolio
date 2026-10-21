import assert from "node:assert/strict";
import test from "node:test";
import {
  checkImageContract,
  ImageContractError,
} from "./check-css-studio-image-contract.mjs";
const token = "fixture-cloudflare-api-token";
const model = "@cf/black-forest-labs/flux-2-klein-4b";
const now = () => Date.UTC(2026, 9, 21, 12);
const publicSchema = {
  model,
  input: {
    type: "object",
    contentType: "multipart/form-data",
    properties: {
      prompt: { type: "string", description: "A public model prompt field." },
      width: { type: "integer", minimum: 256, maximum: 1920 },
      input_image_0: {
        type: "string",
        format: "binary",
        examples: ["public-schema-example"],
      },
    },
  },
  output: { type: "string", format: "binary", contentType: "image/jpeg" },
};
const settings = {
  bindings: [
    { name: "AI", type: "ai" },
    {
      name: "QUOTA",
      type: "durable_object_namespace",
      class_name: "QuotaAuthority",
      namespace_id: "private-namespace-id",
    },
    {
      name: "IDENTITY_SECRET",
      type: "secret_text",
      text: "private-identity-value",
    },
    {
      name: "CANARY_SECRET",
      type: "secret_text",
      text: "private-canary-value",
    },
    {
      name: "IMAGES",
      type: "images",
      unexpected_private_value: "private-image-config",
    },
  ],
};
function fixture({
  schema = publicSchema,
  worker = settings,
  failAt,
  oversized = false,
} = {}) {
  const requests = [],
    artifacts = [],
    logs = [];
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://api.cloudflare.com");
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    assert.equal(options.body, undefined);
    if (requests.length === failAt)
      return new Response("private Cloudflare error details", { status: 403 });
    if (parsed.pathname.endsWith("/ai/models/schema")) {
      assert.equal(parsed.searchParams.get("model"), model);
      if (oversized) return new Response("x".repeat(2 * 1024 * 1024 + 1));
      return Response.json({ success: true, result: schema });
    }
    assert.equal(
      parsed.pathname,
      "/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f/workers/scripts/css-studio-ai/settings",
    );
    assert.equal(parsed.search, "");
    return Response.json({ success: true, result: worker });
  };
  return {
    fetch,
    write: async (value) => {
      artifacts.push(value);
    },
    log: (line) => logs.push(line),
    requests,
    artifacts,
    logs,
  };
}
test("makes two fixed metadata GETs and retains the complete public schema with only safe binding flags", async () => {
  const f = fixture();
  const artifact = await checkImageContract({ token, now, ...f });
  assert.equal(f.requests.length, 2);
  assert.deepEqual(artifact.schema, publicSchema);
  assert.equal(artifact.model, model);
  assert.equal(artifact.inferencePerformed, false);
  assert.equal(artifact.bindingChangesPerformed, false);
  assert.equal(artifact.worker.name, "css-studio-ai");
  assert.deepEqual(artifact.worker.bindings.AI, {
    name: "AI",
    expectedType: "ai",
    present: true,
    available: true,
  });
  assert.equal(artifact.worker.bindings.QUOTA.available, true);
  assert.equal(artifact.worker.bindings.IMAGES.available, true);
  assert.equal(artifact.worker.anyImagesBinding, true);
  assert.deepEqual(f.artifacts, [artifact]);
  const retained = JSON.stringify({ artifact, logs: f.logs });
  assert.ok(retained.includes("public-schema-example"));
  assert.doesNotMatch(
    retained,
    /private-namespace-id|private-identity-value|private-canary-value|private-image-config|IDENTITY_SECRET|CANARY_SECRET/,
  );
  assert.ok(!retained.includes(token));
});
test("records absent image support accurately without treating schema availability as inference readiness", async () => {
  const f = fixture({
    worker: {
      bindings: [
        { name: "AI", type: "plain_text", text: "private-configuration" },
      ],
    },
  });
  const result = await checkImageContract({ token, now, ...f });
  assert.deepEqual(result.worker.bindings.AI, {
    name: "AI",
    expectedType: "ai",
    present: true,
    available: false,
  });
  assert.equal(result.worker.bindings.QUOTA.available, false);
  assert.equal(result.worker.bindings.IMAGES.available, false);
  assert.equal(result.worker.anyImagesBinding, false);
  assert.equal(result.liveImageReady, false);
});
test("accepts complete documented schema JSON strings without rewriting their contents", async () => {
  const schema = {
    input: JSON.stringify(publicSchema.input),
    output: JSON.stringify(publicSchema.output),
  };
  const f = fixture({ schema });
  assert.deepEqual(
    (await checkImageContract({ token, now, ...f })).schema,
    schema,
  );
});
test("never retries HTTP failures and does not log or artifact upstream response bodies", async () => {
  for (const failAt of [1, 2]) {
    const f = fixture({ failAt });
    await assert.rejects(
      checkImageContract({ token, now, ...f }),
      (error) =>
        error instanceof ImageContractError &&
        /HTTP 403/.test(error.message) &&
        !/private/.test(error.message),
    );
    assert.equal(f.requests.length, failAt);
    assert.equal(f.artifacts.length, 0);
    assert.doesNotMatch(JSON.stringify(f.logs), /private Cloudflare error/);
  }
});
test("stops on oversized, malformed or wrong-model schemas without reading additional configuration", async () => {
  const variants = [
    { oversized: true },
    { schema: { input: "invalid JSON", output: publicSchema.output } },
    { schema: { ...publicSchema, model: "@cf/other/model" } },
    { schema: { unknown: "value" } },
  ];
  for (const options of variants) {
    const f = fixture(options);
    await assert.rejects(
      checkImageContract({ token, now, ...f }),
      ImageContractError,
    );
    assert.equal(f.requests.length, 1);
    assert.equal(f.artifacts.length, 0);
  }
});
test("rejects an echoed credential in the public contract before publishing an artifact", async () => {
  const f = fixture({ schema: { ...publicSchema, description: token } });
  await assert.rejects(checkImageContract({ token, now, ...f }), /credential/i);
  assert.equal(f.artifacts.length, 0);
  assert.ok(!JSON.stringify(f.logs).includes(token));
});
test("rejects malformed credentials before network access and reports network/artifact failures safely", async () => {
  const f = fixture();
  for (const credential of [undefined, "", "contains whitespace"]) {
    await assert.rejects(
      checkImageContract({ token: credential, now, ...f }),
      ImageContractError,
    );
  }
  assert.equal(f.requests.length, 0);
  await assert.rejects(
    checkImageContract({
      token,
      now,
      fetch: async () => {
        throw Error("private network detail");
      },
      write: f.write,
      log: f.log,
    }),
    (error) =>
      error instanceof ImageContractError &&
      !error.message.includes("private network detail"),
  );
  await assert.rejects(
    checkImageContract({
      token,
      now,
      ...f,
      write: async () => {
        throw Error("private filesystem detail");
      },
    }),
    (error) =>
      error instanceof ImageContractError &&
      /artifact/.test(error.message) &&
      !error.message.includes("private filesystem detail"),
  );
});
