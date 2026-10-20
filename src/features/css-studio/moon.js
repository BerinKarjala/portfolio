// Mean synodic phase, epoch: 2000-01-06 18:14 UTC new moon.
// Approximate illumination, not an astronomical event predictor. Northern-view orientation.
export function moonPhase(date = new Date()) {
  const cycles =
    (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / (29.530588853 * 86400000);
  if (!Number.isFinite(cycles)) return 0.5;
  return ((cycles % 1) + 1) % 1;
}
export function moonPath(phase) {
  const waxing = phase < 0.5;
  const x = Math.abs(Math.cos(2 * Math.PI * phase)) * 12;
  const outer = waxing ? 1 : 0;
  const inner = phase < 0.25 || phase >= 0.75 ? 1 - outer : outer;
  return `M 16 4 A 12 12 0 0 ${outer} 16 28 A ${Math.max(x, 0.001)} 12 0 0 ${inner} 16 4 Z`;
}
