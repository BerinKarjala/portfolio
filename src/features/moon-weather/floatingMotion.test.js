import { describe, expect, it } from 'vitest';
import { clampPoint, dragBounds, returnPoint } from './floatingMotion';

describe('floating moon motion', () => {
  it('keeps the whole moon inside the usable viewport while allowing movement in both axes', () => {
    const bounds = dragBounds(
      { left: 184, top: 8, right: 312, bottom: 136 },
      { x: 0, y: 0 }, { width: 320, height: 740 }, 8,
    );
    expect(bounds).toEqual({ minX: -176, maxX: 0, minY: 0, maxY: 596 });
    expect(clampPoint({ x: -500, y: 900 }, bounds)).toEqual({ x: -176, y: 596 });
  });

  it('recomputes limits from the displayed position after a resize', () => {
    const bounds = dragBounds(
      { left: -24, top: 250, right: 104, bottom: 378 },
      { x: -180, y: 242 }, { width: 300, height: 400 }, 8,
    );
    expect(clampPoint({ x: -180, y: 242 }, bounds)).toEqual({ x: -148, y: 242 });
    expect(clampPoint({ x: 0, y: 1000 }, bounds)).toEqual({ x: 0, y: 256 });
  });

  it('returns halfway through the eight-second drift and arrives at home on time', () => {
    const from = { x: -160, y: 200 };
    expect(returnPoint(from, 0, 8000)).toEqual(from);
    expect(returnPoint(from, 4000, 8000)).toEqual({ x: -80, y: 100 });
    expect(returnPoint(from, 8000, 8000)).toEqual({ x: 0, y: 0 });
    expect(returnPoint(from, 12000, 8000)).toEqual({ x: 0, y: 0 });
  });
});
