import {expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = new URL('../../', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));
const packages = Object.entries(lock.packages);
const atLeast = (actual, minimum) => {
  const parts = actual.split('.').map(Number);
  for (const [index, part] of minimum.split('.').map(Number).entries()) {
    if (parts[index] !== part) return parts[index] > part;
  }
  return true;
};
const consumers = () => packages.filter(([name]) => name.endsWith('/miniflare')).map(([name]) => {
  const consumer = createRequire(fileURLToPath(new URL(`${name}/package.json`, root)));
  return {name, sharp: consumer('sharp')};
});

test('every locked Sharp copy excludes GHSA-wq5f-xc86-pv6w', () => {
  const copies = packages.filter(([name]) => name.endsWith('/sharp'));
  expect(copies.length).toBeGreaterThan(0);
  for (const [name, pkg] of copies) {
    expect(atLeast(pkg.version, '0.35.5'), `${name}: ${pkg.version}`).toBe(true);
  }
});

test('each installed Miniflare consumer uses patched Sharp and librsvg binaries', () => {
  const installed = consumers();
  expect(installed.length).toBeGreaterThan(0);
  for (const {name, sharp} of installed) {
    expect(atLeast(sharp.versions.sharp, '0.35.5'), name).toBe(true);
    expect(sharp.versions.rsvg, `${name}: SVG decoder version`).toBeTruthy();
    expect(atLeast(sharp.versions.rsvg, '2.63.2'), `${name}: librsvg ${sharp.versions.rsvg}`).toBe(true);
  }
});

test('patched native SVG decoding still produces the requested raster pixels', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#ff0000"/></svg>');
  for (const {sharp} of consumers()) {
    const {data, info} = await sharp(svg).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    expect(info).toMatchObject({width: 2, height: 2, channels: 4});
    expect([...data]).toEqual(Array(4).fill([255, 0, 0, 255]).flat());
  }
});
