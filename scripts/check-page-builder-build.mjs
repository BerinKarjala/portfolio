import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const directory = new URL("../dist/assets/", import.meta.url);
const files = readdirSync(directory);
for (const [prefix, rawLimit, gzipLimit] of [
  ["PageBuilderProject-", 600 * 1024, 150 * 1024],
  ["BuilderWorkspace-", 350 * 1024, 110 * 1024],
]) {
  const chunks = files.filter(
    (name) => name.startsWith(prefix) && name.endsWith(".js"),
  );
  assert.equal(chunks.length, 1, `Expected one ${prefix} JavaScript chunk`);
  const bytes = readFileSync(new URL(chunks[0], directory));
  const compressed = gzipSync(bytes).length;
  assert.ok(
    bytes.length <= rawLimit,
    `${prefix} raw size ${bytes.length} exceeds ${rawLimit}`,
  );
  assert.ok(
    compressed <= gzipLimit,
    `${prefix} gzip size ${compressed} exceeds ${gzipLimit}`,
  );
  console.log(
    `${prefix}: ${bytes.length} bytes, ${compressed} gzip; within ${rawLimit}/${gzipLimit} budgets.`,
  );
}
