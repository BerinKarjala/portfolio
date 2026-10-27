import runtimeArtManifest from './runtime-art-manifest.json';
import { selectWeatherLayers } from './conditions';

// More obstructing or severe effects take priority when observations combine.
const SUN_VARIANTS = [
  ['hail', 'sun-hail'], ['thunderstorm', 'sun-thunderstorm'], ['sleet', 'sun-sleet'],
  ['fog', 'sun-fog'], ['overcast', 'sun-overcast'], ['snow', 'sun-snow'],
  ['scattered-showers', 'sun-scattered-showers'], ['rain', 'sun-rain'],
  ['partly-cloudy', 'sun-partly-cloudy'],
];

// Returning descriptors does not fetch any image; the component renders only
// the active layer descriptors and can choose the PNG fallback if WebP fails.
export function getArtworkAssets(weather, options) {
  const selected = selectWeatherLayers(weather, options);
  const sunVariant = SUN_VARIANTS.find(([condition]) => selected.includes(condition))?.[1] ?? 'sun';
  const layers = selected.map(key => key === 'sun'
    ? { ...runtimeArtManifest.assets[sunVariant], key: 'sun', variant: sunVariant }
    : runtimeArtManifest.assets[key]);
  return { moon: runtimeArtManifest.assets['moon-master'], layers };
}

export { runtimeArtManifest };
