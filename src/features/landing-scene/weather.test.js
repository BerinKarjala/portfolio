import { expect, it, vi } from 'vitest';
import { fetchWeather, temperatureUnit, formatTemperature } from './weather';
const sample = { timezone: 'America/New_York', current: { time: 1792713600, temperature_2m: 15, weather_code: 61, is_day: 1 } };
it('uses a fixed provider endpoint, rounded granted coordinates and validated data', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(sample)));
  const weather = await fetchWeather({ latitude: 40.71281, longitude: -74.00604 }, { fetcher, now: () => 1000 });
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
  expect(url.searchParams.get('latitude')).toBe('40.71');
  expect(url.searchParams.get('longitude')).toBe('-74.01');
  expect(url.searchParams.get('timezone')).toBe('auto');
  expect(weather).toMatchObject({ temperature: 15, code: 61, timezone: 'America/New_York', fetchedAt: 1000 });
  expect(temperatureUnit(weather.timezone)).toBe('fahrenheit');
  expect(temperatureUnit('Europe/Paris')).toBe('celsius');
  expect(formatTemperature(15, 'fahrenheit')).toBe('59°F');
});
it('rejects invalid coordinates before making a request', async () => {
  const fetcher = vi.fn();
  await expect(fetchWeather({ latitude: NaN, longitude: 0 }, { fetcher })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects errors, oversized responses and malformed provider values', async () => {
  for (const response of [new Response('', { status: 503 }), new Response('x'.repeat(20000)), new Response(JSON.stringify({ ...sample, timezone: 'Not/AZone' })), new Response(JSON.stringify({ ...sample, current: { ...sample.current, temperature_2m: 'warm' } }))]) {
    await expect(fetchWeather({ latitude: 40, longitude: -74 }, { fetcher: async () => response })).rejects.toThrow();
  }
});
it('times out a stalled provider request', async () => {
  vi.useFakeTimers();
  const fetcher = (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  const result = expect(fetchWeather({ latitude: 40, longitude: -74 }, { fetcher })).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(8000);
  await result;
  vi.useRealTimers();
});
