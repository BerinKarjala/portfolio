import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProject } from "../src/features/page-builder/domain/project";
import { compileProject } from "../src/features/page-builder/exporters/compiler";
import { applyCommand } from "../src/features/page-builder/domain/structure";

async function launch(page) {
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
}
test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("optional guide supports keyboard, saved completion, restart and mobile accessibility", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await launch(page);
  await page.getByRole("button", { name: "Start quick guide" }).focus();
  await page.keyboard.press("Enter");
  const guide = page.getByRole("dialog", { name: "Page Builder quick guide" });
  await expect(guide).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include(":root > body > dialog:last-of-type")
        .analyze()
    ).violations,
  ).toEqual([]);
  await testInfo.attach("mobile-quick-guide", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  for (let i = 0; i < 4; i++)
    await guide.getByRole("button", { name: "Next step" }).click();
  await guide.getByRole("button", { name: "Finish guide" }).click();
  await expect(
    page.getByRole("button", { name: "Start quick guide" }),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await expect(
    page.getByRole("button", { name: "Start quick guide" }),
  ).toHaveCount(0);
  const restart = page.getByRole("button", {
    name: "Quick guide",
    exact: true,
  });
  await restart.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Page Builder", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(guide.getByText("Step 1 of 5")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(restart).toBeFocused();
  await expect(
    page.getByRole("dialog", { name: "Page Builder", exact: true }),
  ).toBeVisible();
});

test("template reset confirms, backs up unsaved edits, supports undo and survives reload without changing identity", async ({
  page,
}, testInfo) => {
  const p = createProject({ name: "Reset sample", templateId: "portfolio" });
  await page.addInitScript((p) => {
    if (window === window.top && !localStorage.getItem("release-seed")) {
      localStorage.setItem(
        "page-builder:project:" + p.projectId,
        JSON.stringify(p),
      );
      localStorage.setItem("release-seed", "yes");
    }
  }, p);
  await launch(page);
  await page
    .getByRole("button", { name: "Open Reset sample", exact: true })
    .click();
  await page.getByLabel("Page title", { exact: true }).fill("My changed title");
  await page
    .getByRole("button", { name: "Reset to original template", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Reset to original template",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Cancel reset" }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "My changed title",
  );
  await page
    .getByRole("button", { name: "Reset to original template", exact: true })
    .click();
  await testInfo.attach("template-reset-confirmation", {
    body: await dialog.screenshot(),
    contentType: "image/png",
  });
  await dialog.getByRole("button", { name: "Confirm template reset" }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Reset sample",
  );
  const records = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith("page-builder:project:"))
      .map((k) => JSON.parse(localStorage.getItem(k))),
  );
  expect(records).toHaveLength(2);
  expect(
    records.find((r) => r.projectId !== p.projectId).page.metadata.title,
  ).toBe("My changed title");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "My changed title",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Reset sample",
  );
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open Reset sample", exact: true })
    .click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Reset sample",
  );
  expect(
    await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("page-builder:project:" + id))
          .projectId,
      p.projectId,
    ),
  ).toBe(p.projectId);
});

test("compiled states, sticky layout, reduced motion and failed remote fonts/media stay usable", async ({
  page,
}, testInfo) => {
  let p = createProject({ name: "State coverage" });
  const root = applyCommand(p, { type: "ADD", component: "container" });
  p = root.project;
  const rootId = root.selection[0];
  p.page.elements[rootId].positionMode = "sticky";
  p.page.elements[rootId].layout.overflowX = "auto";
  p.page.elements[rootId].styles.overrides = { top: "0px", padding: "1rem" };
  const added = applyCommand(p, {
    type: "ADD",
    component: "button",
    parentId: rootId,
  });
  p = added.project;
  const id = added.selection[0];
  p.page.elements[id].styles.overrides = {
    fontFamily: "Inter",
    transitionDuration: 0,
    color: "#17251d",
  };
  p.page.elements[id].styles.states.hover = { color: "#ff0000" };
  p.page.elements[id].styles.states.focus = { backgroundColor: "#00ff00" };
  p.page.elements[id].effects.animation = "pulse";
  p.page.elements[id].effects.iterations = "infinite";
  const image = applyCommand(p, { type: "ADD", component: "image" });
  p = image.project;
  p.page.elements[image.selection[0]].props.src =
    "https://example.com/failed.png";
  p.page.elements[image.selection[0]].props.alt = "Unavailable sample";
  const compiled = compileProject(p);
  expect(compiled.errors).toEqual([]);
  const failures = [];
  await page.route("https://fonts.googleapis.com/**", (route) => {
    failures.push("font");
    return route.abort();
  });
  await page.route("https://example.com/**", (route) => {
    failures.push("image");
    return route.abort();
  });
  await page.route("**/__release__/index.html", (route) =>
    route.fulfill({ contentType: "text/html", body: compiled.html }),
  );
  await page.route("**/__release__/styles.css", (route) =>
    route.fulfill({ contentType: "text/css", body: compiled.css }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/__release__/index.html");
  const button = page.locator(`.pb-button-${id}`);
  await expect(button).toHaveCSS("animation-name", "none");
  await expect(page.locator(`.pb-container-${rootId}`)).toHaveCSS(
    "position",
    "sticky",
  );
  await button.hover();
  await expect(button).toHaveCSS("color", "rgb(255, 0, 0)");
  await button.focus();
  await expect(button).toHaveCSS("background-color", "rgb(0, 255, 0)");
  await expect(button).toHaveCSS("font-family", /Inter.*sans-serif/);
  await expect(
    page.getByRole("img", { name: "Unavailable sample" }),
  ).toBeVisible();
  expect(await page.locator("script").count()).toBe(0);
  expect(failures).toContain("font");
  expect(failures).toContain("image");
  await testInfo.attach("reduced-motion-remote-failure", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
});
