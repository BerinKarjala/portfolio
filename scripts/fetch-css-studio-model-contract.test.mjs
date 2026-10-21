import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchModelContract } from "./fetch-css-studio-model-contract.mjs";
const token = "public-test-only-token-never-log";
const schema = {
  input: {
    oneOf: [
      {
        properties: {
          max_output_tokens: {
            type: "integer",
            description: "Output cap including reasoning.",
          },
        },
      },
    ],
  },
  output: { properties: { output: { type: "array" } } },
  definitions: { Message: { type: "object" } },
};
function fixture(result = schema) {
  const writes = [],
    logs = [],
    requests = [];
  return {
    writes,
    logs,
    requests,
    options: {
      token: " \n" + token + "\n ",
      now: () => Date.UTC(2026, 9, 21, 12),
      fetch: async (url, options) => {
        requests.push({ url, options });
        return Response.json({ success: true, result });
      },
      write: async (value) => writes.push(value),
      log: (line) => logs.push(line),
    },
  };
}
test("fetches one fixed public schema with GET and preserves complete definitions", async () => {
  const f = fixture();
  const result = await fetchModelContract(f.options);
  assert.equal(f.requests.length, 1);
  const { url, options } = f.requests[0];
  assert.equal(new URL(url).origin, "https://api.cloudflare.com");
  assert.equal(
    new URL(url).pathname,
    "/client/v4/accounts/d33da711f0acb00005de85f10c11ab0f/ai/models/schema",
  );
  assert.equal(
    new URL(url).searchParams.get("model"),
    "@cf/openai/gpt-oss-20b",
  );
  assert.equal(options.method, "GET");
  assert.equal(options.redirect, "error");
  assert.equal(options.headers.Authorization, "Bearer " + token);
  assert.deepEqual(result.schema, schema);
  assert.deepEqual(f.writes, [result]);
  assert.ok(!f.logs.join("\n").includes(token));
  assert.ok(!f.logs.join("\n").includes("Output cap including reasoning."));
});
test("accepts public input/output schema strings without projecting away their data", async () => {
  const input = JSON.stringify(schema.input),
    output = JSON.stringify(schema.output);
  const f = fixture({ input, output, definitions: schema.definitions });
  assert.equal((await fetchModelContract(f.options)).schema.input, input);
});
test("rejects missing output, a conflicting model or echoed credentials before artifact write", async () => {
  for (const value of [
    { input: schema.input },
    { ...schema, model: "@cf/unexpected/model" },
    { ...schema, input: { description: token } },
  ]) {
    const f = fixture(value);
    await assert.rejects(fetchModelContract(f.options));
    assert.equal(f.writes.length, 0);
    assert.ok(!f.logs.join("\n").includes(token));
  }
});
test("does not request anything when the repository secret is absent", async () => {
  const f = fixture();
  await assert.rejects(
    fetchModelContract({ ...f.options, token: "" }),
    /missing/,
  );
  assert.equal(f.requests.length, 0);
});
test("rejects public schema error envelopes and invalid schema fields", async () => {
  for (const payload of [
    { success: false, result: schema },
    { success: true, result: { input: [], output: schema.output } },
    { success: true, result: { input: schema.input, output: "not JSON" } },
  ]) {
    const f = fixture();
    await assert.rejects(
      fetchModelContract({
        ...f.options,
        fetch: async () => Response.json(payload),
      }),
    );
    assert.equal(f.writes.length, 0);
  }
});
test("wraps transport and artifact errors without exposing their messages", async () => {
  const f = fixture();
  await assert.rejects(
    fetchModelContract({
      ...f.options,
      fetch: async () => {
        throw new Error(token);
      },
    }),
    (error) => !error.message.includes(token),
  );
  assert.equal(f.writes.length, 0);
  await assert.rejects(
    fetchModelContract({
      ...f.options,
      write: async () => {
        throw new Error(token);
      },
    }),
    (error) => !error.message.includes(token),
  );
  assert.ok(!f.logs.join("\n").includes(token));
});
test("bounds actual JSON bytes regardless of Content-Length and redacts upstream failures", async () => {
  for (const response of [
    new Response("x".repeat(2 * 1024 * 1024 + 1), {
      headers: { "Content-Length": "1", "Content-Type": "application/json" },
    }),
    new Response(token, { status: 403 }),
    new Response(token, { headers: { "Content-Type": "application/json" } }),
  ]) {
    const f = fixture();
    await assert.rejects(
      fetchModelContract({ ...f.options, fetch: async () => response }),
      (error) => !error.message.includes(token),
    );
    assert.equal(f.writes.length, 0);
  }
});
