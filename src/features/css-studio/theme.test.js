import { describe, expect, it } from "vitest";
import {
  initialPreferences,
  updateProfile,
  resolveTheme,
  exportCss,
  decodePreferences,
  resetProfile,
  restoreReset,
  readPreferences,
} from "./theme";
import { moonPhase } from "./moon";
describe("theme profiles AC-03–05, AC-11–13, AC-29, AC-40, AC-44", () => {
  it("preserves Spring, Winter and holiday edits independently through reload and reset/Undo", () => {
    let p = updateProfile(initialPreferences(), { accent: "#123456" });
    p = updateProfile({ ...p, season: "winter" }, { accent: "#654321" });
    p = updateProfile(
      { ...p, family: "holidays", holiday: "diwali" },
      { accent: "#773311" },
    );
    p = updateProfile({ ...p, holiday: "christmas" }, { accent: "#225533" });
    p = decodePreferences(JSON.stringify(p));
    expect(
      resolveTheme({ ...p, family: "seasons", season: "spring" })[
        "--studio-accent"
      ],
    ).toBe("#123456");
    expect(resolveTheme({ ...p, family: "seasons" })["--studio-accent"]).toBe(
      "#654321",
    );
    expect(resolveTheme({ ...p, holiday: "diwali" })["--studio-accent"]).toBe(
      "#773311",
    );
    const reset = resetProfile(p);
    expect(resolveTheme(reset.preferences)["--studio-accent"]).not.toBe(
      "#225533",
    );
    expect(restoreReset(reset.preferences, reset.undo)).toEqual(p);
  });
  it("exports every resolved token exactly and keeps contrast independent", () => {
    for (const season of ["spring", "summer", "fall", "winter"])
      for (const mode of ["light", "dark"])
        for (const contrast of [false, true]) {
          const p = { ...initialPreferences(), season, mode, contrast };
          const tokens = resolveTheme(p);
          for (const [key, value] of Object.entries(tokens))
            expect(exportCss(p)).toContain(`${key}: ${value};`);
          expect(p.season).toBe(season);
          if (contrast)
            expect(tokens["--studio-text"]).toBe(
              mode === "dark" ? "#ffffff" : "#000000",
            );
        }
  });
  it("recovers corrupt preferences, unknown holidays, denied storage and invalid CSS values", () => {
    expect(decodePreferences("{")).toEqual(initialPreferences());
    expect(
      decodePreferences(
        JSON.stringify({
          ...initialPreferences(),
          family: "holidays",
          holiday: "unknown",
        }),
      ).family,
    ).toBe("seasons");
    expect(
      readPreferences({
        getItem() {
          throw Error("denied");
        },
      }).warning,
    ).toBeTruthy();
    const p = updateProfile(initialPreferences(), {
      accent: "url(javascript:alert(1))",
      font: "evil",
      radius: "100px; color:red",
    });
    expect(exportCss(p)).not.toContain("javascript");
    expect(exportCss(p)).not.toContain("evil");
  });
  it("migrates seasonal v1 preferences and retains original appearance and profiles", () => {
    const p = decodePreferences(
      JSON.stringify({
        schemaVersion: 1,
        season: "winter",
        profiles: { winter: { accent: "#123456" } },
        themed: false,
      }),
    );
    expect(p.season).toBe("winter");
    expect(p.themed).toBe(false);
    expect(resolveTheme(p)["--studio-accent"]).toBe("#123456");
  });
});
describe("moon independent reference dates AC-16/27", () => {
  // USNO 2024 primary phases: https://aa.usno.navy.mil/calculated/moon/phases?date=2024-04-01&nump=4&format=p
  it.each([
    ["2024-04-08T18:21:00Z", 0],
    ["2024-04-15T19:13:00Z", 0.25],
    ["2024-04-23T23:49:00Z", 0.5],
    ["2024-05-01T11:27:00Z", 0.75],
  ])("matches %s within 0.04 cycles", (date, expected) => {
    const phase = moonPhase(new Date(date));
    expect(
      Math.min(Math.abs(phase - expected), 1 - Math.abs(phase - expected)),
    ).toBeLessThan(0.04);
  });
  it("orients illuminated side right when waxing and left when waning", () => {
    expect(moonPhase(new Date("2024-04-15T19:13:00Z"))).toBeLessThan(0.5);
    expect(moonPhase(new Date("2024-05-01T11:27:00Z"))).toBeGreaterThan(0.5);
  });
});

it("keeps text and button labels readable after conflicting manual edits AC-03/41", () => {
  const p = updateProfile(initialPreferences(), {
    background: "#000000",
    text: "#000000",
    accent: "#ffff00",
  });
  const t = resolveTheme(p);
  expect(t["--studio-text"]).toBe("#ffffff");
  expect(t["--studio-surface"]).toBe(t["--studio-background"]);
  expect(t["--studio-button-text"]).toBe("#000000");
});

it("retains visible seasonal identity in dark High Contrast mode", () => {
  const accents = ["spring", "summer", "fall", "winter"].map(
    (season) =>
      resolveTheme({
        ...initialPreferences(),
        season,
        mode: "dark",
        contrast: true,
      })["--studio-accent"],
  );
  expect(new Set(accents).size).toBe(4);
});
