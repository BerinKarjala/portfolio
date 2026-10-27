import { describe, expect, it } from 'vitest';
import { selectWeatherLayers } from './conditions';

describe('weather artwork selection', () => {
  it('shows no effects without a weather observation and no sun on a clear night', () => {
    expect(selectWeatherLayers(null)).toEqual([]);
    expect(selectWeatherLayers({ code: 0, daytime: false })).toEqual([]);
    expect(selectWeatherLayers({ code: 0, daytime: undefined })).toEqual([]);
    expect(selectWeatherLayers({ code: 0, daytime: true })).toEqual(['sun']);
  });

  it('distinguishes mainly clear, partly cloudy, and overcast', () => {
    expect(selectWeatherLayers({ code: 1, daytime: true })).toEqual(['sun', 'partly-cloudy']);
    expect(selectWeatherLayers({ code: 1, daytime: false })).toEqual(['partly-cloudy']);
    expect(selectWeatherLayers({ code: 2, daytime: true })).toEqual(['sun', 'partly-cloudy']);
    expect(selectWeatherLayers({ code: 2, daytime: false })).toEqual(['sun', 'partly-cloudy']);
    expect(selectWeatherLayers({ code: 3, daytime: true })).toEqual(['overcast']);
  });

  it.each([
    [45, ['fog']], [48, ['fog']], [51, ['rain']], [56, ['rain']],
    [61, ['rain']], [67, ['rain']], [71, ['snow']], [77, ['snow']],
    [80, ['scattered-showers']], [82, ['scattered-showers']], [85, ['snow']],
    [95, ['thunderstorm', 'lightning']], [97, ['thunderstorm', 'lightning']],
    [96, ['thunderstorm', 'hail', 'lightning']], [99, ['thunderstorm', 'hail', 'lightning']],
  ])('maps provider code %s to its supported layers', (code, expected) => {
    expect(selectWeatherLayers({ code, daytime: true })).toEqual(expected);
  });

  it('combines independently reported rain and wind without covering lightning', () => {
    const layers = selectWeatherLayers({
      code: 95, daytime: false, rainMm: 0.4, intervalSeconds: 900, windSpeedKmh: 32.18688,
    });
    expect(layers).toEqual(['thunderstorm', 'rain', 'wind', 'lightning']);
  });

  it('uses a configurable 20 mph wind threshold and rejects invalid wind values', () => {
    expect(selectWeatherLayers({ code: 3, windSpeedKmh: 32.18 })).toEqual(['overcast']);
    expect(selectWeatherLayers({ code: 3, windSpeedKmh: 32.18688 })).toEqual(['overcast', 'wind']);
    expect(selectWeatherLayers({ code: 3, windSpeedKmh: 25 }, { windThresholdMph: 15 })).toEqual(['overcast', 'wind']);
    for (const speed of [-1, Infinity, NaN, '40']) {
      expect(selectWeatherLayers({ code: 3, windSpeedKmh: speed })).toEqual(['overcast']);
    }
  });

  it('does not infer sleet from mixed rain and snow, or use stale/invalid accumulation periods', () => {
    expect(selectWeatherLayers({ code: 71, rainMm: 0.4, intervalSeconds: 900 })).toEqual(['rain', 'snow']);
    expect(selectWeatherLayers({ code: 71, rainMm: 0.4, intervalSeconds: 3600 })).toEqual(['snow']);
    expect(selectWeatherLayers({ code: 71, rainMm: -1, intervalSeconds: 900 })).toEqual(['snow']);
    expect(selectWeatherLayers({ code: 999, windSpeedKmh: 40 })).toEqual(['wind']);
    expect(selectWeatherLayers({ code: 999 })).toEqual([]);
  });

  it('shows sleet for an explicit ice-pellets classification', () => {
    expect(selectWeatherLayers({ code: 999, precipitationType: 'ice-pellets' })).toEqual(['sleet']);
    expect(selectWeatherLayers({ code: 999, precipitationType: 'mixed-rain-and-snow' })).toEqual([]);
  });
});
