export const isGeneratedId = (value) =>
  typeof value === "string" &&
  /^generated-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value,
  );
export const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
export function generatedPath(image) {
  return isGeneratedId(image?.id) && Object.hasOwn(IMAGE_TYPES, image?.mime)
    ? `generated/${image.id}.${IMAGE_TYPES[image.mime]}`
    : null;
}
export function imageBlobAllowed(blob) {
  return (
    Object.prototype.toString.call(blob) === "[object Blob]" &&
    typeof blob.arrayBuffer === "function" &&
    Object.hasOwn(IMAGE_TYPES, blob.type) &&
    blob.size > 0 &&
    blob.size <= 4 * 1024 * 1024
  );
}
