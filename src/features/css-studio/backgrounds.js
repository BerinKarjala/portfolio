import { isGeneratedId, generatedPath } from "./imageIds";
import index from "./backgroundIndex.json";
export const BACKGROUNDS = index;
export const BACKGROUND_BY_ID = Object.fromEntries(
  index.map((image) => [image.id, image]),
);
const HOLIDAY_TAGS = {
  "new-year": "New Year",
  "lunar-new-year": "Lunar New Year",
  nowruz: "Nowruz",
  holi: "Holi",
  easter: "Easter",
  "eid-al-fitr": "Eid al-Fitr",
  "eid-al-adha": "Eid al-Adha",
  vesak: "Vesak",
  midsummer: "Midsummer",
  tanabata: "Tanabata",
  diwali: "Diwali",
  "dia-de-muertos": "Día de Muertos",
  "mid-autumn": "Mid-Autumn Festival",
  halloween: "Halloween",
  hanukkah: "Hanukkah",
  christmas: "Christmas",
};
export function backgroundChoices(preferences) {
  return BACKGROUNDS.filter((image) =>
    preferences.family === "holidays"
      ? image.kind === "celebration" &&
        image.holiday === HOLIDAY_TAGS[preferences.holiday]
      : image.season === preferences.season && image.kind === "wilderness",
  );
}
export function selectedBackground(
  p,
  failed = new Set(),
  generatedImages = {},
) {
  const id = p.family === "holidays" ? p.holiday : p.season;
  const manual = p[p.family][id]?.backgroundId;
  if (manual === "none" || failed.size >= 2) return null;
  const generated = generatedImages[manual];
  if (
    isGeneratedId(manual) &&
    generated?.id === manual &&
    generatedPath(generated) &&
    generated.context?.family === p.family &&
    generated.context?.id === id &&
    !failed.has(manual)
  )
    return {
      ...generated,
      kind: "generated",
      title: "Generated background",
      relativePath: generatedPath(generated),
    };
  if (manual && Object.hasOwn(BACKGROUND_BY_ID, manual) && !failed.has(manual))
    return BACKGROUND_BY_ID[manual];
  return backgroundChoices(p).find((image) => !failed.has(image.id)) || null;
}
export function backgroundUrl(image, base = "/css-studio/") {
  if (!image) return null;
  if (image.kind === "generated") {
    const localBlob = /^blob:[^"\\\s]+$/.test(image.displayUrl || "");
    const inlineRaster =
      image.displayUrl?.startsWith(`data:${image.mime};base64,`) &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(
        image.displayUrl,
      );
    return base === "/css-studio/" && (localBlob || inlineRaster)
      ? image.displayUrl
      : base + generatedPath(image);
  }
  return base + image.relativePath;
}
