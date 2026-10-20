export const STORAGE_KEY = "css-studio:preferences";
export const SEASONS = {
  spring: ["Spring", "#166534"],
  summer: ["Summer", "#075985"],
  fall: ["Fall", "#92400e"],
  winter: ["Winter", "#3730a3"],
};
// HD-02 proposed catalog, adopted as a revisable starting set; manual selection only.
export const HOLIDAYS = {
  "new-year": ["New Year", "#854d0e", "Gregorian New Year"],
  "lunar-new-year": [
    "Lunar New Year",
    "#991b1b",
    "Multiple East and Southeast Asian traditions",
  ],
  nowruz: ["Nowruz", "#166534", "Persian New Year and related traditions"],
  holi: ["Holi", "#9d174d", "Hindu festival of colors"],
  easter: ["Easter", "#6b21a8", "Christian traditions"],
  "eid-al-fitr": [
    "Eid al-Fitr",
    "#065f46",
    "Islamic celebration following Ramadan",
  ],
  "eid-al-adha": ["Eid al-Adha", "#115e59", "Islamic festival of sacrifice"],
  vesak: ["Vesak", "#854d0e", "Buddhist traditions; observances vary"],
  midsummer: ["Midsummer", "#166534", "Northern European traditions"],
  tanabata: ["Tanabata", "#075985", "Japanese star festival"],
  diwali: [
    "Diwali",
    "#9a3412",
    "Festival of lights; multiple South Asian traditions",
  ],
  "dia-de-muertos": [
    "Día de Muertos",
    "#9d174d",
    "Mexican remembrance traditions",
  ],
  "mid-autumn": [
    "Mid-Autumn Festival",
    "#92400e",
    "Multiple East and Southeast Asian traditions",
  ],
  halloween: ["Halloween", "#9a3412", "Contemporary and regional traditions"],
  hanukkah: ["Hanukkah", "#1e40af", "Jewish festival of lights"],
  christmas: ["Christmas", "#991b1b", "Christian and secular traditions"],
};
export const FONTS = {
  system: "system-ui, sans-serif",
  serif: "Georgia, serif",
  mono: "ui-monospace, monospace",
};
export function initialPreferences() {
  return {
    schemaVersion: 2,
    themed: false,
    family: "seasons",
    season: "spring",
    holiday: "new-year",
    mode: "light",
    contrast: false,
    seasons: {},
    holidays: {},
  };
}
const own = (object, key) => Object.hasOwn(object || {}, key);
export function cleanOverrides(value) {
  const safe = {};
  for (const key of ["accent", "background", "text"])
    if (typeof value?.[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key]))
      safe[key] = value[key];
  if (own(FONTS, value?.font)) safe.font = value.font;
  if (["0px", "8px", "20px"].includes(value?.radius))
    safe.radius = value.radius;
  return safe;
}
export function decodePreferences(raw) {
  const base = initialPreferences();
  try {
    const data = JSON.parse(raw);
    if (!data || ![1, 2].includes(data.schemaVersion)) return base;
    const p = {
      ...base,
      themed: data.themed === true,
      family: data.family === "holidays" ? "holidays" : "seasons",
      season: own(SEASONS, data.season) ? data.season : base.season,
      holiday: own(HOLIDAYS, data.holiday) ? data.holiday : base.holiday,
      mode: data.mode === "dark" ? "dark" : "light",
      contrast: data.contrast === true,
    };
    if (data.family === "holidays" && !own(HOLIDAYS, data.holiday))
      p.family = "seasons";
    for (const [family, catalog] of [
      ["seasons", SEASONS],
      ["holidays", HOLIDAYS],
    ]) {
      const source =
        data[family] ||
        (family === "seasons" && data.schemaVersion === 1 ? data.profiles : {});
      for (const key of Object.keys(catalog))
        if (own(source, key)) p[family][key] = cleanOverrides(source[key]);
    }
    return p;
  } catch {
    return base;
  }
}
export function readPreferences(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    let warning = "";
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (![1, 2].includes(d?.schemaVersion))
          warning =
            "Saved settings could not be restored; defaults are available.";
      } catch {
        warning =
          "Saved settings could not be restored; defaults are available.";
      }
    }
    return { preferences: decodePreferences(raw), warning };
  } catch {
    return {
      preferences: initialPreferences(),
      warning:
        "Settings cannot be saved in this browser. You can still edit and copy CSS.",
    };
  }
}
export function profileId(p) {
  return p.family === "holidays" ? p.holiday : p.season;
}
export function updateProfile(p, changes) {
  const id = profileId(p);
  return {
    ...p,
    themed: true,
    [p.family]: {
      ...p[p.family],
      [id]: cleanOverrides({ ...p[p.family][id], ...changes }),
    },
  };
}
export function resetProfile(p) {
  const id = profileId(p);
  const undo = {
    family: p.family,
    id,
    previous: p[p.family][id],
    themed: p.themed,
  };
  const profiles = { ...p[p.family] };
  delete profiles[id];
  return { preferences: { ...p, themed: true, [p.family]: profiles }, undo };
}
export function restoreReset(p, undo) {
  const profiles = { ...p[undo.family] };
  if (undo.previous === undefined) delete profiles[undo.id];
  else profiles[undo.id] = undo.previous;
  return { ...p, themed: undo.themed, [undo.family]: profiles };
}
export function contrastRatio(a, b) {
  const luminance = (color) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const readable = (preferred, background) =>
  contrastRatio(preferred, background) >= 4.5
    ? preferred
    : contrastRatio("#000000", background) >
        contrastRatio("#ffffff", background)
      ? "#000000"
      : "#ffffff";
export function resolveTheme(p) {
  const preset = (p.family === "holidays" ? HOLIDAYS : SEASONS)[profileId(p)];
  const overrides = cleanOverrides(p[p.family][profileId(p)]);
  const dark = p.mode === "dark";
  const accent = p.contrast && dark ? "#ffff00" : overrides.accent || preset[1];
  const background = p.contrast
    ? dark
      ? "#000000"
      : "#ffffff"
    : overrides.background || (dark ? "#111827" : "#f8fafc");
  const text = readable(
    p.contrast
      ? dark
        ? "#ffffff"
        : "#000000"
      : overrides.text || (dark ? "#f8fafc" : "#111827"),
    background,
  );
  return {
    "--studio-accent": accent,
    "--studio-background": background,
    "--studio-surface": background,
    "--studio-text": text,
    "--studio-link": readable(
      p.contrast ? (dark ? "#ffff00" : "#0000aa") : dark ? "#bae6fd" : accent,
      background,
    ),
    "--studio-button-text": readable("#ffffff", accent),
    "--studio-font": FONTS[overrides.font || "system"],
    "--studio-radius": overrides.radius || "8px",
  };
}
export function exportCss(p) {
  return (
    "/* Theme Studio: system fonts; no external font dependencies. */\n:root {\n" +
    Object.entries(resolveTheme(p))
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n") +
    "\n}\n"
  );
}
