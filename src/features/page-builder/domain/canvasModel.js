export const defaultLayout = () => ({
  direction: "column",
  wrap: false,
  align: "stretch",
  justify: "flex-start",
  columns: 2,
  overflowX: "visible",
  overflowY: "visible",
  group: false,
});
export const defaultGeometry = (parentId = null) => ({
  x: 0,
  y: 0,
  width: 40,
  height: 30,
  zIndex: 0,
  flowIndex: 0,
  flowParentId: parentId,
  hasPlacement: false,
  aspectLocked: false,
});

export function validateCanvasElement(e) {
  function ensure(condition, message) {
    if (!condition) throw new Error(message);
  }
  function keys(object, allowed) {
    ensure(
      object &&
        Object.getPrototypeOf(object) === Object.prototype &&
        Object.keys(object).length === allowed.length &&
        Object.keys(object).every((key) => allowed.includes(key)),
      "Invalid canvas field structure.",
    );
  }
  const l = e.layout;
  const g = e.geometry;
  keys(l, Object.keys(defaultLayout()));
  keys(g, Object.keys(defaultGeometry()));
  ensure(
    ["row", "column"].includes(l.direction) &&
      typeof l.wrap === "boolean" &&
      typeof l.group === "boolean",
    "Invalid flow layout.",
  );
  ensure(
    ["stretch", "flex-start", "center", "flex-end"].includes(l.align) &&
      [
        "flex-start",
        "center",
        "flex-end",
        "space-between",
        "space-around",
        "space-evenly",
      ].includes(l.justify),
    "Invalid layout alignment.",
  );
  ensure(
    Number.isInteger(l.columns) &&
      l.columns >= 1 &&
      l.columns <= 12 &&
      ["visible", "hidden", "auto"].includes(l.overflowX) &&
      ["visible", "hidden", "auto"].includes(l.overflowY),
    "Invalid columns or overflow.",
  );
  for (const key of ["x", "y", "width", "height"])
    ensure(
      typeof g[key] === "number" &&
        Number.isFinite(g[key]) &&
        g[key] <= 1000 &&
        g[key] >= (["width", "height"].includes(key) ? 0.1 : -1000),
      `Invalid percentage ${key}.`,
    );
  ensure(
    Number.isInteger(g.zIndex) &&
      Math.abs(g.zIndex) <= 10000 &&
      Number.isInteger(g.flowIndex) &&
      g.flowIndex >= 0,
    "Invalid stacking or insertion index.",
  );
  ensure(
    g.flowParentId === null ||
      (typeof g.flowParentId === "string" &&
        /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(g.flowParentId)),
    "Invalid retained flow parent.",
  );
  ensure(
    typeof g.hasPlacement === "boolean" && typeof g.aspectLocked === "boolean",
    "Invalid geometry flags.",
  );
  ensure(!l.group || e.type === "container", "Only containers can be groups.");
}
