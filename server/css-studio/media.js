import { boundedDimensions } from "../../src/shared/studioRaster.js";
import {
  HttpError,
  isMediaReceipt,
  MEDIA_LIMIT,
} from "../../src/shared/studioTransfer.js";
import { imageBlobAllowed } from "../../src/features/css-studio/imageIds.js";
import { UUID } from "./quota.js";
import { PRESETS } from "./protocol.js";
const encoder = new TextEncoder(),
  AAD = encoder.encode("css-studio-owned-media-v1"),
  LIFETIME = 7 * 86400000;
const encode = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
const decode = (text) =>
  Uint8Array.from(
    atob(
      text.replaceAll("-", "+").replaceAll("_", "/") +
        "=".repeat((4 - (text.length % 4)) % 4),
    ),
    (c) => c.charCodeAt(0),
  );
const contextValid = (c) =>
  c && Object.hasOwn(PRESETS, c.family) && PRESETS[c.family].includes(c.id);
const unavailable = () =>
  new HttpError(
    409,
    "Saved background verification is unavailable. Generate a new background to refine.",
    "media-unavailable",
  );
const digest = async (bytes) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
async function describe(image) {
  if (!imageBlobAllowed(image) || image.size > MEDIA_LIMIT)
    throw Error("Unsupported image");
  const bytes = new Uint8Array(await image.arrayBuffer()),
    dimensions = boundedDimensions(bytes, image.type);
  return {
    bytes: image.size,
    mime: image.type,
    ...dimensions,
    sha256: await digest(bytes),
  };
}
export function createMediaReceipts(secret, { clock = Date.now } = {}) {
  if (typeof secret !== "string" || !/^[0-9a-f]{64}$/.test(secret))
    throw Error("Media signing configuration unavailable");
  const key = crypto.subtle
    .importKey(
      "raw",
      Uint8Array.from(secret.match(/../g), (v) => parseInt(v, 16)),
      "HKDF",
      false,
      ["deriveKey"],
    )
    .then((material) =>
      crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: AAD,
          info: encoder.encode("receipt-key"),
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      ),
    );
  return {
    async issue({ owner, context, image, inspect }) {
      if (
        !UUID.test(owner) ||
        !contextValid(context) ||
        typeof inspect !== "function"
      )
        throw Error("Unverified provider image");
      const metadata = await describe(image),
        actual = await inspect(image);
      if (
        actual?.width !== metadata.width ||
        actual?.height !== metadata.height
      )
        throw Error("Provider image dimensions mismatch");
      const issued = clock(),
        payload = {
          v: 1,
          owner,
          id: crypto.randomUUID(),
          ...metadata,
          context: { family: context.family, id: context.id },
          issued,
          expires: issued + LIFETIME,
        };
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: AAD },
        await key,
        encoder.encode(JSON.stringify(payload)),
      );
      return {
        receipt: `media-v1.${encode(iv)}.${encode(encrypted)}`,
        metadata: { id: payload.id, ...metadata },
      };
    },
    async verify({ owner, context, image, receipt }) {
      try {
        if (
          !UUID.test(owner) ||
          !contextValid(context) ||
          !isMediaReceipt(receipt)
        )
          throw unavailable();
        const [, iv, body] = receipt.split(".");
        const clear = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: decode(iv), additionalData: AAD },
          await key,
          decode(body),
        );
        const value = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(clear),
        );
        if (
          value.v !== 1 ||
          value.owner !== owner ||
          !UUID.test(value.id) ||
          value.context?.family !== context.family ||
          value.context?.id !== context.id ||
          !Number.isSafeInteger(value.issued) ||
          value.issued > clock() + 60000 ||
          value.expires - value.issued !== LIFETIME ||
          value.expires <= clock()
        )
          throw unavailable();
        const metadata = await describe(image);
        for (const field of ["bytes", "mime", "width", "height", "sha256"])
          if (metadata[field] !== value[field]) throw unavailable();
        return { id: value.id, ...metadata };
      } catch {
        throw unavailable();
      }
    },
  };
}
