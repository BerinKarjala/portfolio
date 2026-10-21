const JPEG_MARKER_LIMIT = 2048;
const JPEG_FILL_LIMIT = 4096;

export function boundedDimensions(bytes, mime) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (
    mime === "image/png" &&
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
    new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR"
  ) {
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (
    mime === "image/webp" &&
    bytes.length >= 30 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    const chunk = new TextDecoder().decode(bytes.slice(12, 16));
    if (chunk === "VP8X" && !(bytes[20] & 2)) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
    } else if (
      chunk === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    ) {
      width = view.getUint16(26, true) & 0x3fff;
      height = view.getUint16(28, true) & 0x3fff;
    }
  } else if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2,
      markers = 0,
      fillBytes = 0;
    // Segment lengths jump over payload bytes. Bound both remaining JS loops;
    // fill bytes share one budget across the entire JPEG header.
    while (offset + 4 <= bytes.length && markers < JPEG_MARKER_LIMIT) {
      markers++;
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) {
        if (fillBytes >= JPEG_FILL_LIMIT)
          throw Error("Unsupported image bytes or dimensions");
        fillBytes++;
        offset++;
      }
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (offset + 2 > bytes.length) break;
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        size >= 7
      ) {
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += size;
    }
  }
  if (width < 64 || height < 64 || width > 2048 || height > 2048)
    throw Error("Unsupported image bytes or dimensions");
  return { width, height };
}
