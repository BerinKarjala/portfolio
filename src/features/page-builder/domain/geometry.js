const round = (n) => Math.round(n * 10000) / 10000;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export function rectToGeometry(child, parent) {
  if (!(parent.width > 0 && parent.height > 0))
    throw new Error("The destination has no measurable content box.");
  return {
    x: round(((child.left - parent.left) / parent.width) * 100),
    y: round(((child.top - parent.top) / parent.height) * 100),
    width: round((child.width / parent.width) * 100),
    height: round((child.height / parent.height) * 100),
  };
}
export function pointerGeometry(start, pointer, parent) {
  return {
    ...start.geometry,
    x: round(
      start.geometry.x +
        ((pointer.x - start.pointer.x + start.parent.left - parent.left) /
          parent.width) *
          100,
    ),
    y: round(
      start.geometry.y +
        ((pointer.y - start.pointer.y + start.parent.top - parent.top) /
          parent.height) *
          100,
    ),
  };
}
export function resizeGeometry(geometry, delta, parent, aspect = false) {
  let width = Math.max(0.1, geometry.width + (delta.x / parent.width) * 100);
  let height = Math.max(0.1, geometry.height + (delta.y / parent.height) * 100);
  if (aspect) {
    const ratio = Math.max(width / geometry.width, height / geometry.height);
    width = geometry.width * ratio;
    height = geometry.height * ratio;
  }
  return {
    ...geometry,
    width: round(clamp(width, 0.1, 1000)),
    height: round(clamp(height, 0.1, 1000)),
  };
}
export function snapGeometry(
  geometry,
  parent,
  siblings = [],
  { disabled = false, resize = false, threshold = 6 } = {},
) {
  const result = { ...geometry };
  const guides = [];
  if (disabled) return { geometry: result, guides };
  for (const [axis, size, dimension] of [
    ["x", "width", parent.width],
    ["y", "height", parent.height],
  ]) {
    const targets = [
      0,
      50,
      100,
      ...siblings.flatMap((s) => [
        s[axis],
        s[axis] + s[size] / 2,
        s[axis] + s[size],
      ]),
    ];
    const offsets = resize
      ? [result[size]]
      : [0, result[size] / 2, result[size]];
    let nearest = null;
    for (const at of targets)
      for (const offset of offsets) {
        const delta = at - (result[axis] + offset);
        if (
          (Math.abs(delta) * dimension) / 100 <= threshold &&
          (!nearest || Math.abs(delta) < Math.abs(nearest.delta))
        )
          nearest = { delta, at };
      }
    if (nearest) {
      if (resize)
        result[size] = Math.max(0.1, round(result[size] + nearest.delta));
      else result[axis] = round(result[axis] + nearest.delta);
      guides.push({ axis, at: nearest.at });
    }
  }
  return { geometry: result, guides };
}
