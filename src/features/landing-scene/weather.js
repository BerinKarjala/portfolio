const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
export const WEATHER_REFRESH = 15 * 60 * 1000;
// IANA zones returned from the granted coordinates provide an initial unit
// preference. This is a heuristic, not a country/border lookup; expose a switch.
const fahrenheitZones = new Set([
  'America/New_York', 'America/Detroit', 'America/Chicago', 'America/Denver',
  'America/Boise', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage',
  'America/Juneau', 'America/Sitka', 'America/Metlakatla', 'America/Yakutat',
  'America/Nome', 'America/Adak', 'Pacific/Honolulu', 'America/Nassau',
  'America/Belize', 'America/Cayman', 'Africa/Monrovia', 'Pacific/Palau',
  'Pacific/Majuro', 'Pacific/Kwajalein', 'Pacific/Chuuk', 'Pacific/Pohnpei',
  'Pacific/Kosrae', 'Pacific/Guam', 'Pacific/Saipan', 'America/Puerto_Rico',
  'America/St_Thomas', 'Pacific/Pago_Pago',
]);
export const temperatureUnit = zone => fahrenheitZones.has(zone) || /^America\/(Indiana|Kentucky|North_Dakota)\//.test(zone) ? 'fahrenheit' : 'celsius';
export const formatTemperature = (value, unit) => `${Math.round(unit === 'fahrenheit' ? value * 9 / 5 + 32 : value)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
export function weatherDescription(code) {
  if (code === 0) return 'Clear skies';
  if ([1, 2, 3].includes(code)) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Conditions unavailable';
}
export async function fetchWeather(coordinates, { fetcher = fetch, signal, now = Date.now } = {}) {
  const { latitude, longitude } = coordinates;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('Invalid location');
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error('Weather request timed out')), 8000);
  try {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ latitude: latitude.toFixed(2), longitude: longitude.toFixed(2), current: 'temperature_2m,weather_code,is_day', timezone: 'auto', temperature_unit: 'celsius', timeformat: 'unixtime' });
    const response = await fetcher(url.toString(), { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Weather unavailable');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Weather unavailable');
    const decoder = new TextDecoder();
    let size = 0;
    let content = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16384) { await reader.cancel(); throw new Error('Weather response too large'); }
        content += decoder.decode(value, { stream: true });
      }
      content += decoder.decode();
    } finally { reader.releaseLock(); }
    const data = JSON.parse(content);
    const current = data.current;
    new Intl.DateTimeFormat('en-US', { timeZone: data.timezone }).format();
    if (typeof data.timezone !== 'string' || !Number.isFinite(current?.temperature_2m) || current.temperature_2m < -100 || current.temperature_2m > 70 || !Number.isInteger(current.weather_code) || !Number.isFinite(current.time) || ![0, 1].includes(current.is_day)) throw new Error('Invalid weather response');
    return { temperature: current.temperature_2m, code: current.weather_code, daytime: current.is_day === 1, timezone: data.timezone, observedAt: current.time * 1000, fetchedAt: now() };
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
