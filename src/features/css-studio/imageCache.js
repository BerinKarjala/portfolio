import { SEASONS, HOLIDAYS } from "./theme";
import { isGeneratedId, imageBlobAllowed } from "./imageIds";
import { inspectImage, validateImage } from "./imageMedia";
export const IMAGE_DB = "css-studio-images";
export const IMAGE_STORE = "images";
export const IMAGE_LIMITS = Object.freeze({
  maxItems: 24,
  maxBytes: 96 * 1024 * 1024,
});
export class CacheLimitError extends Error {}
function contextValid(c) {
  return (
    c &&
    (c.family === "seasons"
      ? Object.hasOwn(SEASONS, c.id)
      : c.family === "holidays" && Object.hasOwn(HOLIDAYS, c.id)) &&
    ["light", "dark"].includes(c.mode) &&
    typeof c.contrast === "boolean"
  );
}
function metadataValid(r) {
  return (
    r?.schemaVersion === 1 &&
    isGeneratedId(r.id) &&
    imageBlobAllowed(r.blob) &&
    r.mime === r.blob.type &&
    r.bytes === r.blob.size &&
    /^[a-f0-9]{64}$/.test(r.sha256) &&
    contextValid(r.context) &&
    Number.isInteger(r.width) &&
    Number.isInteger(r.height) &&
    r.width >= 64 &&
    r.height >= 64 &&
    r.width <= 2048 &&
    r.height <= 2048 &&
    Number.isFinite(r.createdAt) &&
    Number.isFinite(r.lastUsedAt) &&
    (!r.parentId || isGeneratedId(r.parentId))
  );
}
export function imageMetadata(record) {
  const { blob, ...metadata } = record;
  return metadata;
}
function applyPlan(rows, plan) {
  const next = new Map(rows.map((r) => [r.id, r]));
  for (const id of plan.deletes || []) next.delete(id);
  for (const row of plan.puts || []) next.set(row.id, row);
  return [...next.values()];
}
export function memoryImageBackend() {
  let records = [],
    queue = Promise.resolve();
  return {
    transact(operation) {
      const task = queue.then(() => {
        const plan = operation(records);
        records = applyPlan(records, plan);
        return { result: plan.result, records: [...records] };
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
export function indexedImageBackend(factory) {
  let connection;
  function open() {
    if (!connection)
      connection = new Promise((resolve, reject) => {
        try {
          factory = factory || globalThis.indexedDB;
        } catch (error) {
          reject(error);
          return;
        }
        if (!factory) {
          reject(Error("IndexedDB unavailable"));
          return;
        }
        let settled = false;
        const request = factory.open(IMAGE_DB, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(IMAGE_STORE))
            request.result.createObjectStore(IMAGE_STORE, { keyPath: "id" });
        };
        request.onerror = () => {
          settled = true;
          reject(request.error);
        };
        request.onblocked = () => {
          settled = true;
          reject(Error("Image storage blocked"));
        };
        request.onsuccess = () => {
          if (settled) {
            request.result.close();
            return;
          }
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            connection = null;
          };
          resolve(db);
        };
      });
    return connection;
  }
  return {
    async transact(operation) {
      const db = await open();
      return new Promise((resolve, reject) => {
        let result, records, operationError;
        const tx = db.transaction(IMAGE_STORE, "readwrite"),
          store = tx.objectStore(IMAGE_STORE);
        const read = store.getAll();
        read.onsuccess = () => {
          try {
            const plan = operation(read.result);
            records = applyPlan(read.result, plan);
            result = plan.result;
            for (const id of plan.deletes || []) store.delete(id);
            for (const record of plan.puts || []) store.put(record);
          } catch (error) {
            operationError = error;
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve({ result, records });
        tx.onerror = () =>
          reject(operationError || tx.error || Error("Image storage failed"));
        tx.onabort = () =>
          reject(
            operationError || tx.error || Error("Image transaction aborted"),
          );
      });
    },
  };
}
export function createImageCache(
  backend = indexedImageBackend(),
  {
    maxItems = IMAGE_LIMITS.maxItems,
    maxBytes = IMAGE_LIMITS.maxBytes,
    inspect = inspectImage,
    makeId = () => `generated-${crypto.randomUUID()}`,
    now = Date.now,
  } = {},
) {
  let mirror = [],
    queue = Promise.resolve(),
    persistent = true,
    warning = "";
  function run(operation) {
    const work = queue.then(async () => {
      if (persistent) {
        try {
          const done = await backend.transact(operation);
          mirror = done.records;
          return done.result;
        } catch (error) {
          if (error instanceof CacheLimitError) throw error;
          persistent = false;
          warning =
            "Generated images can only be kept for this visit because browser storage is unavailable. Download images before leaving.";
        }
      }
      const plan = operation(mirror);
      mirror = applyPlan(mirror, plan);
      return plan.result;
    });
    queue = work.catch(() => {});
    return work;
  }
  function validRows(rows) {
    const valid = rows.filter(metadataValid);
    if (valid.length !== rows.length)
      warning =
        "A saved generated image is damaged or unavailable. A curated fallback remains available.";
    return valid;
  }
  return {
    status: () => ({ persistent, warning }),
    async save({ blob, context, parentId }, { pinnedIds = [] } = {}) {
      if (
        !imageBlobAllowed(blob) ||
        !contextValid(context) ||
        (parentId && !isGeneratedId(parentId))
      )
        throw Error("Unsupported generated image");
      const { sha256, ...dimensions } = await validateImage(blob, inspect);
      const record = {
        schemaVersion: 1,
        id: makeId(),
        blob,
        mime: blob.type,
        bytes: blob.size,
        ...dimensions,
        sha256,
        context: {
          family: context.family,
          id: context.id,
          mode: context.mode,
          contrast: context.contrast,
        },
        createdAt: now(),
        lastUsedAt: now(),
        ...(parentId ? { parentId } : {}),
      };
      if (!metadataValid(record))
        throw Error("Unsupported image dimensions or metadata");
      return run((rows) => {
        const valid = validRows(rows);
        const pins = new Set(
          typeof pinnedIds === "function" ? pinnedIds() : pinnedIds,
        );
        if (rows.some((r) => r.id === record.id))
          throw new CacheLimitError("Generated image identity collision");
        const retained = [...valid];
        let total = retained.reduce((n, r) => n + r.bytes, 0) + record.bytes;
        const candidates = retained
          .filter((r) => !pins.has(r.id))
          .sort(
            (a, b) => a.lastUsedAt - b.lastUsedAt || a.createdAt - b.createdAt,
          );
        while (retained.length + 1 > maxItems || total > maxBytes) {
          const victim = candidates.shift();
          if (!victim)
            throw new CacheLimitError(
              "Image cache is full. Keep selected backgrounds, or download this proposal before replacing one.",
            );
          retained.splice(retained.indexOf(victim), 1);
          total -= victim.bytes;
        }
        const keep = new Set(retained.map((r) => r.id));
        return {
          deletes: rows.filter((r) => !keep.has(r.id)).map((r) => r.id),
          puts: [record],
          result: record,
        };
      });
    },
    async list() {
      return run((rows) => {
        const valid = validRows(rows);
        const validIds = new Set(valid.map((r) => r.id));
        return {
          deletes: rows.filter((r) => !validIds.has(r.id)).map((r) => r.id),
          result: valid
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(imageMetadata),
        };
      });
    },
    async get(id) {
      if (!isGeneratedId(id)) return null;
      const record = await run((rows) => {
        const valid = validRows(rows);
        const found = valid.find((r) => r.id === id);
        return {
          deletes: rows.filter((r) => !metadataValid(r)).map((r) => r.id),
          puts: found ? [{ ...found, lastUsedAt: now() }] : [],
          result: found || null,
        };
      });
      if (!record) return null;
      try {
        const { sha256, ...dimensions } = await validateImage(
          record.blob,
          inspect,
        );
        if (
          sha256 !== record.sha256 ||
          dimensions.width !== record.width ||
          dimensions.height !== record.height
        )
          throw Error("Damaged image");
        return record;
      } catch {
        warning =
          "A saved generated image is damaged or unavailable. A curated fallback remains available.";
        await run(() => ({ deletes: [id], result: null }));
        return null;
      }
    },
    async remove(id, { pinnedIds = [] } = {}) {
      return run(() => {
        if (
          (typeof pinnedIds === "function" ? pinnedIds() : pinnedIds).includes(
            id,
          )
        )
          throw new CacheLimitError(
            "A selected or protected background cannot be removed. Choose another background first.",
          );
        return { deletes: [id], result: true };
      });
    },
  };
}
