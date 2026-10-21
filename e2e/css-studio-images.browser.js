import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/[^/]*sanity\.io\//, (route) =>
    route.fulfill({ json: { result: [] } }),
  );
  await page.goto("/about");
});

test("actual IndexedDB image bytes survive reload and protect selected images during eviction", async ({
  page,
}) => {
  const saved = await page.evaluate(async () => {
    const { createImageCache } =
      await import("/src/features/css-studio/imageCache.js");
    const cache = createImageCache(undefined, { maxItems: 2 });
    const blob = await (
      await fetch("/css-studio/images/spring/spring-01-woodland.webp")
    ).blob();
    const context = {
      family: "seasons",
      id: "spring",
      mode: "light",
      contrast: false,
    };
    const first = await cache.save({ blob, context });
    const second = await cache.save({ blob, context });
    const third = await cache.save(
      { blob, context },
      { pinnedIds: () => [first.id] },
    );
    const raw = await new Promise((resolve, reject) => {
      const request = indexedDB.open("css-studio-images", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const read = db
          .transaction("images")
          .objectStore("images")
          .get(first.id);
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
        read.transaction.oncomplete = () => db.close();
      };
    });
    return {
      first: first.id,
      second: second.id,
      third: third.id,
      sha256: first.sha256,
      bytes: first.bytes,
      persistent: cache.status().persistent,
      portable:
        raw?.blobData instanceof ArrayBuffer && !Object.hasOwn(raw, "blob"),
      metadataOnly: (await cache.list()).every(
        (row) => !Object.hasOwn(row, "blob") && !Object.hasOwn(row, "blobData"),
      ),
    };
  });
  expect(saved.persistent).toBe(true);
  expect(saved.portable).toBe(true);
  expect(saved.metadataOnly).toBe(true);
  await page.reload();
  const restored = await page.evaluate(async ({ first, second }) => {
    const { createImageCache } =
      await import("/src/features/css-studio/imageCache.js");
    const cache = createImageCache();
    const image = await cache.get(first);
    const url = URL.createObjectURL(image.blob);
    const preview = new Image();
    preview.src = url;
    await preview.decode();
    URL.revokeObjectURL(url);
    return {
      ids: (await cache.list()).map((row) => row.id),
      missing: await cache.get(second),
      sha256: image.sha256,
      bytes: image.blob.size,
      width: preview.naturalWidth,
      persistent: cache.status().persistent,
    };
  }, saved);
  expect(restored).toEqual({
    ids: [saved.third, saved.first],
    missing: null,
    sha256: saved.sha256,
    bytes: saved.bytes,
    width: 1600,
    persistent: true,
  });
});

test("browser decoders validate supported raster formats and corrupt stored bytes recover", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createImageCache, indexedImageBackend } =
      await import("/src/features/css-studio/imageCache.js");
    const backend = indexedImageBackend();
    const cache = createImageCache(backend);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    canvas.getContext("2d").fillRect(0, 0, 128, 96);
    const context = {
      family: "seasons",
      id: "winter",
      mode: "dark",
      contrast: true,
    };
    const formats = [];
    let saved;
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, type));
      saved = await cache.save({ blob, context });
      formats.push([saved.mime, saved.width, saved.height]);
    }
    await backend.transact((rows) => ({
      puts: [
        { ...rows.find((row) => row.id === saved.id), sha256: "0".repeat(64) },
      ],
    }));
    return {
      formats,
      damaged: await cache.get(saved.id),
      warning: cache.status().warning,
      count: (await cache.list()).length,
    };
  });
  expect(result.formats).toEqual(
    ["image/png", "image/jpeg", "image/webp"].map((type) => [type, 128, 96]),
  );
  expect(result.damaged).toBeNull();
  expect(result.warning).toMatch(/damaged/i);
  expect(result.count).toBe(2);
});

test("malformed portable records are pruned without losing valid persistent images", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createImageCache } =
      await import("/src/features/css-studio/imageCache.js");
    const cache = createImageCache();
    const blob = await (
      await fetch("/css-studio/images/spring/spring-01-woodland.webp")
    ).blob();
    const saved = await cache.save({
      blob,
      context: {
        family: "seasons",
        id: "spring",
        mode: "light",
        contrast: false,
      },
    });
    const { blob: image, ...metadata } = saved;
    const malformed = [
      { blobData: new ArrayBuffer(1) },
      {
        blobData: new ArrayBuffer(4 * 1024 * 1024 + 1),
        bytes: 4 * 1024 * 1024 + 1,
      },
      { blobData: await image.arrayBuffer(), mime: "image/svg+xml" },
    ].map((fields) => ({
      ...metadata,
      ...fields,
      id: `generated-${crypto.randomUUID()}`,
    }));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("css-studio-images", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("images", "readwrite");
        for (const row of malformed) tx.objectStore("images").put(row);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
    });
    const rows = await cache.list();
    const fresh = createImageCache();
    return {
      ids: rows.map((row) => row.id),
      expected: saved.id,
      freshIds: (await fresh.list()).map((row) => row.id),
      persistent: cache.status().persistent && fresh.status().persistent,
      warning: cache.status().warning,
      metadataOnly: rows.every(
        (row) => !Object.hasOwn(row, "blob") && !Object.hasOwn(row, "blobData"),
      ),
    };
  });
  expect(result.ids).toEqual([result.expected]);
  expect(result.freshIds).toEqual([result.expected]);
  expect(result.persistent).toBe(true);
  expect(result.warning).toMatch(/damaged|unavailable/);
  expect(result.metadataOnly).toBe(true);
});

test("denied browser storage retains bounded visit-only bytes without localStorage image data", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createImageCache, indexedImageBackend } =
      await import("/src/features/css-studio/imageCache.js");
    const cache = createImageCache(
      indexedImageBackend({
        open() {
          throw new DOMException("Denied", "SecurityError");
        },
      }),
      { maxItems: 1 },
    );
    const blob = await (
      await fetch("/css-studio/images/spring/spring-01-woodland.webp")
    ).blob();
    const context = {
      family: "seasons",
      id: "spring",
      mode: "light",
      contrast: false,
    };
    const first = await cache.save({ blob, context });
    let message;
    try {
      await cache.save({ blob, context }, { pinnedIds: [first.id] });
    } catch (error) {
      message = error.message;
    }
    return {
      ...cache.status(),
      message,
      count: (await cache.list()).length,
      bytes: (await cache.get(first.id)).blob.size,
      original: blob.size,
      local: Object.values(localStorage).some((value) =>
        value.includes(first.id),
      ),
    };
  });
  expect(result.persistent).toBe(false);
  expect(result.warning).toMatch(/visit/);
  expect(result.message).toMatch(/full/);
  expect(result.count).toBe(1);
  expect(result.bytes).toBe(result.original);
  expect(result.local).toBe(false);
});

test("independent cache clients serialize their read-modify-write transactions", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { createImageCache } =
      await import("/src/features/css-studio/imageCache.js");
    const a = createImageCache(undefined, { maxItems: 2 });
    const b = createImageCache(undefined, { maxItems: 2 });
    const blob = await (
      await fetch("/css-studio/images/spring/spring-01-woodland.webp")
    ).blob();
    const context = {
      family: "seasons",
      id: "spring",
      mode: "light",
      contrast: false,
    };
    const first = await a.save({ blob, context });
    const [second, third] = await Promise.all([
      a.save({ blob, context }, { pinnedIds: [first.id] }),
      b.save({ blob, context }, { pinnedIds: [first.id] }),
    ]);
    const ids = (await createImageCache().list()).map((row) => row.id);
    return {
      persistent: a.status().persistent && b.status().persistent,
      count: ids.length,
      first: ids.includes(first.id),
      later: ids.filter((id) => id === second.id || id === third.id).length,
    };
  });
  expect(result).toEqual({ persistent: true, count: 2, first: true, later: 1 });
});
