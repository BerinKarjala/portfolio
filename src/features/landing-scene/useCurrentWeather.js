import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWeather, temperatureUnit, WEATHER_REFRESH } from './weather';

// Coordinates are kept only in memory and are requested only on explicit action.
export default function useCurrentWeather(setTimeZone) {
  const [weather, setWeather] = useState(null);
  const [latitude, setLatitude] = useState(null);
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
      setLatitude(coordinates.current.latitude);
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
    reading.current = null;
    setWeather(null);
    setLatitude(null);
    setTimeZone?.(Intl.DateTimeFormat().resolvedOptions().timeZone);
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
  return { weather, latitude, message, loading, unit, useLocation,
    toggleUnit: () => setUnitOverride(unit === 'fahrenheit' ? 'celsius' : 'fahrenheit') };
}
