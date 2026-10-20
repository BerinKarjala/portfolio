import { imageBlobAllowed } from "./imageIds";
import { boundedDimensions } from "../../shared/studioRaster.js";
export { boundedDimensions } from "../../shared/studioRaster.js";
export async function inspectImage(blob) {
  if (typeof createImageBitmap === "function") {
    const image = await createImageBitmap(blob);
    try {
      return { width: image.width, height: image.height };
    } finally {
      image.close();
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(Error("Invalid image"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function validateImage(blob, inspect = inspectImage) {
  if (!imageBlobAllowed(blob)) throw Error("Unsupported generated image");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length !== blob.size) throw Error("Invalid image size");
  const expected = boundedDimensions(bytes, blob.type),
    actual = await inspect(blob);
  if (actual.width !== expected.width || actual.height !== expected.height)
    throw Error("Image dimensions do not match");
  const sha256 = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return { ...actual, sha256 };
}
