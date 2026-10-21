import { readJson } from "../../src/shared/studioTransfer.js";

export const IMAGE_INFO_PATH = "/api/css-studio/image-info-probe";
const DEADLINE_MS = 5000;
// Precomputed valid 64x64 RGBA PNG, including CRCs and compressed raster bytes.
// Runtime code uses no Node APIs, URL fetch, generated image or user upload.
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAmUlEQVR4nO3QMREAIBDAsBeBCETg3xbIyECH7L3O2uf+bHSA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AHaA7dtcVqPrbY0AAAAAElFTkSuQmCC";
const reply = (status, body) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const failure = (status, category) =>
  reply(status, { error: "Image metadata diagnostic unavailable.", category });
function validOrigin(value) {
  try {
    return (
      typeof value === "string" &&
      value.startsWith("https://") &&
      new URL(value).origin === value
    );
  } catch {
    return false;
  }
}
function unavailable(error) {
  let code;
  try {
    code = error?.code;
  } catch {
    /* Never inspect arbitrary provider error text. */
  }
  return code === 9432
    ? reply(503, {
        error: "Image metadata diagnostic unavailable.",
        category: "images-info-unavailable",
        code: 9432,
      })
    : failure(502, "images-info-failed");
}

/**
 * Cloudflare documents `.info()` calls as free/not billed on all plans:
 * https://developers.cloudflare.com/images/optimization/binding/#infostream
 * https://developers.cloudflare.com/images/pricing/
 * This checks metadata only; it does not transform or establish full decoding.
 * The caller supplies the existing private gate; no signing/quota state changes.
 */
export async function handleImageInfoProbe(
  request,
  { authorized = false, origin, endpointOrigin, images, clock = Date.now } = {},
) {
  if (authorized !== true) return reply(404, { error: "Not found." });
  const url = new URL(request.url);
  if (
    !validOrigin(origin) ||
    !validOrigin(endpointOrigin) ||
    url.origin !== endpointOrigin ||
    url.pathname !== IMAGE_INFO_PATH ||
    url.search ||
    url.hash ||
    request.method !== "POST" ||
    request.headers.get("Origin") !== origin ||
    request.headers.get("X-CSS-Studio") !== "1" ||
    (request.headers.has("Sec-Fetch-Site") &&
      request.headers.get("Sec-Fetch-Site") !== "same-origin")
  )
    return failure(403, "invalid-origin");
  if (
    !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
      request.headers.get("Content-Type") || "",
    ) ||
    (request.headers.has("Content-Encoding") &&
      request.headers.get("Content-Encoding") !== "identity")
  )
    return failure(415, "unsupported-content-type");
  if (request.signal.aborted) return failure(400, "request-aborted");

  const began = clock();
  let active = true,
    timer,
    abort;
  const stopped = new Promise((resolve) => {
    timer = setTimeout(() => {
      active = false;
      resolve(failure(504, "image-info-timeout"));
    }, DEADLINE_MS);
    abort = () => {
      active = false;
      resolve(failure(400, "request-aborted"));
    };
    request.signal.addEventListener("abort", abort, { once: true });
  });
  const operation = (async () => {
    let body;
    try {
      body = await readJson(request, 64, DEADLINE_MS);
    } catch {
      return active ? failure(400, "invalid-request") : undefined;
    }
    if (!active) return;
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length
    )
      return failure(400, "invalid-request");
    const info = images?.info;
    if (typeof info !== "function")
      return failure(503, "images-binding-unavailable");
    const bytes = Uint8Array.from(atob(PNG), (character) =>
      character.charCodeAt(0),
    );
    // Images.info has no AbortSignal. Race the single call; discard late results
    // after timeout/cancellation without claiming upstream cancellation or retry.
    const result = await info.call(
      images,
      new Blob([bytes], { type: "image/png" }).stream(),
    );
    if (!active) return;
    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result) ||
      result.width !== 64 ||
      result.height !== 64 ||
      result.format !== "image/png"
    )
      return failure(502, "invalid-image-info");
    const elapsedWallMs = Math.max(0, Math.floor(clock() - began));
    if (!Number.isFinite(elapsedWallMs) || elapsedWallMs > DEADLINE_MS)
      return failure(504, "image-info-timeout");
    return reply(200, {
      info: { width: 64, height: 64, format: "image/png" },
      elapsedWallMs,
      inferencePerformed: false,
      transformationPerformed: false,
      cpuMeasured: false,
    });
  })().catch((error) => (active ? unavailable(error) : undefined));
  try {
    return await Promise.race([operation, stopped]);
  } finally {
    active = false;
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
  }
}
