import { test, expect } from "@playwright/test";
const base = "/about";
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/[^/]*sanity\.io\//, (route) =>
    route.fulfill({ json: { result: [] } }),
  );
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test("live canvas, independent profiles, navigation, clipboard fallback and examples", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await page.getByLabel("Accent color").fill("#123456");
  await page
    .getByRole("combobox", { name: "Season", exact: true })
    .selectOption("winter");
  await page.getByLabel("Accent color").fill("#654321");
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Keep this draft");
  await page.getByRole("link", { name: "About Me!", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("Keep this draft");
  await page
    .getByRole("button", { name: "Preview Page Builder examples" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Example template", exact: true })
    .selectOption("portfolio");
  await expect(
    page
      .frameLocator('iframe[title="Themed Page Builder example"]')
      .getByText("Thoughtful work. Lasting impressions."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close examples" }).click();
  await page.getByRole("button", { name: "Close tools" }).click();
  await expect(
    page.getByRole("button", { name: "Theme Studio", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--studio-accent")
        .trim(),
    ),
  ).toBe("#654321");
  await page.reload();
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Season", exact: true })
    .selectOption("spring");
  await expect(page.getByLabel("Accent color")).toHaveValue("#123456");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    }),
  );
  await page.getByRole("button", { name: "Copy CSS variables" }).click();
  await expect(
    page.getByRole("textbox", { name: "Reusable CSS", exact: true }),
  ).toContainText("--studio-accent: #123456;");
});
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 1000],
  [1920, 1080],
  [3840, 2160],
])
  test(`drawer reachability and layout ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page
      .getByRole("button", { name: "Theme Studio", exact: true })
      .click();
    await page.getByRole("button", { name: "Chat", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Retain");
    if (width <= 900)
      await expect(
        page.getByRole("combobox", { name: "Season", exact: true }),
      ).toHaveCount(0);
    await page.getByRole("button", { name: "Styles", exact: true }).click();
    if (width <= 900)
      await expect(
        page.getByRole("textbox", { name: "Message", exact: true }),
      ).toHaveCount(0);
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "My Projects", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Close tools" }).click();
    await expect(
      page.getByRole("button", { name: "Theme Studio", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Open Theme Studio" }).click();
    if (
      (await page
        .getByRole("button", { name: "Styles", exact: true })
        .getAttribute("aria-expanded")) === "false"
    )
      await page.getByRole("button", { name: "Styles", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Season", exact: true }),
    ).toBeVisible();
  });
test("every seasonal and holiday appearance has readable computed canvas tokens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  for (const family of ["seasons", "holidays"]) {
    await page
      .getByRole("combobox", { name: "Theme family", exact: true })
      .selectOption(family);
    const picker = page.getByRole("combobox", {
      name: family === "seasons" ? "Season" : "Holiday",
      exact: true,
    });
    const ids = await picker
      .locator("option")
      .evaluateAll((nodes) => nodes.map((n) => n.value));
    for (const id of ids)
      for (const mode of ["light", "dark"])
        for (const contrast of [false, true]) {
          await picker.selectOption(id);
          await page
            .getByRole("combobox", { name: "Appearance", exact: true })
            .selectOption(mode);
          await page
            .getByLabel("High Contrast", { exact: true })
            .setChecked(contrast);
          const ratio = await page.evaluate(() => {
            const s = getComputedStyle(document.documentElement);
            const lum = (c) => {
              const rgb = [1, 3, 5]
                .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
                .map((v) =>
                  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
                );
              return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
            };
            const a = lum(s.getPropertyValue("--studio-text").trim()),
              b = lum(s.getPropertyValue("--studio-background").trim());
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          });
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
  }
});

test("themed controls and canvas pass an automated accessibility scan", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Season", exact: true })
    .selectOption("winter");
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByRole("button", { name: "Theme Studio", exact: true }).focus();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("curated holiday photos are lazy, credited, persistent and downloadable without inference", async ({
  page,
}) => {
  const requested = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  expect(
    requested.filter((url) => url.includes("/css-studio/images/")),
  ).toHaveLength(0);
  await page
    .getByRole("combobox", { name: "Theme family", exact: true })
    .selectOption("holidays");
  await page
    .getByRole("combobox", { name: "Holiday", exact: true })
    .selectOption("christmas");
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--studio-image"),
      ),
    )
    .toContain("winter-51");
  await page.getByRole("button", { name: "Choose a background photo" }).click();
  const library = page.getByRole("region", {
    name: "Background photo library",
  });
  await expect(
    library.getByRole("button", { name: /^Use photo:/ }),
  ).toHaveCount(3);
  await library
    .getByRole("button", { name: /^Use photo:/ })
    .last()
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--studio-image"),
      ),
    )
    .toContain("winter-53");
  await expect(
    library.getByRole("link", { name: "Original resolution", exact: true }),
  ).toHaveAttribute("href", /^https:/);
  const downloaded = page.waitForEvent("download");
  await library
    .getByRole("button", { name: "Download portable theme" })
    .click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("css-studio-theme.zip");
  await page.reload();
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--studio-image"),
      ),
    )
    .toContain("winter-53");
  expect(
    new Set(requested.filter((url) => url.includes("/css-studio/images/")))
      .size,
  ).toBeLessThanOrEqual(3);
  expect(
    requested.filter((url) =>
      /cloudflare|openai|\/api\/.*(?:chat|generate)/i.test(url),
    ),
  ).toHaveLength(0);
});
test("a broken manually selected photo falls back without erasing its saved profile", async ({
  page,
}) => {
  await page.route(
    "**/css-studio/images/winter/winter-42-aurora.webp",
    (route) => route.fulfill({ status: 404, body: "Missing" }),
  );
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Season", exact: true })
    .selectOption("winter");
  await page.getByRole("button", { name: "Choose a background photo" }).click();
  await page
    .getByRole("searchbox", { name: "Search photos or holidays" })
    .fill("winter-42");
  await page.getByRole("button", { name: /^Use photo:/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--studio-image"),
      ),
    )
    .toContain("winter-01");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("css-studio:preferences")).seasons
          .winter.backgroundId,
    ),
  ).toBe("winter-42");
  await page.getByRole("button", { name: "Copy CSS variables" }).click();
  await expect(
    page.getByRole("textbox", { name: "Reusable CSS", exact: true }),
  ).toContainText("winter-01");
});

test("standalone supplied catalog filters all 248 local assets by season and holiday", async ({
  page,
}) => {
  await page.goto("/css-studio/index.html");
  await expect(page.locator("#result")).toContainText("248 of 248");
  await page.getByRole("button", { name: "Winter", exact: true }).click();
  await expect(page.locator("#result")).toContainText("62 of 248");
  await page.locator("#kind").selectOption("celebration");
  await expect(page.locator("#result")).toContainText("12 of 248");
  await page.locator("#holiday").selectOption("Christmas");
  await expect(page.locator("#result")).toContainText("3 of 248");
  await page
    .getByRole("button", { name: /^Preview / })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#viewer-image")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
});
