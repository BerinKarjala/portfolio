import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation as useRouteLocation } from 'react-router-dom';
import Calendar from '../../components/Calendar';
import { useStudioOpen } from '../css-studio/Studio';
import { useScene } from '../landing-scene/SceneContext';
import useCurrentWeather from '../landing-scene/useCurrentWeather';
import useMinuteClock from '../landing-scene/useMinuteClock';
import { formatTemperature, weatherDescription } from '../landing-scene/weather';
import { getMoonPresentation } from './lunar';
import { supportsMoon } from './moonRoutes';
import FloatingMoon from './FloatingMoon';
import './live-moon.css';

function MoonCalendar({ launcher, timeZone, onClose }) {
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
  return <dialog ref={dialog} className="moon-calendar" aria-label="Calendar" aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <div className="moon-calendar__content">
      <div className="moon-calendar__heading"><h2>Calendar</h2><button type="button" onClick={onClose} aria-label="Close calendar">×</button></div>
      <Calendar timeZone={timeZone} />
    </div>
  </dialog>;
}

export default function LiveMoon() {
  const { pathname } = useRouteLocation();
  const scene = useScene();
  const studioOpen = useStudioOpen();
  const date = useMinuteClock();
  const { weather, latitude, message, loading, unit, useLocation, toggleUnit } = useCurrentWeather(scene?.setTimeZone);
  const [launcher, setLauncher] = useState(null);
  const visible = supportsMoon(pathname);
  const zone = weather?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const phase = getMoonPresentation(date, latitude);
  const timestamp = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: zone }).format(date);
  const stale = weather && date.getTime() - weather.observedAt > 45 * 60 * 1000;

  useEffect(() => {
    if (!visible) setLauncher(null);
  }, [visible]);
  useEffect(() => {
    if (!launcher) return undefined;
    scene?.setInteracting(true);
    return () => scene?.setInteracting(false);
  }, [launcher, scene?.setInteracting]);
  if (!visible) return null;

  return createPortal(<div className={studioOpen ? 'moon-live moon-live--studio-open' : 'moon-live'}>
    <FloatingMoon date={date} latitude={latitude} weather={weather}
      onInteraction={active => { if (!launcher) scene?.setInteracting(active); }} onCalendar={setLauncher}>
      <p><strong>{timestamp}</strong></p>
      <p>{weather ? zone.replaceAll('_', ' ') : `Device time · ${zone.replaceAll('_', ' ')}`} · {phase?.name || 'Moon phase unavailable'} (approximate)</p>
      {weather && <p>{formatTemperature(weather.temperature, unit)} · {weatherDescription(weather.code)}</p>}
      {stale && <p>Weather reading is stale.</p>}
      <p role="status">{message || (loading ? 'Refreshing weather…' : '')}</p>
      <div className="moon-live__location-actions">
        <button type="button" onClick={useLocation} disabled={loading}>Use my location</button>
        {weather && <button type="button" aria-label={`Switch to ${unit === 'fahrenheit' ? 'Celsius' : 'Fahrenheit'}`} onClick={toggleUnit}>{unit === 'fahrenheit' ? '°C' : '°F'}</button>}
      </div>
      <small>Weather by Open-Meteo</small>
    </FloatingMoon>
    {launcher && <MoonCalendar launcher={launcher} timeZone={zone} onClose={() => setLauncher(null)} />}
  </div>, document.body);
}
