import { ensure, object, safeUrl, identifier, text } from "./validation";

export const FONTS = {
  "system-ui": "system-ui, sans-serif",
  serif: "Georgia, serif",
  "sans-serif": "Arial, sans-serif",
  monospace: "ui-monospace, monospace",
  Inter: '"Inter", system-ui, sans-serif',
  "DM Sans": '"DM Sans", system-ui, sans-serif',
  Lora: '"Lora", Georgia, serif',
  "Space Grotesk": '"Space Grotesk", system-ui, sans-serif',
};
export const CATEGORIES = ["Typography", "Layout", "Appearance", "Effects"];
export const STATES = ["hover", "focus", "active", "disabled"];
export const ANIMATIONS = [
  "inherit",
  "none",
  "fade",
  "slide",
  "zoom",
  "rotate",
  "pulse",
  "bounce",
];
export const STYLE_GROUPS = {
  Typography: [
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textTransform",
    "textDecoration",
    "textShadow",
    "whiteSpace",
    "overflowWrap",
  ],
  Layout: [
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
    "aspectRatio",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "gap",
    "top",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "alignSelf",
  ],
  Appearance: [
    "backgroundColor",
    "backgroundImage",
    "backgroundSize",
    "backgroundPosition",
    "backgroundRepeat",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
    "boxShadow",
    "opacity",
    "objectFit",
    "objectPosition",
  ],
  Effects: [
    "transitionDuration",
    "transitionProperty",
    "transitionTimingFunction",
    "cursor",
  ],
};
const lengths = new Set(
  STYLE_GROUPS.Layout.filter(
    (k) => !["flexGrow", "flexShrink", "alignSelf", "aspectRatio"].includes(k),
  ).concat([
    "fontSize",
    "letterSpacing",
    "borderWidth",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ]),
);
export function colorToHex(input) {
  if (typeof input !== "string") throw new Error("Invalid color.");
  const s = input.trim().toLowerCase();
  if (s === "transparent") return "#00000000";
  if (/^#[0-9a-f]{3,4}$/.test(s))
    return "#" + [...s.slice(1)].map((c) => c + c).join("");
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(s)) return s;
  let match = s.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/,
  );
  let rgb, alpha;
  if (match) {
    rgb = match.slice(1, 4).map(Number);
    alpha = match[4];
    ensure(
      rgb.every((n) => n <= 255),
      "Invalid RGB color.",
    );
  } else {
    match = s.match(
      /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/,
    );
    ensure(match, "Use HEX, RGB(A) or HSL(A) color.");
    let h = (((Number(match[1]) % 360) + 360) % 360) / 60,
      sat = Number(match[2]) / 100,
      l = Number(match[3]) / 100;
    ensure(sat <= 1 && l <= 1, "Invalid HSL color.");
    const c = (1 - Math.abs(2 * l - 1)) * sat,
      x = c * (1 - Math.abs((h % 2) - 1)),
      m = l - c / 2;
    rgb = [
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ][Math.floor(h)].map((n) => (n + m) * 255);
    alpha = match[4];
  }
  return (
    "#" +
    rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("") +
    (alpha === undefined
      ? ""
      : Math.round(Number(alpha) * 255)
          .toString(16)
          .padStart(2, "0"))
  );
}
export const validLength = (value, { negative = false, auto = false } = {}) =>
  typeof value === "string" &&
  ((auto && value === "auto") ||
    new RegExp(
      `^(?:0|${negative ? "-?" : ""}\\d{1,4}(?:\\.\\d{1,3})?(?:px|rem|em|%))$`,
    ).test(value));
export function validateStyles(styles, category) {
  object(
    styles,
    category
      ? STYLE_GROUPS[category] || []
      : Object.values(STYLE_GROUPS).flat(),
    "Styles",
  );
  const enums = {
    fontFamily: Object.keys(FONTS),
    fontStyle: ["normal", "italic"],
    textAlign: ["left", "center", "right", "justify"],
    textTransform: ["none", "uppercase", "lowercase", "capitalize"],
    textDecoration: ["none", "underline", "line-through", "overline"],
    whiteSpace: ["normal", "pre-wrap", "nowrap"],
    overflowWrap: ["normal", "break-word", "anywhere"],
    backgroundSize: ["auto", "cover", "contain"],
    backgroundRepeat: ["no-repeat", "repeat", "repeat-x", "repeat-y"],
    borderStyle: ["none", "solid", "dashed", "dotted", "double"],
    objectFit: ["contain", "cover", "fill", "none", "scale-down"],
    alignSelf: ["auto", "stretch", "flex-start", "center", "flex-end"],
    transitionProperty: [
      "all",
      "color",
      "background-color",
      "opacity",
      "transform",
      "box-shadow",
    ],
    transitionTimingFunction: [
      "ease",
      "linear",
      "ease-in",
      "ease-out",
      "ease-in-out",
    ],
    cursor: ["auto", "pointer", "default"],
  };
  for (const [key, v] of Object.entries(styles)) {
    let valid = false;
    if (["color", "backgroundColor", "borderColor"].includes(key)) {
      try {
        colorToHex(v);
        valid = true;
      } catch {}
    } else if (lengths.has(key))
      valid = validLength(v, {
        negative:
          key.startsWith("margin") || key === "letterSpacing" || key === "top",
        auto: [
          "width",
          "height",
          "minWidth",
          "maxWidth",
          "minHeight",
          "maxHeight",
          "margin",
          "marginTop",
          "marginRight",
          "marginBottom",
          "marginLeft",
          "flexBasis",
        ].includes(key),
      });
    else if (enums[key]) valid = enums[key].includes(v);
    else if (key === "fontWeight")
      valid = Number.isInteger(v) && v >= 100 && v <= 900 && v % 100 === 0;
    else if (key === "lineHeight")
      valid = typeof v === "number" && v >= 0.5 && v <= 5;
    else if (key === "opacity")
      valid = typeof v === "number" && v >= 0 && v <= 1;
    else if (["flexGrow", "flexShrink"].includes(key))
      valid = typeof v === "number" && v >= 0 && v <= 100;
    else if (key === "aspectRatio")
      valid =
        typeof v === "string" &&
        /^\d{1,3}(?:\.\d+)?\s*\/\s*\d{1,3}(?:\.\d+)?$/.test(v) &&
        v.split("/").every((x) => Number(x) > 0);
    else if (["objectPosition", "backgroundPosition"].includes(key))
      valid =
        typeof v === "string" &&
        /^\d{1,3}(?:\.\d+)?% \d{1,3}(?:\.\d+)?%$/.test(v) &&
        v.split(" ").every((x) => parseFloat(x) <= 100);
    else if (key === "backgroundImage") valid = v === "" || safeUrl(v);
    else if (key === "transitionDuration")
      valid = typeof v === "number" && v >= 0 && v <= 10;
    else if (["boxShadow", "textShadow"].includes(key))
      valid =
        v === "none" ||
        (typeof v === "string" &&
          /^(?:-?\d{1,3}(?:\.\d+)?px ){2,3}#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(
            v,
          ));
    ensure(valid, `Unsupported or unsafe style: ${key}.`);
  }
  return styles;
}
export function defaultEffects(animation = "inherit") {
  return {
    animation,
    trigger: "load",
    duration: 0.6,
    delay: 0,
    iterations: 1,
    direction: "normal",
  };
}
export function validateEffects(e) {
  object(e, Object.keys(defaultEffects()), "Effects");
  ensure(
    ANIMATIONS.includes(e.animation) &&
      ["load", "hover", "focus", "active"].includes(e.trigger) &&
      typeof e.duration === "number" &&
      e.duration >= 0.1 &&
      e.duration <= 30 &&
      typeof e.delay === "number" &&
      e.delay >= 0 &&
      e.delay <= 30 &&
      (e.iterations === "infinite" ||
        (Number.isInteger(e.iterations) &&
          e.iterations >= 1 &&
          e.iterations <= 100)) &&
      ["normal", "reverse", "alternate", "alternate-reverse"].includes(
        e.direction,
      ),
    "Invalid effects.",
  );
}
export function validatePresets(presets) {
  object(presets, Object.keys(presets || {}), "Presets");
  const visit = (id, seen = new Set()) => {
    ensure(!seen.has(id), "Preset cycle.");
    const p = presets[id];
    ensure(p, "Missing preset dependency.");
    const next = new Set([...seen, id]);
    if (p.parentId) {
      ensure(
        presets[p.parentId]?.category === p.category,
        "Preset parent category mismatch.",
      );
      visit(p.parentId, next);
    }
  };
  for (const [id, p] of Object.entries(presets)) {
    object(
      p,
      ["id", "name", "category", "parentId", "styles", "states", "variants"],
      "Preset",
    );
    ensure(
      identifier(id) && p.id === id && CATEGORIES.includes(p.category),
      "Invalid preset identity/category.",
    );
    text(p.name, 100, "preset name", false);
    ensure(
      p.parentId === null || identifier(p.parentId),
      "Invalid parent preset.",
    );
    validateStyles(p.styles, p.category);
    object(p.states, STATES, "Preset states");
    Object.values(p.states).forEach((s) => validateStyles(s, p.category));
    object(p.variants, Object.keys(p.variants || {}), "Variants");
    Object.entries(p.variants).forEach(([key, s]) => {
      ensure(identifier(key), "Invalid variant name.");
      validateStyles(s, p.category);
    });
    visit(id);
  }
}
function presetStyles(project, id, state, variant) {
  if (!id) return {};
  const p = project.presets[id];
  if (!p) return {};
  return {
    ...presetStyles(project, p.parentId, state),
    ...p.styles,
    ...(variant ? p.variants[variant] : {}),
    ...(state ? p.states[state] : {}),
  };
}
export const INHERITABLE_STYLES = [
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "textDecoration",
  "whiteSpace",
  "overflowWrap",
];
export function presetCascade(project, id, state = "") {
  const e = project.page.elements[id];
  if (!e) return {};
  const result = e.parentId ? presetCascade(project, e.parentId, state) : {};
  for (const category of CATEGORIES)
    Object.assign(
      result,
      presetStyles(
        project,
        e.presetIds[category],
        state,
        e.presetVariants[category],
      ),
    );
  return result;
}
export function inheritedStyles(project, id, state = "") {
  const e = project.page.elements[id];
  if (!e) return {};
  const parent = e.parentId
    ? resolveStyles(project, e.parentId, state)
    : project.globalStyles;
  return {
    ...Object.fromEntries(
      Object.entries(parent).filter(([key]) =>
        INHERITABLE_STYLES.includes(key),
      ),
    ),
    ...presetCascade(project, id, state),
  };
}
export function resolveStyles(project, id, state = "") {
  const e = project.page.elements[id];
  return {
    ...inheritedStyles(project, id, state),
    ...e.styles.overrides,
    ...(state ? e.styles.states[state] : {}),
  };
}
export function ownStyles(project, id, state = "") {
  const e = project.page.elements[id];
  return {
    ...presetCascade(project, id, state),
    ...e.styles.overrides,
    ...(state ? e.styles.states[state] : {}),
  };
}
export function reactStyles(styles) {
  const out = { ...styles };
  if (out.fontFamily) out.fontFamily = FONTS[out.fontFamily];
  if (out.backgroundImage)
    out.backgroundImage = `url("${out.backgroundImage}")`;
  else delete out.backgroundImage;
  if (out.transitionDuration !== undefined)
    out.transitionDuration = `${out.transitionDuration}s`;
  return out;
}
export function cssDeclarations(styles) {
  return Object.entries(reactStyles(styles))
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${typeof value === "number" && !["fontWeight", "lineHeight", "opacity", "flexGrow", "flexShrink"].includes(key) ? value + "px" : value}`,
    )
    .join(";");
}
