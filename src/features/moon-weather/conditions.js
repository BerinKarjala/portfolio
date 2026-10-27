// Open-Meteo current weather codes: https://open-meteo.com/en/docs#weathervariables
// Layer order keeps lightning visible above storm clouds and precipitation.
const LAYER_ORDER = [
  'sun', 'partly-cloudy', 'overcast', 'fog', 'thunderstorm',
  'rain', 'scattered-showers', 'snow', 'sleet', 'hail', 'wind', 'lightning',
];
const DEFAULT_WIND_MPH = 20;
const KM_PER_MILE = 1.609344;
const MAX_RECENT_INTERVAL_SECONDS = 900;
const STORMS = new Set([95, 96, 97, 99]);
const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67]);
const SHOWERS = new Set([80, 81, 82]);
const SNOW = new Set([71, 73, 75, 77, 85, 86]);

// Amounts are recent accumulated precipitation in their stated units, not
// instantaneous rates. Unknown codes never imply hail, sleet, or rain. Callers
// may supply 'ice-pellets' only after validating an explicit provider type.
export function selectWeatherLayers(weather, { windThresholdMph = DEFAULT_WIND_MPH } = {}) {
  if (!weather || typeof weather !== 'object' || Array.isArray(weather)) return [];
  const layers = new Set();
  const { code, daytime, windSpeedKmh, rainMm, snowfallCm, intervalSeconds, precipitationType } = weather;
  if (code === 0 && daytime === true) layers.add('sun');
  if (code === 1 || code === 2) {
    if (daytime === true) layers.add('sun');
    layers.add('partly-cloudy');
  }
  if (code === 3) layers.add('overcast');
  if (code === 45 || code === 48) layers.add('fog');
  if (RAIN.has(code)) layers.add('rain');
  if (SHOWERS.has(code)) layers.add('scattered-showers');
  if (SNOW.has(code)) layers.add('snow');
  if (STORMS.has(code)) { layers.add('thunderstorm'); layers.add('lightning'); }
  if (code === 96 || code === 99) layers.add('hail');
  if (precipitationType === 'ice-pellets') layers.add('sleet');

  const recent = Number.isInteger(intervalSeconds) && intervalSeconds > 0 && intervalSeconds <= MAX_RECENT_INTERVAL_SECONDS;
  if (recent && Number.isFinite(rainMm) && rainMm > 0 && (STORMS.has(code) || SNOW.has(code))) layers.add('rain');
  if (recent && Number.isFinite(snowfallCm) && snowfallCm > 0 && (STORMS.has(code) || RAIN.has(code) || SHOWERS.has(code))) layers.add('snow');
  const threshold = Number.isFinite(windThresholdMph) && windThresholdMph >= 0 ? windThresholdMph : DEFAULT_WIND_MPH;
  if (Number.isFinite(windSpeedKmh) && windSpeedKmh >= 0 && windSpeedKmh / KM_PER_MILE >= threshold) layers.add('wind');
  return LAYER_ORDER.filter(layer => layers.has(layer));
}
