import { UUID } from "./quota.js";
export const BODY_LIMIT = 96 * 1024;
export const PRESETS = Object.freeze({
  seasons: ["spring", "summer", "fall", "winter"],
  holidays: [
    "new-year",
    "lunar-new-year",
    "nowruz",
    "holi",
    "easter",
    "eid-al-fitr",
    "eid-al-adha",
    "vesak",
    "midsummer",
    "tanabata",
    "diwali",
    "dia-de-muertos",
    "mid-autumn",
    "halloween",
    "hanukkah",
    "christmas",
  ],
});
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const invalid = () => {
  throw new HttpError(400, "Invalid design request.");
};
function keys(value, allowed) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.includes(key))
  );
}
export function validateInput(value) {
  if (
    !keys(value, [
      "id",
      "operation",
      "prompt",
      "context",
      "history",
      "baseImageId",
    ]) ||
    !UUID.test(value.id) ||
    !["theme", "image", "refine"].includes(value.operation) ||
    typeof value.prompt !== "string" ||
    !value.prompt.trim() ||
    value.prompt.length > 4000 ||
    !Array.isArray(value.history) ||
    value.history.length > 10
  )
    invalid();
  const c = value.context;
  if (
    !keys(c, ["family", "id", "mode", "contrast"]) ||
    !Object.hasOwn(PRESETS, c.family) ||
    !PRESETS[c.family].includes(c.id) ||
    !["light", "dark"].includes(c.mode) ||
    typeof c.contrast !== "boolean"
  )
    invalid();
  for (const item of value.history)
    if (
      !keys(item, ["role", "text"]) ||
      !["user", "assistant"].includes(item.role) ||
      typeof item.text !== "string" ||
      item.text.length > 2000
    )
      invalid();
  if (
    value.operation === "refine"
      ? typeof value.baseImageId !== "string" ||
        !/^generated-[0-9a-f-]{36}$/.test(value.baseImageId) ||
        !UUID.test(value.baseImageId.slice(10))
      : value.baseImageId !== undefined
  )
    invalid();
  return {
    id: value.id,
    operation: value.operation,
    prompt: value.prompt.trim(),
    context: { family: c.family, id: c.id, mode: c.mode, contrast: c.contrast },
    history: value.history.map(({ role, text }) => ({ role, text })),
    ...(value.operation === "refine" ? { baseImageId: value.baseImageId } : {}),
  };
}
export function validateOutput(value) {
  if (
    !keys(value, ["message", "overrides"]) ||
    typeof value.message !== "string" ||
    value.message.length > 4000 ||
    !keys(value.overrides, [
      "accent",
      "background",
      "text",
      "font",
      "radius",
    ]) ||
    !Object.keys(value.overrides).length
  )
    throw Error("Invalid designer output");
  for (const [key, entry] of Object.entries(value.overrides)) {
    if (
      ["accent", "background", "text"].includes(key)
        ? typeof entry !== "string" || !/^#[0-9a-f]{6}$/i.test(entry)
        : key === "font"
          ? !["system", "serif", "mono"].includes(entry)
          : !["0px", "8px", "20px"].includes(entry)
    )
      throw Error("Unsupported designer output");
  }
  return { message: value.message, overrides: { ...value.overrides } };
}
export async function readJson(
  request,
  maxBytes = BODY_LIMIT,
  timeoutMs = 5000,
) {
  const declared = request.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/.test(declared) || Number(declared) > maxBytes)
  )
    throw new HttpError(413, "Request too large.");
  if (!request.body) throw new HttpError(400, "Invalid JSON request.");
  const reader = request.body.getReader();
  let size = 0,
    chunks = 0,
    timer;
  const parts = [];
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new HttpError(408, "Request body timed out."));
      void reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes || ++chunks > 2048) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, "Request too large.");
      }
      parts.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export async function fingerprint(input) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(input)),
      ),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
