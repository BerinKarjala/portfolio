import { useId, useState } from 'react';
import { getArtworkAssets } from './artAssets';
import { getMoonPresentation } from './lunar';
import './moon-artwork.css';

const LAYER_LABELS = {
  sun: 'sun', 'partly-cloudy': 'clouds', overcast: 'overcast', fog: 'fog',
  thunderstorm: 'thunderstorm', rain: 'rain', 'scattered-showers': 'rain showers',
  snow: 'snow', sleet: 'sleet', hail: 'hail', wind: 'wind', lightning: 'lightning',
};

function WeatherLayer({ asset, reducedData }) {
  const [fallback, setFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const sourceSet = reducedData
    ? `${asset.small.url} ${asset.small.width}w`
    : `${asset.small.url} ${asset.small.width}w, ${asset.large.url} ${asset.large.width}w`;
  return (
    <picture className={`moon-artwork__layer${asset.key === 'sun' ? ' moon-artwork__layer--sun' : ''}`} data-weather-layer={asset.key}>
      {!fallback && <source type="image/webp" srcSet={sourceSet} sizes={reducedData ? '128px' : '(max-width: 600px) 128px, 256px'} />}
      <img src={asset.fallback.url} alt="" loading="lazy" decoding="async" onError={() => fallback ? setFailed(true) : setFallback(true)} />
    </picture>
  );
}

export default function MoonArtwork({ date = new Date(), latitude, weather, reducedData = false }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const presentation = getMoonPresentation(date, latitude);
  const { moon, layers } = getArtworkAssets(weather);
  const [moonSource, setMoonSource] = useState(moon.small.url);
  const phaseLabel = presentation ? `${presentation.name} (approximate)` : 'Moon phase unavailable';
  const label = [phaseLabel, ...layers.map(asset => LAYER_LABELS[asset.key])].join(', ');
  const recoverMoon = () => setMoonSource(current => {
    if (current !== moonSource) return current;
    return current === moon.small.url ? moon.fallback.url : null;
  });
  return (
    <div className="moon-artwork" role="img" aria-label={label}>
      <svg className="moon-artwork__moon" viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <filter id={`moon-soft-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
            <feGaussianBlur stdDeviation=".55" />
          </filter>
          <filter id={`moon-shade-${id}`} filterUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
            <feColorMatrix type="matrix" values=".18 0 0 0 0  0 .18 0 0 0  0 0 .18 0 0  0 0 0 1 0" />
          </filter>
          <mask id={`moon-light-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
            {presentation && <path d={presentation.path} fill="white" filter={`url(#moon-soft-${id})`} />}
          </mask>
        </defs>
        <g data-moon-orientation="" transform={presentation?.flipX ? 'translate(32 0) scale(-1 1)' : undefined}>
          {moonSource && presentation ? <>
            <image href={moonSource} width="32" height="32" filter={`url(#moon-shade-${id})`} onError={recoverMoon} />
            <image href={moonSource} width="32" height="32" mask={`url(#moon-light-${id})`} onError={recoverMoon} />
          </> : <g data-moon-fallback="">
            <circle cx="16" cy="16" r="12" fill="#343a3b" />
            {presentation && <path d={presentation.path} fill="#ece9d9" filter={`url(#moon-soft-${id})`} />}
          </g>}
        </g>
      </svg>
      {layers.map(asset => <WeatherLayer key={asset.key} asset={asset} reducedData={reducedData} />)}
    </div>
  );
}
