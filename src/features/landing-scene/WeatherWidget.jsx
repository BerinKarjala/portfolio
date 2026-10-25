import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useStudioControls } from '../css-studio/Studio';
import { moonPath, moonPhase } from '../css-studio/moon';
import { useScene } from './SceneContext';
import useMinuteClock from './useMinuteClock';
import { fetchWeather, formatTemperature, temperatureUnit, weatherDescription, WEATHER_REFRESH } from './weather';
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
  const [weather, setWeather] = useState(null);
  const [message, setMessage] = useState('Weather needs your permission.');
  const [loading, setLoading] = useState(false);
  const [unitOverride, setUnitOverride] = useState(null);
  const coordinates = useRef(null);
  const reading = useRef(null);
  const request = useRef(null);
  const generation = useRef(0);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    if (!coordinates.current || !alive.current) return;
    const id = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const result = await fetchWeather(coordinates.current, { signal: controller.signal });
      if (!alive.current || generation.current !== id) return;
      reading.current = result;
      setWeather(result);
      setTimeZone?.(result.timezone);
      setMessage('');
    } catch {
      if (!alive.current || generation.current !== id || controller.signal.aborted) return;
      setMessage(reading.current ? 'Last reading; update unavailable.' : 'Weather unavailable. Try location again.');
    } finally {
      if (alive.current && generation.current === id) setLoading(false);
    }
  }, [setTimeZone]);
  useEffect(() => {
    alive.current = true;
    const check = () => {
      if (document.visibilityState !== 'hidden' && coordinates.current && (!reading.current || Date.now() - reading.current.fetchedAt >= WEATHER_REFRESH)) void refresh();
    };
    const timer = setInterval(check, WEATHER_REFRESH);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('pageshow', check);
    return () => {
      alive.current = false;
      generation.current++;
      request.current?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('pageshow', check);
    };
  }, [refresh]);
  function useLocation() {
    if (!navigator.geolocation) { setMessage('Location is unavailable in this browser.'); return; }
    const id = ++generation.current;
    request.current?.abort();
    coordinates.current = null;
    setLoading(true);
    setMessage('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current || generation.current !== id) return;
      coordinates.current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setMessage('Loading weather…');
      void refresh();
    }, error => {
      if (!alive.current || generation.current !== id) return;
      setLoading(false);
      setMessage(error.code === 1 ? 'Location permission was denied. Clock and moon remain available.' : 'Location unavailable. Try again when ready.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: WEATHER_REFRESH });
  }
  const unit = unitOverride || temperatureUnit(weather?.timezone || '');
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
        {weather && <button aria-label={`Switch to ${unit === 'fahrenheit' ? 'Celsius' : 'Fahrenheit'}`} onClick={() => setUnitOverride(unit === 'fahrenheit' ? 'celsius' : 'fahrenheit')}>{unit === 'fahrenheit' ? '°C' : '°F'}</button>}
        <button ref={scene?.calendarLauncher} onClick={event => scene?.openCalendar(event.currentTarget)}>Calendar</button>
        {(gesture.position.x !== 0 || gesture.position.y !== 0) && <button onClick={gesture.reset}>Reset weather position</button>}
      </div>
      <small>Weather by Open-Meteo</small>
    </div>
  </div>;
}
