import runtimeArtManifest from './runtime-art-manifest.json';
import { selectWeatherLayers } from './conditions';

// Returning descriptors does not fetch any image; the component renders only
// the active layer descriptors and can choose the PNG fallback if WebP fails.
export function getArtworkAssets(weather, options) {
  const layers = selectWeatherLayers(weather, options).map(key => runtimeArtManifest.assets[key]);
  return { moon: runtimeArtManifest.assets['moon-master'], layers };
}

export { runtimeArtManifest };
