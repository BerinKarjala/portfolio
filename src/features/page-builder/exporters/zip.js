const encoder = new TextEncoder();
const table = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
/** A deterministic, uncompressed UTF-8 ZIP. No directory, timestamps or extra files. */
export function packageZip(files) {
  if (
    Object.keys(files).join(",") !== "index.html,styles.css" ||
    Object.values(files).some((v) => typeof v !== "string")
  )
    throw new Error(
      "A website ZIP must contain exactly index.html and styles.css.",
    );
  const locals = [],
    centrals = [];
  let offset = 0,
    centralSize = 0;
  for (const [name, text] of Object.entries(files)) {
    const filename = encoder.encode(name),
      data = encoder.encode(text),
      crc = crc32(data);
    const local = new Uint8Array(30 + filename.length + data.length),
      v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, filename.length, true);
    local.set(filename, 30);
    local.set(data, 30 + filename.length);
    locals.push(local);
    const central = new Uint8Array(46 + filename.length),
      c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint16(14, 33, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, filename.length, true);
    c.setUint32(42, offset, true);
    central.set(filename, 46);
    centrals.push(central);
    centralSize += central.length;
    offset += local.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, 2, true);
  e.setUint16(10, 2, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + end.length);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
