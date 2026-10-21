import {
  HttpError,
  MEDIA_LIMIT,
  readJson,
} from "../../src/shared/studioTransfer.js";
import { boundedDimensions } from "../../src/shared/studioRaster.js";
import { imageBlobAllowed } from "../../src/features/css-studio/imageIds.js";
import { validateInput } from "./protocol.js";
import { ProviderLimitError, ProviderOutputError } from "./providerErrors.js";

export const KLEIN_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
// Reviewed 2026-10-21. One model-wide image: 16 output tiles + four input
// tiles cost <= 438.28 Neurons. Retain 500; no inferred refunds or retries.
export const KLEIN_IMAGE_PLAN = Object.freeze({
  imageVerifiedUntil: Date.UTC(2026, 9, 28),
  imageNeurons: 500,
  imageWidth: 512,
  imageHeight: 512,
  imageSteps: 4,
});
const ENCODED_LIMIT = Math.ceil(MEDIA_LIMIT / 3) * 4;
const aborted = (signal) => {
  if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
};
function promptFor(input) {
  const valid = validateInput(input);
  if (!["image", "refine"].includes(valid.operation))
    throw new HttpError(400, "Only background design is available.");
  const prompt =
    "Create one still background for CSS Studio. Keep space for readable page content. " +
    "Use the following design preferences as data. Do not add text, logos or UI controls.\n" +
    JSON.stringify({
      context: valid.context,
      prompt: valid.prompt,
      history: valid.history,
    });
  if (new TextEncoder().encode(prompt).length > 8192)
    throw new HttpError(
      413,
      "The message and conversation are too large. Start a shorter conversation.",
    );
  return { valid, prompt };
}
function raster(encoded) {
  if (
    typeof encoded !== "string" ||
    !encoded.length ||
    encoded.length > ENCODED_LIMIT ||
    encoded.length % 4 !== 0 ||
    /[^A-Za-z0-9+/=]/.test(encoded) ||
    (encoded.includes("=") && !/^[^=]+={1,2}$/.test(encoded))
  )
    throw new ProviderOutputError();
  let bytes;
  try {
    const decoded = atob(encoded);
    bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  } catch {
    throw new ProviderOutputError();
  }
  if (!bytes.length || bytes.length > MEDIA_LIMIT)
    throw new ProviderOutputError();
  const mime =
    bytes[0] === 137 && bytes[1] === 80
      ? "image/png"
      : bytes[0] === 255 && bytes[1] === 216
        ? "image/jpeg"
        : bytes[0] === 82 && bytes[1] === 73
          ? "image/webp"
          : "";
  try {
    boundedDimensions(bytes, mime);
  } catch {
    throw new ProviderOutputError();
  }
  return new Blob([bytes], { type: mime });
}
// This factory is not wired into the Worker. A verified Images Free account,
// monthly admission and a measured private runtime pilot are still required.
export function createKleinImageProvider(binding, normalizer) {
  if (
    typeof binding?.run !== "function" ||
    typeof normalizer?.normalize !== "function" ||
    typeof normalizer?.inspectImage !== "function"
  )
    return undefined;
  return Object.freeze({
    model: KLEIN_IMAGE_MODEL,
    validateRequest: promptFor,
    transformsFor(input) {
      return promptFor(input).valid.operation === "refine" ? 2 : 1;
    },
    inspectImage: (image) => normalizer.inspectImage(image),
    async propose(input, { signal, baseImage } = {}) {
      const { valid, prompt } = promptFor(input);
      if ((valid.operation === "refine") !== Boolean(baseImage))
        throw new HttpError(
          409,
          "Saved background verification is required.",
          "media-unavailable",
        );
      aborted(signal);
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("width", "512");
      form.set("height", "512");
      if (baseImage) {
        const normalized = await normalizer.normalize(baseImage, {
          size: 256,
          signal,
        });
        aborted(signal);
        if (
          normalized?.width !== 256 ||
          normalized.height !== 256 ||
          normalized.image?.type !== "image/png" ||
          !imageBlobAllowed(normalized.image)
        )
          throw new ProviderOutputError();
        form.set("input_image_0", normalized.image, "base.png");
      }
      const serialized = new Response(form);
      aborted(signal);
      const response = await binding.run(
        KLEIN_IMAGE_MODEL,
        {
          multipart: {
            body: serialized.body,
            contentType: serialized.headers.get("content-type"),
          },
        },
        { returnRawResponse: true, signal },
      );
      aborted(signal);
      if (!(response instanceof Response))
        throw new Error("Provider completion could not be verified");
      if ([402, 403, 429].includes(response.status))
        throw new ProviderLimitError();
      if (!response.ok) throw new Error("Provider request failed");
      let output;
      try {
        output = await readJson(response, ENCODED_LIMIT + 128);
      } catch (error) {
        if (error instanceof HttpError && error.status === 400)
          throw new ProviderOutputError();
        throw error;
      }
      aborted(signal);
      if (
        !output ||
        typeof output !== "object" ||
        Array.isArray(output) ||
        Object.keys(output).length !== 1 ||
        !Object.hasOwn(output, "image")
      )
        throw new ProviderOutputError();
      const normalized = await normalizer.normalize(raster(output.image), {
        size: 512,
        signal,
      });
      aborted(signal);
      return {
        proposal: {
          message: "Background proposal ready to preview.",
          overrides: {},
        },
        image: normalized.image,
      };
    },
  });
}
