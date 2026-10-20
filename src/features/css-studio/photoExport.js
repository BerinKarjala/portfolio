import { generatedPath, imageBlobAllowed } from "./imageIds";
import { crc32 } from "../page-builder/exporters/zip";
import { selectedBackground, backgroundUrl } from "./backgrounds";
import { exportCss } from "./theme";
const encoder = new TextEncoder();
// Binary-safe UTF-8 ZIP, using the existing compiler's CRC helper without changing its strict two-file export contract.
export function assetZip(files) {
  const locals = [],
    centrals = [];
  let offset = 0,
    size = 0;
  for (const [path, value] of Object.entries(files)) {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(path) ||
      path.split("/").includes("..") ||
      path.startsWith("/")
    )
      throw Error("Invalid archive path");
    const name = encoder.encode(path),
      data = typeof value === "string" ? encoder.encode(value) : value,
      crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length),
      v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length),
      c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint16(14, 33, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    size += central.length;
    offset += local.length;
  }
  const end = new Uint8Array(22),
    v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, locals.length, true);
  v.setUint16(10, locals.length, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, end], { type: "application/zip" });
}
export async function themeArchive(
  p,
  failed,
  catalog,
  fetchImage = fetch,
  { generatedImages = {}, getGeneratedImage } = {},
) {
  const selected = selectedBackground(p, failed, generatedImages);
  const files = {
    "styles.css": exportCss(p, {
      assetBase: "./css-studio/",
      failed,
      generatedImages,
    }),
    "README.txt":
      "Use styles.css variables in your stylesheet. Preserve the css-studio folder beside styles.css. Photo licenses are separate from application code; retain CREDITS.json and its license/source/change notices. System fonts require no external dependencies.",
  };
  if (selected?.kind === "generated") {
    const image = await getGeneratedImage?.(selected.id);
    if (
      !image ||
      image.id !== selected.id ||
      !imageBlobAllowed(image.blob) ||
      !generatedPath(image)
    )
      throw Error("Generated image unavailable");
    const bytes = new Uint8Array(await image.blob.arrayBuffer());
    const digest = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    if (digest !== image.sha256 || image.mime !== selected.mime)
      throw Error("Generated image integrity check failed");
    files["css-studio/" + generatedPath(image)] = bytes;
    files["GENERATED_IMAGE.json"] = JSON.stringify(
      {
        id: image.id,
        mime: image.mime,
        width: image.width,
        height: image.height,
        bytes: bytes.length,
        sha256: digest,
        createdAt: image.createdAt,
        context: image.context,
        ...(image.parentId ? { parentId: image.parentId } : {}),
        notice: "Generated background. No curated-photo license is claimed.",
      },
      null,
      2,
    );
    files["README.txt"] =
      "Use styles.css variables in your stylesheet. Preserve the css-studio folder beside styles.css. Retain GENERATED_IMAGE.json. This generated background is separate from the curated photo catalog. System fonts require no external dependencies.";
  } else if (selected) {
    const metadata = catalog.find((i) => i.id === selected.id);
    if (!metadata?.attribution || !metadata.licenseUrl)
      throw Error("Missing credits");
    const response = await fetchImage(backgroundUrl(selected));
    if (!response.ok) throw Error("Image unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (
      bytes.length > 4 * 1024 * 1024 ||
      response.headers.get("content-type")?.split(";")[0] !== "image/webp"
    )
      throw Error("Invalid image");
    const digest = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    if (digest !== metadata.sha256) throw Error("Photo integrity check failed");
    files["css-studio/" + selected.relativePath] = bytes;
    files["CREDITS.json"] = JSON.stringify(metadata, null, 2);
  }
  return assetZip(files);
}
