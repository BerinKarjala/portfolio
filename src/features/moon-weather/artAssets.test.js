import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getArtworkAssets, runtimeArtManifest } from './artAssets';

describe('selective moon and weather artwork', () => {
  it('always selects the shared moon and only the currently applicable effects', () => {
    const unavailable = getArtworkAssets(null);
    expect(unavailable.moon.key).toBe('moon-master');
    expect(unavailable.layers).toEqual([]);
    const storm = getArtworkAssets({ code: 95, rainMm: 0.4, intervalSeconds: 900, windSpeedKmh: 40 });
    expect(storm.layers.map(layer => layer.key)).toEqual(['thunderstorm', 'rain', 'wind', 'lightning']);
    expect(storm.layers.map(layer => layer.key)).not.toContain('snow');
  });

  it('offers small and large WebP sources and an independently decodable PNG fallback', () => {
    const { moon, layers } = getArtworkAssets({ code: 2, daytime: true });
    for (const asset of [moon, ...layers]) {
      expect(asset.small.url).toMatch(/-384-[a-f0-9]{12}\.webp$/);
      expect(asset.large.url).toMatch(/-768-[a-f0-9]{12}\.webp$/);
      expect(asset.fallback.url).toMatch(/-256-[a-f0-9]{12}\.png$/);
    }
  });

  it('keeps a complete integrity-checked inventory with smaller runtime transfers', () => {
    expect(Object.keys(runtimeArtManifest.assets)).toHaveLength(13);
    let smallTotal = 0;
    for (const asset of Object.values(runtimeArtManifest.assets)) {
      for (const variant of [asset.small, asset.large, asset.fallback]) {
        const data = readFileSync(resolve(process.cwd(), 'public', variant.url.slice(1)));
        expect(data.length).toBe(variant.bytes);
        expect(createHash('sha256').update(data).digest('hex')).toBe(variant.sha256);
      }
      smallTotal += asset.small.bytes;
    }
    expect(smallTotal).toBeLessThan(runtimeArtManifest.sourceTotalBytes / 4);
    expect(smallTotal).toBeLessThan(1_000_000);
  });
});
