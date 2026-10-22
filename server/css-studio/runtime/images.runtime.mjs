import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { setTimeout as delay } from "node:timers/promises";
import { Miniflare } from "miniflare";
import { boundedDimensions } from "../../../src/shared/studioRaster.js";

// Complete, CRC-correct raster fixtures. Only the AI response is synthetic:
// Miniflare's native Images binding decodes/re-encodes locally through Sharp.
function png(size, corrupt = false) {
  function chunk(name, data = Buffer.alloc(0)) {
    const bytes = Buffer.alloc(data.length + 12);
    bytes.writeUInt32BE(data.length);
    bytes.write(name, 4);
    bytes.set(data, 8);
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(4, -4)) {
      crc ^= byte;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, bytes.length - 4);
    return bytes;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk(
      "IDAT",
      corrupt
        ? Buffer.from("invalid compressed raster")
        : deflateSync(Buffer.alloc(size * (size * 4 + 1))),
    ),
    chunk("IEND"),
  ]);
}
const origin = "https://studio.test";
const input = (operation = "image") => ({
  id: crypto.randomUUID(),
  operation,
  prompt: "A quiet winter forest",
  history: [],
  context: { family: "seasons", id: "winter", mode: "dark", contrast: false },
  ...(operation === "refine"
    ? { baseImageId: "generated-00000000-0000-4000-8000-000000000001" }
    : {}),
});
function runtime(corrupt = false) {
  let outbound = 0;
  const canonical = png(512, corrupt).toString("base64");
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const last = canonical.indexOf("=") - 1;
  assert.ok(last >= 0, "The runtime raster must exercise unused padding bits");
  // Native decoding must preserve atob compatibility for nonzero unused bits.
  // The resulting full PNG bytes remain exactly the same.
  const encoded =
    canonical.slice(0, last) +
    alphabet[alphabet.indexOf(canonical[last]) | 1] +
    canonical.slice(last + 1);
  assert.notEqual(encoded, canonical);
  assert.ok(Buffer.from(encoded, "base64").equals(png(512, corrupt)));
  const mf = new Miniflare({
    modules: true,
    scriptPath: "server/css-studio/runtime/fixture-images-worker.js",
    modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
    compatibilityDate: "2026-07-01",
    durableObjects: { QUOTA: { className: "QuotaAuthority", useSQLite: true } },
    durableObjectsPersist: false,
    images: { binding: "IMAGES" },
    imagesPersist: false,
    bindings: {
      APP_ORIGIN: origin,
      IDENTITY_SECRET: "ab".repeat(32),
      CANARY_SECRET: "cd".repeat(32),
      FIXTURE_PNG: encoded,
    },
    outboundService: () => {
      outbound++;
      throw Error("Unexpected outbound network request");
    },
  });
  async function post(path, value, cookie = "", extra = {}) {
    const encoded = new Response(
      value instanceof FormData ? value : JSON.stringify(value),
    );
    return mf.dispatchFetch(origin + "/api/css-studio/" + path, {
      method: "POST",
      headers: {
        Origin: origin,
        "X-CSS-Studio": "1",
        Cookie: cookie,
        "Content-Type":
          value instanceof FormData
            ? encoded.headers.get("content-type")
            : "application/json",
        ...extra,
      },
      body: await encoded.arrayBuffer(),
    });
  }
  return {
    mf,
    post,
    outbound: () => outbound,
    async session() {
      const response = await post("session", {});
      assert.equal(response.status, 200);
      return response.headers.get("set-cookie").split(";")[0];
    },
    async stats(cookie) {
      const response = await mf.dispatchFetch(origin + "/__fixture/stats", {
        headers: { Cookie: cookie },
      });
      assert.equal(response.status, 200);
      return response.json();
    },
  };
}
function attachment(request, receipt, image) {
  const form = new FormData();
  form.set("request", JSON.stringify(request));
  form.set("receipt", receipt);
  form.set("image", image, "base.png");
  return form;
}

test("production private metadata probe reaches native local Images.info without inference, transforms or budget changes", async () => {
  const fixture = runtime();
  try {
    const cookie = await fixture.session();
    const before = await fixture.stats(cookie);
    assert.equal(before.infoCalls, 0);
    assert.equal(before.nativeBase64Available, true);
    assert.equal(before.nativeBase64Decodes, 0);
    const gate = {
      "X-Fixture-Production": "1",
      "X-CSS-Studio-Canary": "cd".repeat(32),
    };
    const response = await fixture.post("image-info-probe", {}, cookie, gate);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.has("set-cookie"), false);
    const body = await response.json();
    assert.deepEqual(body, {
      info: { width: 64, height: 64, format: "image/png" },
      elapsedWallMs: body.elapsedWallMs,
      inferencePerformed: false,
      transformationPerformed: false,
      cpuMeasured: false,
    });
    assert.ok(Number.isInteger(body.elapsedWallMs));
    assert.ok(body.elapsedWallMs >= 0 && body.elapsedWallMs <= 5000);
    for (const extra of [
      { "X-Fixture-Production": "1" },
      { ...gate, "X-CSS-Studio-Canary": "ef".repeat(32) },
    ])
      assert.equal(
        (await fixture.post("image-info-probe", {}, cookie, extra)).status,
        404,
      );
    const after = await fixture.stats(cookie);
    assert.equal(after.infoCalls, 1);
    assert.equal(after.nativeBase64Decodes, 0);
    assert.equal(after.aiCalls, 0);
    assert.equal(after.completedDecodes, 0);
    assert.deepEqual(after.transforms, []);
    assert.deepEqual(after.events, []);
    assert.deepEqual(after.reservations, []);
    assert.deepEqual(after.settlements, []);
    assert.equal(after.quota.sharedRemaining, before.quota.sharedRemaining);
    assert.equal(
      after.quota.imageTransformsRemaining,
      before.quota.imageTransformsRemaining,
    );
    assert.deepEqual(after.quota.remaining, before.quota.remaining);
    assert.equal(fixture.outbound(), 0);
  } finally {
    await fixture.mf.dispose();
  }
});

test("actual local Images decode completes generation and owned refinement through Worker HTTP and SQLite", async (t) => {
  const fixture = runtime();
  try {
    const cookie = await fixture.session();
    const started = performance.now();
    const generated = await fixture.post("propose", input(), cookie);
    assert.equal(generated.status, 200);
    const form = await generated.formData();
    const proposal = JSON.parse(form.get("proposal"));
    assert.match(proposal.receipt, /^media-v1\./);
    const file = form.get("image");
    assert.equal(file.type, "image/png");
    const bytes = new Uint8Array(await file.arrayBuffer());
    assert.deepEqual(boundedDimensions(bytes, file.type), {
      width: 512,
      height: 512,
    });
    t.diagnostic(
      `Generation wall time: ${(performance.now() - started).toFixed(1)} ms; CPU not measured.`,
    );
    const original = new Blob([bytes], { type: file.type });
    const before = await fixture.stats(cookie);
    assert.equal(before.inferencePerformed, false);
    assert.deepEqual(before.transforms, [512]);
    assert.equal(before.completedDecodes, 1);
    assert.equal(before.aiCalls, 1);
    assert.equal(before.nativeBase64Available, true);
    assert.equal(before.nativeBase64Decodes, 1);
    assert.deepEqual(before.reservations, [[500, 1]]);
    assert.deepEqual(before.events, [
      "admit",
      "ai",
      "images-input",
      "decode512",
      "settle:complete",
    ]);
    assert.equal(before.quota.sharedRemaining, 7500);
    assert.equal(before.quota.imageTransformsRemaining, 4999);

    assert.equal(
      (await fixture.post("propose", input("refine"), cookie)).status,
      409,
    );
    const other = await fixture.session();
    assert.equal(
      (
        await fixture.post(
          "propose",
          attachment(input("refine"), proposal.receipt, original),
          other,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await fixture.post(
          "propose",
          attachment(
            input("refine"),
            proposal.receipt.slice(0, -1) + "!",
            original,
          ),
          cookie,
        )
      ).status,
      409,
    );
    const denied = await fixture.stats(cookie);
    assert.deepEqual(denied.transforms, before.transforms);
    assert.deepEqual(denied.reservations, before.reservations);
    assert.deepEqual(denied.events, before.events);
    assert.equal(denied.aiCalls, 1);
    assert.equal(denied.nativeBase64Decodes, 1);

    // Exercise the unchanged production entry with local AI/Images available:
    // even the existing private text canary must not select the image adapter.
    assert.equal(
      (
        await fixture.post("propose", input(), cookie, {
          "X-Fixture-Production": "1",
          "X-CSS-Studio-Canary": "cd".repeat(32),
        })
      ).status,
      503,
    );
    assert.equal((await fixture.stats(cookie)).aiCalls, 1);

    // Keep the real authority's burst rule; do not replace its clock or ledger.
    await delay(5050);
    const refinedAt = performance.now();
    const refined = await fixture.post(
      "propose",
      attachment(input("refine"), proposal.receipt, original),
      cookie,
    );
    assert.equal(refined.status, 200);
    const refinedForm = await refined.formData();
    assert.match(
      JSON.parse(refinedForm.get("proposal")).receipt,
      /^media-v1\./,
    );
    assert.deepEqual(
      boundedDimensions(
        new Uint8Array(await refinedForm.get("image").arrayBuffer()),
        "image/png",
      ),
      { width: 512, height: 512 },
    );
    t.diagnostic(
      `Refinement wall time: ${(performance.now() - refinedAt).toFixed(1)} ms; burst wait excluded; CPU not measured.`,
    );
    const after = await fixture.stats(cookie);
    assert.deepEqual(after.transforms, [512, 256, 512]);
    assert.equal(after.completedDecodes, 3);
    assert.equal(after.aiCalls, 2);
    assert.equal(after.nativeBase64Decodes, 2);
    assert.deepEqual(after.references, [
      { width: 256, height: 256, mime: "image/png" },
    ]);
    assert.deepEqual(after.reservations, [
      [500, 1],
      [500, 2],
    ]);
    assert.deepEqual(after.settlements, ["complete", "complete"]);
    assert.deepEqual(after.events, [
      "admit",
      "ai",
      "images-input",
      "decode512",
      "settle:complete",
      "admit",
      "images-input",
      "decode256",
      "ai",
      "images-input",
      "decode512",
      "settle:complete",
    ]);
    assert.equal(after.quota.sharedRemaining, 7000);
    assert.equal(after.quota.imageTransformsRemaining, 4997);
    assert.deepEqual(after.quota.remaining, { prompts: 8, images: 1 });
    assert.equal(fixture.outbound(), 0);
  } finally {
    await fixture.mf.dispose();
  }
});

test("native local Images rejects valid PNG headers with corrupt compressed pixels and issues no receipt", async () => {
  assert.deepEqual(boundedDimensions(png(512, true), "image/png"), {
    width: 512,
    height: 512,
  });
  const fixture = runtime(true);
  try {
    const cookie = await fixture.session();
    const response = await fixture.post("propose", input(), cookie);
    assert.equal(response.status, 504);
    assert.match(response.headers.get("content-type"), /application\/json/);
    const body = await response.json();
    assert.equal(body.receipt, undefined);
    assert.equal(body.image, undefined);
    const stats = await fixture.stats(cookie);
    assert.equal(stats.inferencePerformed, false);
    assert.equal(stats.aiCalls, 1);
    assert.equal(stats.nativeBase64Available, true);
    assert.equal(stats.nativeBase64Decodes, 1);
    assert.deepEqual(stats.transforms, [512]);
    assert.equal(stats.completedDecodes, 0);
    assert.deepEqual(stats.reservations, [[500, 1]]);
    assert.deepEqual(stats.settlements, ["uncertain"]);
    assert.deepEqual(stats.events, [
      "admit",
      "ai",
      "images-input",
      "decode512",
      "settle:uncertain",
    ]);
    assert.equal(stats.quota.available, false);
    assert.equal(stats.quota.sharedRemaining, 7500);
    assert.equal(stats.quota.imageTransformsRemaining, 4999);
    assert.equal(fixture.outbound(), 0);
  } finally {
    await fixture.mf.dispose();
  }
});
