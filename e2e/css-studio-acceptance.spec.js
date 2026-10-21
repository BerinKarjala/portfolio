import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*sanity.io/**", (route) =>
    route.fulfill({ json: { result: [] } }),
  );
  await page.route("**/api/css-studio/**", (route) =>
    route.fulfill({ status: 503, json: { status: "unavailable" } }),
  );
  await page.goto("/project");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function tabTo(page, target) {
  for (let step = 0; step < 90; step++) {
    if (await target.evaluate((element) => element === document.activeElement))
      return;
    await page.keyboard.press("Tab");
  }
  throw Error("The requested control was not reachable with Tab");
}

async function surface(locator, { focus = false } = {}) {
  return locator.evaluate((element, focus) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    function color(value) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    }
    const layers = [];
    let node = focus ? element.parentElement : element;
    let protectedSurface = false;
    while (node) {
      const style = getComputedStyle(node);
      const rgba = color(style.backgroundColor);
      if (style.backgroundImage !== "none") break;
      layers.push(rgba);
      if (rgba[3] === 255) {
        protectedSurface = true;
        break;
      }
      node = node.parentElement;
    }
    let background = [255, 255, 255];
    for (const layer of layers.reverse()) {
      const alpha = layer[3] / 255;
      background = background.map(
        (value, index) => layer[index] * alpha + value * (1 - alpha),
      );
    }
    const style = getComputedStyle(element);
    const foreground = color(focus ? style.outlineColor : style.color);
    const alpha = foreground[3] / 255;
    const text = background.map(
      (value, index) => foreground[index] * alpha + value * (1 - alpha),
    );
    function luminance(rgb) {
      const channels = rgb.map((value) => {
        value /= 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    const a = luminance(text),
      b = luminance(background);
    return {
      protectedSurface,
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      outlineWidth: parseFloat(style.outlineWidth),
      outlineStyle: style.outlineStyle,
    };
  }, focus);
}

async function choosePhoto(page, id) {
  await page.getByRole("button", { name: "Choose a background photo" }).click();
  await page
    .getByRole("combobox", { name: "Photo collection", exact: true })
    .selectOption("all");
  await page
    .getByRole("searchbox", { name: "Search photos or holidays" })
    .fill(id);
  await page
    .getByRole("button", { name: /^Use photo:/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Choose a background photo" }).click();
}

// A bounded crop/surface sample complements the separate complete 80-palette
// token traversal. It does not claim every photo/cultural or physical-device review.
const appearances = [
  ["seasons", "spring", "light", false],
  ["seasons", "summer", "dark", false],
  ["seasons", "fall", "light", true],
  ["seasons", "winter", "dark", true, "winter-42"],
  ["seasons", "winter", "light", false, "winter-14"],
  ["holidays", "christmas", "dark", false],
  ["holidays", "holi", "light", true],
  ["holidays", "diwali", "dark", true],
  ["holidays", "hanukkah", "light", false],
];

for (const width of [390, 1440]) {
  test(`rendered photo surfaces and focus remain readable at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole("button", { name: "Theme Studio", exact: true })
      .click();
    for (const [family, preset, mode, contrast, photo] of appearances) {
      await page
        .getByRole("combobox", { name: "Theme family", exact: true })
        .selectOption(family);
      await page
        .getByRole("combobox", {
          name: family === "seasons" ? "Season" : "Holiday",
          exact: true,
        })
        .selectOption(preset);
      await page
        .getByRole("combobox", { name: "Appearance", exact: true })
        .selectOption(mode);
      await page
        .getByLabel("High Contrast", { exact: true })
        .setChecked(contrast);
      if (photo) await choosePhoto(page, photo);
      await expect(page.locator(".studio-photo-probe")).toBeAttached();
      await expect
        .poll(() =>
          page
            .locator(".studio-photo-probe")
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
      const label = `${preset}/${mode}/${contrast}`;
      for (const target of [
        page.locator("main p").first(),
        page.getByRole("link", { name: "Projects", exact: true }),
        page.getByRole("button", { name: "Open Theme Studio", exact: true }),
        page.getByRole("combobox", { name: "Appearance", exact: true }),
      ]) {
        const result = await surface(target);
        expect(
          result.protectedSurface,
          `${label}: opaque readable surface`,
        ).toBe(true);
        expect(
          result.ratio,
          `${label}: actual foreground/background`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      const launcher = page.getByRole("button", {
        name: "Open Theme Studio",
        exact: true,
      });
      await page.keyboard.press("Tab");
      await launcher.focus();
      const focus = await surface(launcher, { focus: true });
      expect(focus.protectedSurface, label).toBe(true);
      expect(focus.outlineStyle, label).toBe("solid");
      expect(focus.outlineWidth, label).toBeGreaterThanOrEqual(2);
      expect(focus.ratio, `${label}: focus contrast`).toBeGreaterThanOrEqual(3);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width + 1);
      if (photo) {
        await testInfo.attach(`${photo}-${width}`, {
          body: await page.screenshot(),
          contentType: "image/png",
        });
      }
    }
    await page
      .getByRole("combobox", { name: "Appearance", exact: true })
      .selectOption("dark");
    await page.getByLabel("High Contrast", { exact: true }).uncheck();
    await page.goto("/missing-page");
    const returnHome = await surface(
      page.getByRole("link", { name: "Return Home", exact: true }),
    );
    expect(returnHome.protectedSurface).toBe(true);
    expect(
      returnHome.ratio,
      "dark themed link presented as a button",
    ).toBeGreaterThanOrEqual(4.5);
  });
}

test("keyboard tools, examples and page links survive phone-to-desktop resizing", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const moon = page.getByRole("button", { name: "Theme Studio", exact: true });
  await moon.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Enter");
  const season = page.getByRole("combobox", { name: "Season", exact: true });
  await tabTo(page, season);
  await page.keyboard.press("End");
  await expect(season).toHaveValue("winter");
  const chat = page.getByRole("button", { name: "Chat", exact: true });
  await tabTo(page, chat);
  await page.keyboard.press("Space");
  const message = page.getByRole("textbox", { name: "Message", exact: true });
  await tabTo(page, message);
  await page.keyboard.type("Retain this keyboard draft");
  const examples = page.getByRole("button", {
    name: "Preview Page Builder examples",
  });
  await tabTo(page, examples);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Close examples" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("combobox", { name: "Example template", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Close examples" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(examples).toBeFocused();
  for (const width of [320, 390, 1440, 3840]) {
    await page.setViewportSize({ width, height: 900 });
    if (width <= 900) {
      await expect(page.locator(".studio-panel")).toHaveCount(1);
      if ((await chat.getAttribute("aria-expanded")) === "false") {
        await tabTo(page, chat);
        await page.keyboard.press("Enter");
      }
      await expect(message).toHaveValue("Retain this keyboard draft");
    } else {
      if (
        (await page
          .getByRole("button", { name: "Styles", exact: true })
          .getAttribute("aria-expanded")) === "false"
      ) {
        await tabTo(
          page,
          page.getByRole("button", { name: "Styles", exact: true }),
        );
        await page.keyboard.press("Enter");
      }
      await expect(page.locator(".studio-panel")).toHaveCount(2);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  }
  const about = page.getByRole("link", { name: "About Me!", exact: true });
  await tabTo(page, about);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "About", exact: true }),
  ).toBeVisible();
  await expect(message).toHaveValue("Retain this keyboard draft");
  await tabTo(
    page,
    page.getByRole("button", { name: "Close tools", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(moon).toBeFocused();
  await tabTo(page, page.getByRole("link", { name: "Projects", exact: true }));
  await page.keyboard.press("Enter");
  const gallery = page.getByRole("button", {
    name: "Open Theme Studio",
    exact: true,
  });
  await tabTo(page, gallery);
  await page.keyboard.press("Enter");
  await tabTo(
    page,
    page.getByRole("button", { name: "Close tools", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(gallery).toBeFocused();
});

test("enlarged text stays usable and reduced motion is honored in the themed canvas", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  const picker = page.getByRole("combobox", { name: "Season", exact: true });
  await picker.selectOption("winter");
  const normalFont = await picker.evaluate((element) =>
    parseFloat(getComputedStyle(element).fontSize),
  );
  // A user-default text-size proxy, not a claim of native browser zoom coverage.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect
    .soft(
      await picker.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    )
    .toBeGreaterThanOrEqual(normalFont * 1.9);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
  await page
    .getByRole("button", { name: "Preview Page Builder examples" })
    .click();
  const dialog = page.getByRole("dialog");
  expect
    .soft(
      await dialog.evaluate((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    )
    .toBeGreaterThanOrEqual(30);
  const close = page.getByRole("button", { name: "Close examples" });
  await expect(close).toBeVisible();
  const geometry = await dialog.evaluate((element) => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width + 1);
  const closeBounds = await close.boundingBox();
  expect(closeBounds.x + closeBounds.width).toBeLessThanOrEqual(320);
  await testInfo.attach("enlarged-text-320", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await close.click();
  await page.evaluate(() => {
    document.documentElement.style.removeProperty("font-size");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/missing-page");
  const home = page.getByRole("link", { name: "Return Home", exact: true });
  const motion = await home.evaluate((element) => ({
    transition: getComputedStyle(element).transitionDuration,
    attachment: getComputedStyle(document.querySelector(".studio-canvas"))
      .backgroundAttachment,
  }));
  expect(
    motion.transition.split(",").every((value) => parseFloat(value) === 0),
  ).toBe(true);
  expect(motion.attachment).toBe("scroll");
});
