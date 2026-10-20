import { expect, it } from "vitest";
import {
  initialPreferences,
  updateProfile,
  decodePreferences,
  resolveTheme,
  exportCss,
} from "./theme";
import {
  backgroundChoices,
  selectedBackground,
  backgroundUrl,
} from "./backgrounds";
it("uses wilderness on weekdays/weekends and holiday tags across seasonal folders, preserving manual choices AC-46", () => {
  const season = initialPreferences();
  expect(selectedBackground(season).kind).toBe("wilderness");
  const holiday = { ...season, family: "holidays", holiday: "christmas" };
  expect(selectedBackground(holiday).season).toBe("winter");
  expect(selectedBackground(holiday).holiday).toBe("Christmas");
  const options = backgroundChoices(holiday);
  expect(options).toHaveLength(3);
  const manual = updateProfile(holiday, { backgroundId: options[2].id });
  expect(selectedBackground(decodePreferences(JSON.stringify(manual))).id).toBe(
    options[2].id,
  );
  expect(
    selectedBackground(updateProfile(season, { backgroundId: "none" })),
  ).toBeNull();
});
it("keeps selected assets isolated by preset and handles failed/unknown references AC-40/49", () => {
  const winter = updateProfile(
    { ...initialPreferences(), season: "winter" },
    { backgroundId: "winter-42" },
  );
  const spring = updateProfile(
    { ...winter, season: "spring" },
    { backgroundId: "spring-02" },
  );
  expect(selectedBackground({ ...spring, season: "winter" }).id).toBe(
    "winter-42",
  );
  expect(selectedBackground(spring).id).toBe("spring-02");
  const recovered = updateProfile(spring, { backgroundId: "../../evil" });
  expect(backgroundUrl(selectedBackground(recovered))).not.toContain("..");
  expect(selectedBackground(winter, new Set(["winter-42"]))?.id).not.toBe(
    "winter-42",
  );
  expect(
    selectedBackground(winter, new Set(["winter-42", "winter-01"])),
  ).toBeNull();
});
it("resolves and exports the same trusted local image with portable package references AC-43/47", () => {
  const p = updateProfile(initialPreferences(), { backgroundId: "spring-02" });
  expect(resolveTheme(p)["--studio-image"]).toBe(
    'url("/css-studio/images/spring/spring-02-woodland.webp")',
  );
  expect(exportCss(p)).toContain(resolveTheme(p)["--studio-image"]);
  expect(exportCss(p, { assetBase: "./css-studio/" })).toContain(
    'url("./css-studio/images/spring/spring-02-woodland.webp")',
  );
});
