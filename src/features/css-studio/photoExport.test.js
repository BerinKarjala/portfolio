import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initialPreferences, updateProfile, resolveTheme } from "./theme";
import { themeArchive } from "./photoExport";
const catalog = JSON.parse(
  readFileSync(
    new URL("../../../public/css-studio/catalog.json", import.meta.url),
    "utf8",
  ),
);
function zipEntries(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const entries = {};
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const size = view.getUint32(at + 18, true),
      nameLength = view.getUint16(at + 26, true),
      extra = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(
      bytes.slice(at + 30, at + 30 + nameLength),
    );
    const start = at + 30 + nameLength + extra;
    entries[name] = bytes.slice(start, start + size);
    at = start + size;
  }
  return entries;
}
it("packages exact selected bytes with per-photo license and portable CSS AC-43/47", async () => {
  const p = updateProfile(initialPreferences(), { backgroundId: "spring-01" });
  const image = catalog.images[0];
  const bytes = readFileSync(
    new URL(
      "../../../public/css-studio/" + image.relativePath,
      import.meta.url,
    ),
  );
  const blob = await themeArchive(p, new Set(), catalog.images, async (url) => {
    expect(url).toBe("/css-studio/" + image.relativePath);
    return new Response(bytes, { headers: { "content-type": "image/webp" } });
  });
  const entries = zipEntries(await blob.arrayBuffer());
  expect(entries["css-studio/" + image.relativePath]).toEqual(
    new Uint8Array(bytes),
  );
  expect(JSON.parse(new TextDecoder().decode(entries["CREDITS.json"]))).toEqual(
    image,
  );
  const css = new TextDecoder().decode(entries["styles.css"]);
  for (const [key, value] of Object.entries(resolveTheme(p)))
    if (key !== "--studio-image") expect(css).toContain(`${key}: ${value};`);
  expect(css).toContain("./css-studio/" + image.relativePath);
});
it("rejects a corrupted selected download without packaging unrelated URLs", async () => {
  await expect(
    themeArchive(
      initialPreferences(),
      new Set(),
      catalog.images,
      async () =>
        new Response(new Uint8Array([0]), {
          headers: { "content-type": "image/webp" },
        }),
    ),
  ).rejects.toThrow("integrity");
});
