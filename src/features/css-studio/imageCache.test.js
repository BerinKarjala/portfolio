import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createImageCache, memoryImageBackend } from "./imageCache";
const bytes = readFileSync(
  new URL(
    "../../../public/css-studio/images/spring/spring-01-woodland.webp",
    import.meta.url,
  ),
);
const blob = () => new Blob([bytes], { type: "image/webp" });
const context = {
  family: "seasons",
  id: "spring",
  mode: "light",
  contrast: false,
};
let serial = 0;
function cache(backend = memoryImageBackend(), options = {}) {
  return createImageCache(backend, {
    inspect: async () => ({ width: 1600, height: 1067 }),
    makeId: () =>
      `generated-00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`,
    now: () => serial,
    ...options,
  });
}
it("evicts unselected older images while preserving selected profiles and byte/count bounds AC-31", async () => {
  const backend = memoryImageBackend();
  const images = cache(backend, { maxItems: 2, maxBytes: bytes.length * 2 });
  const first = await images.save({ blob: blob(), context });
  const second = await images.save({ blob: blob(), context });
  const third = await images.save(
    { blob: blob(), context },
    { pinnedIds: [first.id] },
  );
  expect((await images.list()).map((i) => i.id)).toEqual([third.id, first.id]);
  expect(await images.get(second.id)).toBeNull();
  expect((await cache(backend).get(first.id)).sha256).toBe(first.sha256);
  await expect(
    images.remove(first.id, { pinnedIds: [first.id] }),
  ).rejects.toThrow(/selected/i);
});
it("does not delete protected images when limits prevent admission and serializes concurrent saves", async () => {
  const images = cache(memoryImageBackend(), {
    maxItems: 2,
    maxBytes: bytes.length * 2,
  });
  const [a, b] = await Promise.all([
    images.save({ blob: blob(), context }),
    images.save({ blob: blob(), context }),
  ]);
  await expect(
    images.save({ blob: blob(), context }, { pinnedIds: [a.id, b.id] }),
  ).rejects.toThrow(/full/i);
  expect((await images.list()).length).toBe(2);
});
it("keeps a bounded in-memory session and downloadable bytes when persistent storage fails", async () => {
  const images = cache(
    {
      async transact() {
        throw Error("denied");
      },
    },
    { maxItems: 2, maxBytes: bytes.length * 2 },
  );
  const saved = await images.save({ blob: blob(), context });
  expect(images.status().persistent).toBe(false);
  expect(images.status().warning).toMatch(/visit/i);
  expect(
    new Uint8Array(await (await images.get(saved.id)).blob.arrayBuffer()),
  ).toEqual(new Uint8Array(bytes));
});
it("rejects invalid media, unsupported contexts and oversized images before saving", async () => {
  const images = cache();
  await expect(
    images.save({
      blob: new Blob(["<svg/>"], { type: "image/svg+xml" }),
      context,
    }),
  ).rejects.toThrow();
  await expect(
    images.save({
      blob: new Blob(["invalid"], { type: "image/webp" }),
      context,
    }),
  ).rejects.toThrow();
  await expect(
    images.save({ blob: blob(), context: { ...context, id: "unknown" } }),
  ).rejects.toThrow();
  await expect(
    images.save({
      blob: new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], {
        type: "image/png",
      }),
      context,
    }),
  ).rejects.toThrow();
  expect(await images.list()).toHaveLength(0);
});
it("recovers from corrupted cached metadata and bytes without trusting stored image URLs", async () => {
  const backend = memoryImageBackend();
  const images = cache(backend);
  const saved = await images.save({ blob: blob(), context });
  await backend.transact((rows) => ({
    puts: [{ ...rows[0], blob: new Blob(["bad"], { type: "image/webp" }) }],
    result: null,
  }));
  expect(await images.get(saved.id)).toBeNull();
  expect(images.status().warning).toMatch(/unavailable|damaged/i);
});

it("rejects oversized pixel headers before invoking a browser decoder", async () => {
  let decodes = 0;
  const images = cache(memoryImageBackend(), {
    inspect: async () => {
      decodes++;
      return { width: 1600, height: 1067 };
    },
  });
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 100000);
  view.setUint32(20, 100000);
  await expect(
    images.save({ blob: new Blob([bytes], { type: "image/png" }), context }),
  ).rejects.toThrow();
  expect(decodes).toBe(0);
});

it("rechecks protected selections when a queued deletion actually executes", async () => {
  const images = cache();
  const saved = await images.save({ blob: blob(), context });
  const pins = [];
  const deleting = images.remove(saved.id, { pinnedIds: () => pins });
  pins.push(saved.id);
  await expect(deleting).rejects.toThrow(/protected/i);
  expect(await images.get(saved.id)).not.toBeNull();
});

it("checks the digest even when corrupted bytes retain their size and dimensions", async () => {
  const backend = memoryImageBackend();
  const images = cache(backend);
  const saved = await images.save({ blob: blob(), context });
  const changed = new Uint8Array(bytes);
  changed[changed.length - 1] ^= 1;
  await backend.transact(() => ({
    puts: [{ ...saved, blob: new Blob([changed], { type: saved.mime }) }],
  }));
  expect(await images.get(saved.id)).toBeNull();
  expect(await images.list()).toHaveLength(0);
});
