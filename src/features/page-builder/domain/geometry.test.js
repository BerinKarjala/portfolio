import { describe, expect, it } from "vitest";
import {
  rectToGeometry,
  pointerGeometry,
  snapGeometry,
  resizeGeometry,
} from "./geometry";

describe("canvas coordinate contracts (AC-03)", () => {
  it("uses measured parent content boxes, accounting for offset, scroll and scale", () => {
    expect(
      rectToGeometry(
        { left: 225, top: 350, width: 100, height: 50 },
        { left: 200, top: 300, width: 500, height: 250 },
      ),
    ).toEqual({ x: 5, y: 20, width: 20, height: 20 });
    const start = {
      geometry: { x: 10, y: 20, width: 30, height: 40 },
      pointer: { x: 300, y: 200 },
      parent: { left: 100, top: 100, width: 500, height: 250 },
    };
    expect(
      pointerGeometry(
        start,
        { x: 325, y: 225 },
        { left: 75, top: 50, width: 500, height: 250 },
      ),
    ).toMatchObject({ x: 20, y: 50 });
  });
  it("snaps sibling/parent edges and centers within a screen-pixel threshold; supports override", () => {
    const g = { x: 49.5, y: 29.5, width: 20, height: 10 };
    const siblings = [{ x: 50, y: 30, width: 10, height: 10 }];
    const result = snapGeometry(g, { width: 600, height: 300 }, siblings);
    expect(result.geometry).toMatchObject({ x: 50, y: 30 });
    expect(result.guides.length).toBeGreaterThan(0);
    expect(
      snapGeometry(g, { width: 600, height: 300 }, siblings, { disabled: true })
        .geometry,
    ).toEqual(g);
  });
  it("resizes in parent percentages and keeps aspect ratio when requested", () => {
    const result = resizeGeometry(
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 50, y: 5 },
      { width: 500, height: 250 },
      true,
    );
    expect(result).toMatchObject({ width: 30, height: 30 });
  });
});
