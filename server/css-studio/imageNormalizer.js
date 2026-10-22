import { imageBlobAllowed } from "../../src/features/css-studio/imageIds.js";
import { boundedDimensions } from "../../src/shared/studioRaster.js";
import { MEDIA_LIMIT, readBytes } from "../../src/shared/studioTransfer.js";
import { ImageLimitError, ProviderOutputError } from "./providerErrors.js";

const text = new TextDecoder();
const invalid = () => new ProviderOutputError();

// Check container headers before handing bytes to the trusted full decoder.
// Chunk boundaries matter: compressed image data can contain these same names.
function inspectRaster(bytes, mime) {
  try {
    const dimensions = boundedDimensions(bytes, mime);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (mime === "image/png") {
      let offset = 8,
        count = 0,
        imageData = false,
        ended = false;
      while (offset + 12 <= bytes.length && ++count <= 2048) {
        const length = view.getUint32(offset);
        const name = text.decode(bytes.subarray(offset + 4, offset + 8));
        if (length > bytes.length - offset - 12) throw invalid();
        if (count === 1 && (name !== "IHDR" || length !== 13)) throw invalid();
        if (["acTL", "fcTL", "fdAT"].includes(name)) throw invalid();
        if (name === "IDAT") imageData = true;
        offset += length + 12;
        if (name === "IEND") {
          if (length !== 0 || !imageData || offset !== bytes.length)
            throw invalid();
          ended = true;
          break;
        }
      }
      if (!ended) throw invalid();
    } else if (mime === "image/webp") {
      if (view.getUint32(4, true) + 8 !== bytes.length) throw invalid();
      let offset = 12,
        count = 0;
      while (offset + 8 <= bytes.length && ++count <= 2048) {
        const name = text.decode(bytes.subarray(offset, offset + 4));
        const length = view.getUint32(offset + 4, true);
        if (length > bytes.length - offset - 8) throw invalid();
        if (name === "ANIM" || name === "ANMF") throw invalid();
        offset += 8 + length + (length % 2);
      }
      if (offset !== bytes.length) throw invalid();
    }
    return dimensions;
  } catch {
    throw invalid();
  }
}

// ImagesError exposes a numeric code. Other errors have uncertain accounting.
async function imagesCall(action) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error && error.code === 9422)
      throw new ImageLimitError();
    throw error;
  }
}

function boundedOperation(signal, timeoutMs, action) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  let timer;
  let interrupt;
  const interrupted = new Promise((_, reject) => {
    interrupt = () => reject(controller.signal.reason);
    if (controller.signal.aborted) interrupt();
    else controller.signal.addEventListener("abort", interrupt, { once: true });
    timer = setTimeout(
      () =>
        controller.abort(
          new DOMException("Image normalization timed out", "TimeoutError"),
        ),
      timeoutMs,
    );
  });
  return Promise.race([interrupted, action(controller.signal)]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", interrupt);
  });
}

/** One admitted Images transform; callers own quota reservation and accounting. */
export function createImageNormalizer(binding, { timeoutMs = 10000 } = {}) {
  if (typeof binding?.input !== "function") return undefined;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 18000)
    throw new TypeError("Invalid image normalization timeout");
  const inspected = new WeakMap();
  return Object.freeze({
    async normalize(image, { size = 512, signal } = {}) {
      return boundedOperation(signal, timeoutMs, async (activeSignal) => {
        activeSignal.throwIfAborted();
        if (![256, 512].includes(size) || !imageBlobAllowed(image))
          throw invalid();
        const bytes = new Uint8Array(await image.arrayBuffer());
        activeSignal.throwIfAborted();
        if (bytes.length !== image.size || bytes.length > MEDIA_LIMIT)
          throw invalid();
        inspectRaster(bytes, image.type);
        // Stream the checked, owned snapshot; no URL fetch or secondary transform.
        const source = new Blob([bytes], { type: image.type });
        activeSignal.throwIfAborted();
        const transformed = await imagesCall(() =>
          binding
            .input(source.stream())
            .transform({ width: size, height: size, fit: "cover" })
            .output({ format: "image/png", anim: false }),
        );
        activeSignal.throwIfAborted();
        const response = await imagesCall(() => transformed.response());
        activeSignal.throwIfAborted();
        if (!(response instanceof Response) || !response.ok)
          throw new Error("Image normalization response unavailable");
        if (
          response.headers
            .get("content-type")
            ?.split(";", 1)[0]
            .trim()
            .toLowerCase() !== "image/png"
        )
          throw invalid();
        const output = await readBytes(
          response,
          MEDIA_LIMIT,
          Math.min(timeoutMs, 5000),
        );
        activeSignal.throwIfAborted();
        const dimensions = inspectRaster(output, "image/png");
        if (dimensions.width !== size || dimensions.height !== size)
          throw invalid();
        const normalized = new Blob([output], { type: "image/png" });
        inspected.set(normalized, Object.freeze(dimensions));
        return Object.freeze({ image: normalized, ...dimensions });
      });
    },
    async inspectImage(image) {
      const dimensions = inspected.get(image);
      if (!dimensions) throw invalid();
      return { ...dimensions };
    },
  });
}
