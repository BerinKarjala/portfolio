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
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}}));
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

test('themed controls and canvas pass an automated accessibility scan',async({page})=>{
 const {default:AxeBuilder}=await import('@axe-core/playwright');
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Theme Studio',exact:true}).click();
 await page.getByRole('combobox',{name:'Season',exact:true}).selectOption('winter');
 await page.getByRole('button',{name:'Chat',exact:true}).click();
 const results=await new AxeBuilder({page}).analyze();
 expect(results.violations).toEqual([]);
});
