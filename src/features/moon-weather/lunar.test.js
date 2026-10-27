import { describe, expect, it } from 'vitest';
import { getMoonPresentation, nameMoonPhase } from './lunar';

describe('moon artwork presentation', () => {
  it.each([
    [0, 'New moon'], [0.125, 'Waxing crescent'], [0.25, 'First quarter'],
    [0.375, 'Waxing gibbous'], [0.5, 'Full moon'], [0.625, 'Waning gibbous'],
    [0.75, 'Last quarter'], [0.875, 'Waning crescent'],
  ])('names phase %s as %s', (phase, expected) => {
    expect(nameMoonPhase(phase)).toBe(expected);
  });

  it('wraps smoothly across the new moon rather than snapping between artwork', () => {
    const before = getMoonPresentation(new Date('2000-01-06T18:13:00Z'));
    const at = getMoonPresentation(new Date('2000-01-06T18:14:00Z'));
    const after = getMoonPresentation(new Date('2000-01-06T18:15:00Z'));
    expect(before.name).toBe('New moon');
    expect(at.name).toBe('New moon');
    expect(after.name).toBe('New moon');
    expect(before.phase).toBeGreaterThan(0.99);
    expect(at.phase).toBe(0);
    expect(after.phase).toBeLessThan(0.01);
    expect(before.path).not.toBe(after.path);
  });

  it('keeps phase names independent of hemisphere but flips the moon below the equator', () => {
    const date = new Date('2024-04-15T19:13:00Z');
    const northern = getMoonPresentation(date, 40);
    const southern = getMoonPresentation(date, -33);
    expect(southern.name).toBe(northern.name);
    expect(southern.phase).toBe(northern.phase);
    expect(northern.flipX).toBe(false);
    expect(southern.flipX).toBe(true);
  });

  it('uses the northern view when location is missing or invalid', () => {
    const date = new Date('2024-04-15T19:13:00Z');
    for (const latitude of [undefined, null, NaN, 91, -91]) {
      expect(getMoonPresentation(date, latitude).flipX).toBe(false);
    }
  });

  it('does not present an invalid date or phase as a known lunar state', () => {
    expect(getMoonPresentation(new Date('invalid'))).toBeNull();
    expect(nameMoonPhase(NaN)).toBeNull();
  });
});
