import { useState } from 'react';
import MoonArtwork from './MoonArtwork';
import { nameMoonPhase } from './lunar';
import './moon-artwork-review.css';

const EPOCH = Date.UTC(2000, 0, 6, 18, 14);
const CYCLE_MS = 29.530588853 * 86400000;
const BACKGROUNDS = { forest: '#03361c', light: '#f5f2e8', dark: '#101318', contrast: '#000000' };
const WEATHER = [
  ['none', 'Weather unavailable'], ['0', 'Clear'], ['1', 'Mainly clear'], ['2', 'Partly cloudy'],
  ['3', 'Overcast'], ['45', 'Fog'], ['51', 'Drizzle'], ['61', 'Rain'],
  ['80', 'Rain showers'], ['71', 'Snow'], ['sleet', 'Sleet (ice pellets)'],
  ['95', 'Thunderstorm'], ['96', 'Thunderstorm and hail'],
];

export default function MoonArtworkReview() {
  const [phase, setPhase] = useState(0.25);
  const [code, setCode] = useState('none');
  const [daytime, setDaytime] = useState(true);
  const [southern, setSouthern] = useState(false);
  const [rain, setRain] = useState(false);
  const [wind, setWind] = useState(false);
  const [reducedData, setReducedData] = useState(false);
  const [background, setBackground] = useState('forest');
  const date = new Date(EPOCH + phase * CYCLE_MS);
  const weather = code === 'none' ? null : {
    code: code === 'sleet' ? null : Number(code), precipitationType: code === 'sleet' ? 'ice-pellets' : undefined,
    daytime, rainMm: rain ? 0.4 : 0, intervalSeconds: 900, windSpeedKmh: wind ? 40 : 0,
  };
  const canAddRain = ['71', '95', '96'].includes(code);
  return (
    <main className="moon-review">
      <h1>Moon and weather artwork</h1>
      <p>Illustrated samples for the redesigned moon; these are not live weather readings.</p>
      <div className="moon-review__controls">
        <label htmlFor="moon-review-phase">Lunar phase: {nameMoonPhase(phase)} (approximate)</label>
        <input id="moon-review-phase" type="range" min="0" max="1" step="0.005" value={phase} onChange={event => setPhase(Number(event.target.value))} />
        <label htmlFor="moon-review-weather">Weather sample</label>
        <select id="moon-review-weather" value={code} onChange={event => { setCode(event.target.value); setRain(false); }}>
          {WEATHER.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label htmlFor="moon-review-background">Preview background</label>
        <select id="moon-review-background" value={background} onChange={event => setBackground(event.target.value)}>
          <option value="forest">Forest green</option><option value="light">Light</option>
          <option value="dark">Dark</option><option value="contrast">High contrast</option>
        </select>
        <label><input type="checkbox" checked={daytime} onChange={event => setDaytime(event.target.checked)} /> Daytime</label>
        <label><input type="checkbox" checked={southern} onChange={event => setSouthern(event.target.checked)} /> Southern Hemisphere</label>
        <label><input type="checkbox" checked={rain} disabled={!canAddRain} onChange={event => setRain(event.target.checked)} /> Add recent rain</label>
        <label><input type="checkbox" checked={wind} disabled={code === 'none'} onChange={event => setWind(event.target.checked)} /> Add wind</label>
        <label><input type="checkbox" checked={reducedData} onChange={event => setReducedData(event.target.checked)} /> Reduced data</label>
      </div>
      <div className="moon-review__examples">
        <figure role="group" aria-label="Phone-size artwork">
          <div className="moon-review__scene moon-review__scene--phone" style={{ backgroundColor: BACKGROUNDS[background] }}><MoonArtwork date={date} latitude={southern ? -33 : 40} weather={weather} reducedData={reducedData} /></div>
          <figcaption>Phone target · 128px</figcaption>
        </figure>
        <figure role="group" aria-label="Large artwork">
          <div className="moon-review__scene moon-review__scene--large" style={{ backgroundColor: BACKGROUNDS[background] }}><MoonArtwork date={date} latitude={southern ? -33 : 40} weather={weather} reducedData={reducedData} /></div>
          <figcaption>Closer look · 256px</figcaption>
        </figure>
      </div>
    </main>
  );
}
