export function dragBounds(rect, position, viewport, inset = 8) {
  const edges = typeof inset === 'number'
    ? { left: inset, right: inset, top: inset, bottom: inset } : inset;
  return {
    minX: position.x + edges.left - rect.left,
    maxX: position.x + viewport.width - edges.right - rect.right,
    minY: position.y + edges.top - rect.top,
    maxY: position.y + viewport.height - edges.bottom - rect.bottom,
  };
}

export function safeInsets(element) {
  const style = window.getComputedStyle(element);
  return Object.fromEntries(['left', 'right', 'top', 'bottom'].map(side => [
    side, Math.max(8, Number.parseFloat(style.getPropertyValue(`--moon-safe-${side}`)) || 0),
  ]));
}

const clamp = (value, min, max) => min > max ? min : Math.max(min, Math.min(max, value));

export function clampPoint(point, bounds) {
  return { x: clamp(point.x, bounds.minX, bounds.maxX), y: clamp(point.y, bounds.minY, bounds.maxY) };
}

export function returnPoint(from, elapsed, duration = 8000) {
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  if (progress >= 1) return { x: 0, y: 0 };
  const easing = progress * progress * (3 - 2 * progress);
  return { x: from.x * (1 - easing), y: from.y * (1 - easing) };
}
