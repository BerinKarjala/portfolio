import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import sharp from 'sharp';

const sourceDirectory = resolve('public/assets/moon-weather');
const runtimeDirectory = resolve(sourceDirectory, 'runtime');
const sourceManifests = await Promise.all([
  'docs/landing-page/moon-weather-art/manifest.json',
  'docs/landing-page/moon-weather-art/sun-obstruction-manifest.json',
].map(async path => JSON.parse(await readFile(path, 'utf8'))));
const sourceAssets = sourceManifests.flatMap(manifest => manifest.assets);
const runtimeManifest = { version: 1, sourceTotalBytes: sourceManifests.reduce((sum, manifest) => sum + manifest.total_bytes, 0), assets: {} };
const variants = [
  { key: 'small', size: 384, format: 'webp' },
  { key: 'large', size: 768, format: 'webp' },
  { key: 'fallback', size: 256, format: 'png' },
];

await mkdir(runtimeDirectory, { recursive: true });
for (const source of sourceAssets) {
  const input = await readFile(resolve(sourceDirectory, source.file));
  const hash = createHash('sha256').update(input).digest('hex');
  if (hash !== source.sha256 || input.length !== source.bytes) throw new Error(`Source artwork changed: ${source.file}`);
  const key = basename(source.file, '.png');
  const asset = { key, source: source.file };
  for (const variant of variants) {
    let image = sharp(input).resize({ width: variant.size, height: variant.size, fit: 'inside', withoutEnlargement: true });
    image = variant.format === 'webp'
      ? image.webp({ quality: 88, alphaQuality: 100, effort: 4 })
      : image.png({ compressionLevel: 9, adaptiveFiltering: true });
    const { data, info } = await image.toBuffer({ resolveWithObject: true });
    const checksum = createHash('sha256').update(data).digest('hex');
    const file = `${key}-${variant.size}-${checksum.slice(0, 12)}.${variant.format}`;
    await writeFile(resolve(runtimeDirectory, file), data);
    asset[variant.key] = {
      url: `/assets/moon-weather/runtime/${file}`,
      width: info.width, height: info.height, bytes: data.length,
      sha256: checksum,
    };
  }
  runtimeManifest.assets[key] = asset;
}
await writeFile('src/features/moon-weather/runtime-art-manifest.json', `${JSON.stringify(runtimeManifest, null, 2)}\n`);
const totals = variants.map(({ key }) => `${key}: ${Object.values(runtimeManifest.assets).reduce((sum, asset) => sum + asset[key].bytes, 0)} bytes`);
console.log(`Prepared ${Object.keys(runtimeManifest.assets).length} source assets (${totals.join('; ')}).`);
