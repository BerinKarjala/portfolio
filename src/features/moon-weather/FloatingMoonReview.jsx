import { useEffect, useRef, useState } from 'react';
import Calendar from '../../components/Calendar';
import useMinuteClock from '../landing-scene/useMinuteClock';
import { getMoonPresentation } from './lunar';
import FloatingMoon from './FloatingMoon';
import './floating-moon-review.css';

const WEATHER = [
  ['none', 'Weather unavailable'], ['0', 'Clear'], ['2', 'Partly cloudy'],
  ['3', 'Overcast'], ['45', 'Fog'], ['61', 'Rain'], ['80', 'Rain showers'],
  ['71', 'Snow'], ['sleet', 'Sleet'], ['95', 'Thunderstorm'], ['96', 'Thunderstorm and hail'],
];

function CalendarPreview({ launcher, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    node.querySelector('button')?.focus();
    return () => {
      if (node.open) node.close();
      if (launcher?.isConnected) launcher.focus({ preventScroll: true });
    };
  }, [launcher]);
  return <dialog ref={dialog} className="floating-review__calendar" aria-label="Calendar"
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <div className="floating-review__calendar-content">
      <div className="floating-review__calendar-heading"><h2>Calendar</h2><button onClick={onClose} aria-label="Close calendar">×</button></div>
      <Calendar />
    </div>
  </dialog>;
}

export default function FloatingMoonReview() {
  const date = useMinuteClock();
  const [code, setCode] = useState('none');
  const [daytime, setDaytime] = useState(true);
  const [wind, setWind] = useState(false);
  const [rain, setRain] = useState(false);
  const [reducedData, setReducedData] = useState(false);
  const [launcher, setLauncher] = useState(null);
  const name = WEATHER.find(([value]) => value === code)?.[1] || 'Weather unavailable';
  const weather = code === 'none' ? null : {
    code: code === 'sleet' ? null : Number(code),
    precipitationType: code === 'sleet' ? 'ice-pellets' : undefined,
    daytime, windSpeedKmh: wind ? 40 : 0, rainMm: rain ? 0.4 : 0, intervalSeconds: 900,
  };
  const phase = getMoonPresentation(date);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timestamp = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: zone }).format(date);
  return <>
    <header className="floating-review__header">
      <nav aria-label="Primary">
        <a href="/">Berin Karjala</a><a href="/project">Projects</a><a href="/about">About Me!</a>
      </nav>
    </header>
    <FloatingMoon date={date} weather={weather} reducedData={reducedData} onCalendar={setLauncher}>
      <p><strong>{timestamp}</strong></p>
      <p>Device time · {phase?.name || 'Moon phase unavailable'} (approximate)</p>
      <p>{weather ? `${name} · sample` : 'Weather unavailable'}</p>
    </FloatingMoon>
    <main className="floating-review">
      <h1>Floating moon preview</h1>
      <p>Weather samples are illustrative; they are not live readings.</p>
      <p>Drag the moon, release it, and watch it return. Select the moon to open its details.</p>
      <p>With the moon focused, use the arrow keys to move it or Home to return it to its starting position.</p>
      <div className="floating-review__controls">
        <label htmlFor="floating-weather">Weather sample</label>
        <select id="floating-weather" value={code} onChange={event => { setCode(event.target.value); setRain(false); }}>
          {WEATHER.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label><input type="checkbox" checked={daytime} onChange={event => setDaytime(event.target.checked)} /> Daytime</label>
        <label><input type="checkbox" checked={wind} disabled={!weather} onChange={event => setWind(event.target.checked)} /> Add wind</label>
        <label><input type="checkbox" checked={rain} disabled={!['71', '95', '96'].includes(code)} onChange={event => setRain(event.target.checked)} /> Add recent rain</label>
        <label><input type="checkbox" checked={reducedData} onChange={event => setReducedData(event.target.checked)} /> Reduced data</label>
      </div>
    </main>
    {launcher && <CalendarPreview launcher={launcher} onClose={() => setLauncher(null)} />}
  </>;
}
