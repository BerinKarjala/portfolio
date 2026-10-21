export const JSON_LIMIT = 96 * 1024;
export const MEDIA_LIMIT = 4 * 1024 * 1024;
export const TRANSFER_LIMIT = MEDIA_LIMIT + JSON_LIMIT + 16384;
export const isMediaReceipt = (value) =>
  typeof value === "string" &&
  value.length <= 2048 &&
  /^media-v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22,2000}$/.test(value);
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    if (code) this.code = code;
  }
}
export async function readBytes(
  request,
  maxBytes = JSON_LIMIT,
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
  return bytes;
}
export async function readJson(
  request,
  maxBytes = JSON_LIMIT,
  timeoutMs = 5000,
) {
  const bytes = await readBytes(request, maxBytes, timeoutMs);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export async function readMultipart(
  request,
  maxBytes = TRANSFER_LIMIT,
  timeoutMs = 5000,
) {
  const type = request.headers.get("content-type") || "";
  if (
    type.length > 200 ||
    !/^multipart\/form-data;\s*boundary=(?:[A-Za-z0-9_'()+,./:=?-]{1,70}|"[A-Za-z0-9_'()+,./:=?-]{1,70}")$/i.test(
      type,
    )
  )
    throw new HttpError(415, "Use a multipart image request.");
  const bytes = await readBytes(request, maxBytes, timeoutMs);
  try {
    return await new Response(bytes, {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new HttpError(400, "Invalid multipart request.");
  }
}
