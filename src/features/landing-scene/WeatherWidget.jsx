import { useEffect, useId, useRef } from 'react';
import { useStudioControls } from '../css-studio/Studio';
import { moonPath, moonPhase } from '../css-studio/moon';
import { useScene } from './SceneContext';
import useMinuteClock from './useMinuteClock';
import { formatTemperature, weatherDescription } from './weather';
import useCurrentWeather from './useCurrentWeather';
import './weather.css';
import useObjectGesture from './useObjectGesture';

export default function WeatherWidget() {
  const studio = useStudioControls();
  const scene = useScene();
  const setTimeZone = scene?.setTimeZone;
  useEffect(() => { setTimeZone?.(Intl.DateTimeFormat().resolvedOptions().timeZone); }, [setTimeZone]);
  const date = useMinuteClock();
  const phaseId = useId();
  const phase = moonPhase(date);
  const phaseName = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'][Math.round(phase * 8) % 8];
  const object = useRef(null);
  const gesture = useObjectGesture({
    primary: event => studio?.launch(event),
    secondary: event => scene?.openCalendar(event.currentTarget),
    onInteraction: scene?.setInteracting,
    bounds: () => {
      const rect = object.current.getBoundingClientRect();
      return { minX: gesture.position.x - rect.left, maxX: gesture.position.x + window.innerWidth - rect.right, minY: gesture.position.y - rect.top, maxY: gesture.position.y + window.innerHeight - rect.bottom };
    },
  });
  const fitPosition = useRef(gesture.fit);
  fitPosition.current = () => {
    const rect = object.current?.getBoundingClientRect();
    if (!rect) return;
    const anchorTop = rect.top - gesture.position.y;
    // Scrolling and short/zoomed headers are normal document flow. A modal
    // resize must not pull that header down over the card to fit the viewport.
    if (window.scrollY === 0 && anchorTop >= 0 && anchorTop + rect.height <= window.innerHeight) gesture.fit();
  };
  useEffect(() => {
    if (!window.ResizeObserver) return;
    const observer = new ResizeObserver(() => fitPosition.current());
    observer.observe(object.current);
    return () => observer.disconnect();
  }, []);
  const resetPosition = useRef(gesture.reset);
  resetPosition.current = gesture.reset;
  useEffect(() => {
    const reset = () => resetPosition.current();
    window.addEventListener('resize', reset);
    return () => window.removeEventListener('resize', reset);
  }, []);
  const { weather, message, loading, unit, useLocation, toggleUnit } = useCurrentWeather(setTimeZone);
  const zone = weather?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options = { timeZone: zone };
  const description = weather ? weatherDescription(weather.code) : '';
  const stale = weather && date.getTime() - weather.observedAt > 45 * 60 * 1000;
  return <div ref={object} style={{ transform: `translate(${gesture.position.x}px, ${gesture.position.y}px)` }} className="scene-weather" role="group" aria-label="Weather and time">
    <button className="scene-weather-object" ref={studio?.navLauncher} aria-label="Theme Studio" aria-describedby={phaseId} title="Open Theme Studio. Drag to move; right-click or two-finger tap for the calendar." {...gesture.handlers}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <g transform="translate(16 0)"><circle cx="16" cy="16" r="12" fill="#34485b" stroke="#e5e5de" /><path d={moonPath(phase)} fill="#f3f0d9" /></g>
        {weather && weather.code !== 0 && <path d="M13 43c-10 0-10-14 0-15 1-13 20-16 25-5 12-5 22 8 16 16-2 3-5 4-9 4Z" fill="#788b9c" stroke="#b7cad4" />}
        {weather && /Rain|Drizzle|Thunderstorm/.test(description) && <path d="m18 49-3 8m15-8-3 8m15-8-3 8" stroke="#9ed8f1" strokeWidth="2" />}
        {weather && description === 'Snow' && <g fill="#eef8ff"><circle cx="18" cy="53" r="2" /><circle cx="30" cy="56" r="2" /><circle cx="42" cy="52" r="2" /></g>}
      </svg>
    </button>
    <div className="scene-weather-details">
      <time dateTime={date.toISOString()}>
        <span>{new Intl.DateTimeFormat('en-US', { ...options, weekday: 'long' }).format(date)}</span>
        <span>{new Intl.DateTimeFormat('en-US', { ...options, month: 'short', day: 'numeric', year: 'numeric' }).format(date)}</span>
        <strong>{new Intl.DateTimeFormat('en-US', { ...options, hour: 'numeric', minute: '2-digit' }).format(date)}</strong>
      </time>
      <span id={phaseId} className="weather-zone">{weather ? zone.replaceAll('_', ' ') : 'Device time'} · {phaseName} (approx.)</span>
      {weather && <p>{formatTemperature(weather.temperature, unit)} · {description}</p>}
      {stale && <p>Weather reading is stale.</p>}
      <p role="status">{message || (loading ? 'Refreshing weather…' : '')}</p>
      <div className="scene-weather-actions">
        <button onClick={useLocation} disabled={loading}>Use my location</button>
        {weather && <button aria-label={`Switch to ${unit === 'fahrenheit' ? 'Celsius' : 'Fahrenheit'}`} onClick={toggleUnit}>{unit === 'fahrenheit' ? '°C' : '°F'}</button>}
        <button ref={scene?.calendarLauncher} onClick={event => scene?.openCalendar(event.currentTarget)}>Calendar</button>
        {(gesture.position.x !== 0 || gesture.position.y !== 0) && <button onClick={gesture.reset}>Reset weather position</button>}
      </div>
      <small>Weather by Open-Meteo</small>
    </div>
  </div>;
}
