import { deflateSync } from "node:zlib";
import { expect, it, vi } from "vitest";
import { createApp } from "./http.js";
import { createIdentity } from "./identity.js";
import {
  createCloudflareProvider,
  CLOUDFLARE_THEME_PLAN,
} from "./cloudflareProvider.js";
import { createKleinImageProvider, KLEIN_IMAGE_PLAN } from "./kleinProvider.js";
import { createImageNormalizer } from "./imageNormalizer.js";

// Fully encoded raster; the injected Images boundary remains an explicit mock.
function png(size) {
  function chunk(name, data = Buffer.alloc(0)) {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length);
    out.write(name, 4);
    out.set(data, 8);
    let crc = 0xffffffff;
    for (const b of out.subarray(4, -4)) {
      crc ^= b;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
    return out;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc(size * (size * 4 + 1)))),
    chunk("IEND"),
  ]);
}

it("admits generation/refinement before every external stage and issues owned receipts without an extra transform", async () => {
  const events = [],
    origin = "https://studio.test",
    secret = "ab".repeat(32);
  const images = {
    input() {
      expect(events.at(-1)).toMatch(/^(admit|ai)$/);
      return {
        transform({ width }) {
          return {
            async output() {
              events.push("transform" + width);
              return {
                response: () =>
                  new Response(png(width), {
                    headers: { "content-type": "image/png" },
                  }),
              };
            },
          };
        },
      };
    },
  };
  const ai = {
    run: vi.fn(async () => {
      events.push("ai");
      return Response.json({ image: png(512).toString("base64") });
    }),
  };
  const provider = {
    ...createCloudflareProvider(ai),
    image: createKleinImageProvider(ai, createImageNormalizer(images)),
  };
  const ledger = {
    reserve: vi.fn(async () => {
      events.push("admit");
      return { admitted: true, deadline: Date.now() + 30000 };
    }),
    settle: vi.fn(async () => {
      events.push("settle");
      return { settled: true };
    }),
  };
  const cookie = (await createIdentity(secret).issue()).cookie.split(";")[0];
  const app = createApp({
    origin,
    secret,
    provider,
    ledger,
    policy: { ...CLOUDFLARE_THEME_PLAN, ...KLEIN_IMAGE_PLAN },
  });
  const input = {
    id: crypto.randomUUID(),
    operation: "image",
    prompt: "A quiet winter forest",
    history: [],
    context: { family: "seasons", id: "winter", mode: "dark", contrast: false },
  };
  function post(body) {
    return app(
      new Request(origin + "/api/css-studio/propose", {
        method: "POST",
        headers: {
          origin,
          "x-css-studio": "1",
          cookie,
          ...(body instanceof FormData
            ? {}
            : { "content-type": "application/json" }),
        },
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
    );
  }
  const generated = await post(input);
  expect(generated.status).toBe(200);
  const form = await generated.formData(),
    proposal = JSON.parse(form.get("proposal"));
  expect(proposal.receipt).toMatch(/^media-v1\./);
  expect(events).toEqual(["admit", "ai", "transform512", "settle"]);
  const attachment = new FormData();
  attachment.set(
    "request",
    JSON.stringify({
      ...input,
      id: crypto.randomUUID(),
      operation: "refine",
      baseImageId: "generated-" + input.id,
    }),
  );
  attachment.set("receipt", proposal.receipt);
  attachment.set("image", form.get("image"), "base.png");
  expect((await post(attachment)).status).toBe(200);
  expect(events).toEqual([
    "admit",
    "ai",
    "transform512",
    "settle",
    "admit",
    "transform256",
    "ai",
    "transform512",
    "settle",
  ]);
  expect(
    ledger.reserve.mock.calls.map(([r]) => [
      r.reservedNeurons,
      r.imageTransforms,
    ]),
  ).toEqual([
    [500, 1],
    [500, 2],
  ]);
  expect(ledger.reserve.mock.calls[1][0].fingerprint).not.toBe(
    ledger.reserve.mock.calls[0][0].fingerprint,
  );
  const beforeDenial = [...events];
  ledger.reserve.mockResolvedValueOnce({
    admitted: false,
    status: 429,
    code: "image-transform-limit",
  });
  expect((await post({ ...input, id: crypto.randomUUID() })).status).toBe(429);
  expect(events).toEqual(beforeDenial);
  expect(ai.run).toHaveBeenCalledTimes(2);
});
