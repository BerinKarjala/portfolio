import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Miniflare } from "miniflare";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
import { runtimeOptions as options } from "./harness.mjs";
async function authority(mf) {
  const namespace = await mf.getDurableObjectNamespace("QUOTA");
  const stub = namespace.get(namespace.idFromName("css-studio-global-v1"));
  return async (action, value) => {
    const response = await stub.fetch("https://quota.internal/", {
      method: "POST",
      body: JSON.stringify({ action, value }),
    });
    assert.equal(response.status, 200);
    return response.json();
  };
}
const reserve = (n, cost = 1000) => ({
  visitor: uuid(n),
  requestId: uuid(n),
  operation: "theme",
  fingerprint: "a".repeat(64),
  reservedNeurons: cost,
});
test("actual Workers SQLite serializes concurrent admission and survives a complete runtime restart", async () => {
  const path = await mkdtemp(join(tmpdir(), "css-studio-quota-"));
  let mf;
  try {
    mf = new Miniflare(options(path));
    const call = await authority(mf);
    const admitted = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        call("reserve", reserve(i + 1, 4000)),
      ),
    );
    assert.equal(admitted.filter((row) => row.admitted).length, 2);
    for (let i = 0; i < admitted.length; i++)
      if (admitted[i].admitted)
        await call("settle", {
          visitor: uuid(i + 1),
          requestId: uuid(i + 1),
          outcome: "complete",
        });
    const before = await call("snapshot", uuid(1));
    assert.equal(before.sharedRemaining, 0);
    await mf.dispose();
    mf = new Miniflare(options(path));
    const restored = await authority(mf);
    assert.equal((await restored("snapshot", uuid(1))).sharedRemaining, 0);
    assert.equal((await restored("reserve", reserve(99))).code, "shared-limit");
  } finally {
    await mf?.dispose();
    await rm(path, { recursive: true, force: true });
  }
});
test("real Worker HTTP sessions persist through requests, validate tokens and count through the bound authority", async () => {
  const mf = new Miniflare(options(false));
  const post = (path, body, cookie = "") =>
    mf.dispatchFetch("https://studio.test/api/css-studio/" + path, {
      method: "POST",
      headers: {
        Origin: "https://studio.test",
        "X-CSS-Studio": "1",
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
  try {
    const session = await post("session", {});
    assert.equal(session.status, 200);
    const cookie = session.headers.get("set-cookie").split(";")[0];
    const input = {
      id: uuid(1),
      operation: "theme",
      prompt: "Warm holiday palette",
      history: [],
      context: {
        family: "holidays",
        id: "diwali",
        mode: "dark",
        contrast: true,
      },
    };
    const proposal = await post("propose", input, cookie);
    assert.equal(proposal.status, 200);
    assert.equal((await proposal.json()).requestId, input.id);
    assert.equal((await post("propose", input, cookie)).status, 409);
    assert.equal(
      (await post("propose", { ...input, id: uuid(2) }, "forged=true")).status,
      401,
    );
    const status = await mf.dispatchFetch(
      "https://studio.test/api/css-studio/status",
      { headers: { Cookie: cookie } },
    );
    assert.deepEqual((await status.json()).remaining, {
      prompts: 9,
      images: 3,
    });
    const reused = await post("session", {}, cookie);
    assert.equal(reused.headers.get("set-cookie"), null);
  } finally {
    await mf.dispose();
  }
});
test("production entry stays unavailable even with identity, storage and a forged enable binding present", async () => {
  const mf = new Miniflare({
    ...options(false),
    bindings: {
      ...options(false).bindings,
      TEST_DISABLED: "1",
      AI_ENABLED: "true",
    },
  });
  try {
    const response = await mf.dispatchFetch(
      "https://studio.test/api/css-studio/propose",
      {
        method: "POST",
        headers: {
          Origin: "https://studio.test",
          "X-CSS-Studio": "1",
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );
    assert.equal(response.status, 503);
  } finally {
    await mf.dispose();
  }
});
