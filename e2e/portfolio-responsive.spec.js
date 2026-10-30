import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const screens = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];
const routes = [
  ["/", "Berin Karjala"],
  ["/project", "My Projects"],
  ["/about", "About"],
  ["/projects/SudokuSolver", "Solve Sudoku puzzles with clarity."],
  ["/projects/Minesweeper", "Minesweeper"],
  ["/projects/page-builder", "A space to build your next idea."],
  ["/missing-page", "404"],
];

test.beforeEach(async ({ page }) => {
  // Deterministic CMS responses keep layout checks independent of live content.
  await page.route("**/*sanity.io/**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("query") || "";
    const result = query.includes('"project"')
      ? [
          { name: "Sudoku Solver", link: "/projects/SudokuSolver" },
          { name: "Minesweeper", link: "/projects/Minesweeper" },
        ]
      : null;
    return route.fulfill({ json: { result } });
  });
});

for (const viewport of screens) {
  test(`portfolio routes fit ${viewport.width}px with reachable navigation`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    for (const [path, heading] of routes) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading, exact: true }))
        .toBeVisible();
      const nav = page.getByRole("navigation", { name: "Primary" });
      await expect(nav.getByRole("link")).toHaveCount(3);
      const geometry = await nav.getByRole("link").evaluateAll((links) => links.map((link) => {
        const { x, y, width, height } = link.getBoundingClientRect();
        return { label: link.getAttribute("aria-label") || link.textContent, x, y, width, height };
      }));
      for (const link of geometry) {
        expect(link.width, `${path}: ${link.label} hit width`).toBeGreaterThanOrEqual(44);
        expect(link.height, `${path}: ${link.label} hit height`).toBeGreaterThanOrEqual(44);
        expect(link.x).toBeGreaterThanOrEqual(0);
        expect(link.x + link.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(link.y + link.height).toBeLessThanOrEqual(viewport.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path)
        .toBeLessThanOrEqual(viewport.width + 1);
      if (path === "/project" || path === "/") {
        await testInfo.attach(`${path === "/" ? "landing" : "projects"}-${viewport.width}`, {
          // Keep native layout density; encode evidence at the CSS viewport size.
          body: await page.screenshot({ scale: "css" }), contentType: "image/png",
        });
      }
    }
    const accessibility = await new AxeBuilder({ page }).include("header").analyze();
    expect(accessibility.violations).toEqual([]);
  });
}

for (const viewport of [screens[1], screens[5]]) {
  test(`directional and Tab navigation work at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    const home = nav.getByRole("link", { name: "Berin Karjala" });
    const studio = nav.getByRole("button", { name: "Theme Studio" });
    const projects = nav.getByRole("link", { name: "Projects", exact: true });
    const about = nav.getByRole("link", { name: "About Me!" });
    const lastLink = about;
    await home.focus();
    await page.keyboard.press("ArrowRight");
    await expect(projects).toBeFocused();
    const focus = await projects.evaluate((link) => {
      const style = getComputedStyle(link);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(focus.style).toBe("solid");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/project$/);
    await expect(page.getByRole("heading", { name: "My Projects" })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(about).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible();
    await page.keyboard.press("Home");
    await expect(home).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(lastLink).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(home).toBeFocused();
    await page.keyboard.press("End");
    await expect(lastLink).toBeFocused();
    await page.keyboard.press("Home");
    await page.keyboard.press("Tab");
    await expect(studio).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(projects).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(studio).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(home).toBeFocused();
  });
}

test("4K text and content grow together and scaling stays bounded", async ({ page }) => {
  const measure = async (width, height) => {
    await page.setViewportSize({ width, height });
    return page.evaluate(() => ({
      text: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
      content: document.querySelector("main section > div").getBoundingClientRect().width,
    }));
  };
  await page.goto("/project");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const desktop = await measure(1440, 900);
  const television = await measure(3840, 2160);
  expect(television.text).toBeGreaterThanOrEqual(desktop.text * 1.5);
  expect(television.content).toBeGreaterThanOrEqual(desktop.content * 1.5);
  const larger = await measure(5120, 2880);
  expect(larger.text).toBe(television.text);
  expect(larger.content).toBe(television.content);
});

test("4K Page Builder keeps its full-screen editor and text-field keyboard behavior", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.goto("/projects/page-builder");
  const launcher = page.getByRole("button", { name: "Open Page Builder full screen" });
  await launcher.focus();
  await page.keyboard.press("Enter");
  const workspace = page.getByRole("dialog", { name: "Page Builder", exact: true });
  await expect(workspace).toBeVisible();
  expect(await workspace.boundingBox()).toMatchObject({ x: 0, y: 0, width: 3840, height: 2160 });
  await page.getByRole("button", { name: "New project" }).click();
  const create = page.getByRole("dialog", { name: "Create a project", exact: true });
  await create.getByLabel("Project name", { exact: true }).fill("Wide display");
  await create.getByRole("radio", { name: /^Blank / }).check();
  await create.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Wide display", exact: true })).toBeVisible();
  const title = page.getByLabel("Page title", { exact: true });
  await title.fill("Wide screen editing");
  await title.press("Home");
  await title.press("ArrowRight");
  await expect(title).toBeFocused();
  expect(await title.evaluate((input) => input.selectionStart)).toBe(1);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Saved in this browser");
  const width = await workspace.evaluate((dialog) => ({ scroll: dialog.scrollWidth, client: dialog.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
  await testInfo.attach("workspace-3840", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "Close Page Builder" }).focus();
  await page.keyboard.press("Enter");
  await expect(workspace).toHaveCount(0);
  await expect(launcher).toBeFocused();
  expect(errors).toEqual([]);
});
