import { moonPath, moonPhase } from '../css-studio/moon';

const PHASE_NAMES = [
  'New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
  'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent',
];

// Phase geometry is approximate; names use the nearest of eight landmarks.
export function nameMoonPhase(phase) {
  if (!Number.isFinite(phase)) return null;
  const normalized = ((phase % 1) + 1) % 1;
  return PHASE_NAMES[Math.round(normalized * 8) % PHASE_NAMES.length];
}

export function getMoonPresentation(date, latitude) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const phase = moonPhase(date);
  const southern = Number.isFinite(latitude) && latitude >= -90 && latitude < 0;
  return { phase, name: nameMoonPhase(phase), path: moonPath(phase), flipX: southern };
}
