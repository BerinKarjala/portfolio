import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProject } from "../src/features/page-builder/domain/project";
import { applyCommand } from "../src/features/page-builder/domain/structure";

async function boot(
  page,
  type = "image",
  { linked = false, nested = false } = {},
) {
  let initial = createProject({ name: "Wizard browser checks" }),
    parentId;
  if (nested) {
    const parent = applyCommand(initial, {
      type: "ADD",
      component: "container",
    });
    initial = parent.project;
    parentId = parent.selection[0];
  }
  let result = applyCommand(initial, {
    type: "ADD",
    component: type,
    parentId,
  });
  if (linked)
    result = applyCommand(result.project, {
      type: "MASTER_CREATE",
      ids: result.selection,
      name: "Shared card",
    });
  const project = result.project,
    id = result.selection[0];
  await page.addInitScript((project) => {
    if (window === window.top && !localStorage.getItem("wizard-seeded")) {
      localStorage.setItem(
        `page-builder:project:${project.projectId}`,
        JSON.stringify(project),
      );
      localStorage.setItem("wizard-seeded", "true");
    }
  }, project);
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open Wizard browser checks", exact: true })
    .click();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  return { project, id };
}
async function open(page, type = "image") {
  await page
    .getByRole("button", { name: "Configure an element", exact: true })
    .click();
  await page.getByTestId(`canvas-${type}`).click();
  const dialog = page.getByRole("dialog", {
    name: new RegExp(`Configure ${type}`, "i"),
  });
  await expect(dialog).toBeVisible();
  return dialog;
}
const next = (dialog) =>
  dialog.getByRole("button", { name: "Next: apply step" }).click();
async function noHorizontalOverflow(dialog) {
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  expect(
    await dialog
      .locator(".pb-element-wizard")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
}
test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("completed steps save immediately, click flushes the active field, and Undo reverses one step", async ({
  page,
}) => {
  await boot(page);
  const dialog = await open(page);
  await dialog
    .getByLabel("Image description", { exact: true })
    .fill("Applied from an active input");
  await next(dialog);
  await dialog.getByLabel("Width", { exact: true }).fill("75%");
  await next(dialog);
  await dialog.getByRole("button", { name: "Close wizard" }).click();
  const node = page.getByTestId("canvas-image");
  await expect(
    node.getByRole("img", {
      name: "Applied from an active input",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(node).toHaveCSS("width", /[0-9]+px/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await node.evaluate((el) => el.style.width)).toBe("");
  await expect(
    node.getByRole("img", {
      name: "Applied from an active input",
      exact: true,
    }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    node.getByRole("img", { name: "Describe your image", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open Wizard browser checks", exact: true })
    .click();
  await expect(
    page
      .getByTestId("canvas-image")
      .getByRole("img", { name: "Applied from an active input", exact: true }),
  ).toHaveCount(1);
});

test("invalid fields retain input and focus the relevant setting", async ({
  page,
}) => {
  await boot(page);
  const dialog = await open(page);
  const url = dialog.getByLabel("Image URL", { exact: true });
  await url.fill("javascript:alert(1)");
  await next(dialog);
  await expect(dialog.getByRole("alert")).toContainText(/unsafe|url/i);
  await expect(url).toHaveValue("javascript:alert(1)");
  await expect(url).toBeFocused();
  await url.fill("https://example.com/image.jpg");
  await next(dialog);
  await dialog.getByText("Advanced layout", { exact: true }).click();
  const width = dialog.getByLabel("Max width", { exact: true });
  await width.fill("invalid-length");
  await dialog.getByText("Advanced layout", { exact: true }).click();
  await next(dialog);
  await expect(width).toBeVisible();
  await expect(width).toBeFocused();
});

test("phone preview preserves drafts, traps focus, and fits a short keyboard viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await boot(page);
  const dialog = await open(page);
  await dialog
    .getByLabel("Image description", { exact: true })
    .fill("Phone draft");
  await dialog.getByRole("button", { name: "Preview", exact: true }).click();
  const frame = dialog.getByTitle("Element configuration preview");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("sandbox", "");
  await frame.click();
  await expect(
    dialog.getByRole("group", { name: "Read-only page preview" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Return to settings" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Return to settings" }).click();
  await expect(
    dialog.getByLabel("Image description", { exact: true }),
  ).toHaveValue("Phone draft");
  await noHorizontalOverflow(dialog);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".pb-element-wizard-dialog")
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 420 });
  await noHorizontalOverflow(dialog);
  await dialog
    .getByRole("button", { name: "Next: apply step" })
    .scrollIntoViewIfNeeded();
  await expect(
    dialog.getByRole("button", { name: "Next: apply step" }),
  ).toBeInViewport();
  await dialog.getByRole("button", { name: "Next: apply step" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close wizard" }),
  ).toBeFocused();
  await testInfo.attach("wizard-phone", {
    body: await page.screenshot({
      path: testInfo.outputPath("wizard-phone.png"),
    }),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("canvas-image")).toBeFocused();
});

test("large monitors and TV browsers show fields beside a safe preview with visible focus", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  await boot(page, "form");
  const dialog = await open(page, "form");
  const fields = await dialog
    .getByRole("region", { name: "Element settings" })
    .boundingBox();
  const preview = await dialog
    .getByRole("region", { name: "Contextual preview" })
    .boundingBox();
  expect(fields.x + fields.width).toBeLessThanOrEqual(preview.x + 1);
  await noHorizontalOverflow(dialog);
  const frame = dialog.getByTitle("Element configuration preview");
  const policy = frame
    .contentFrame()
    .locator('meta[http-equiv="Content-Security-Policy"]');
  await expect(policy).toHaveAttribute("content", /script-src 'none'/);
  await expect(policy).toHaveAttribute("content", /form-action 'none'/);
  await expect(frame.contentFrame().locator("input").first()).toBeDisabled();
  await dialog.getByRole("button", { name: "Close wizard" }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement.closest(".pb-element-wizard-dialog"),
    ),
  ).toBe(true);
  expect(
    (
      await dialog
        .getByRole("button", { name: "Next: apply step" })
        .boundingBox()
    ).height,
  ).toBeGreaterThanOrEqual(44);
  await testInfo.attach("wizard-tv", {
    body: await page.screenshot({ path: testInfo.outputPath("wizard-tv.png") }),
    contentType: "image/png",
  });
});

test("rich text edits use local Undo and preserve formatting until the step completes", async ({
  page,
}) => {
  await boot(page, "heading");
  const dialog = await open(page, "heading");
  const content = dialog.getByRole("textbox", { name: "Rich text content" });
  await content.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" with a wizard");
  await expect(page.getByTestId("canvas-heading")).not.toContainText(
    "with a wizard",
  );
  await page.keyboard.press("ControlOrMeta+z");
  await expect(content).not.toContainText("with a wizard");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(content).toContainText("with a wizard");
  await next(dialog);
  await dialog.getByRole("button", { name: "Close wizard" }).click();
  await expect(page.getByTestId("canvas-heading")).toContainText(
    "with a wizard",
  );
});

test("linked-copy local overrides survive Undo, Redo and reload without changing the master", async ({
  page,
}) => {
  const { project, id } = await boot(page, "card", { linked: true });
  const dialog = await open(page, "card");
  await expect(dialog.getByText(/local overrides only/)).toBeVisible();
  await dialog.getByLabel("Width", { exact: true }).fill("24rem");
  await next(dialog);
  await dialog.getByRole("button", { name: "Close wizard" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(
    await page.getByTestId("canvas-card").evaluate((node) => node.style.width),
  ).toBe("");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  const saved = await page.evaluate(
    (projectId) =>
      JSON.parse(localStorage.getItem(`page-builder:project:${projectId}`)),
    project.projectId,
  );
  expect(saved.masters).toEqual(project.masters);
  expect(saved.page.elements[id].instance).toEqual(
    project.page.elements[id].instance,
  );
  expect(saved.page.elements[id].styles.overrides.width).toBe("24rem");
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open Wizard browser checks", exact: true })
    .click();
  const reopened = await open(page, "card");
  await expect(reopened.getByLabel("Width", { exact: true })).toHaveValue(
    "24rem",
  );
});

test("keyboard and touch choose the innermost nested target without starting a gesture", async ({
  browser,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Touch emulation uses Chromium; keyboard flows run in the shared matrix.",
  );
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await boot(page, "heading", { nested: true });
    await page
      .getByRole("button", { name: "Configure an element", exact: true })
      .tap();
    await page.getByTestId("canvas-heading").tap();
    const dialog = page.getByRole("dialog", {
      name: "Configure Heading",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(
      page.locator(".pb-drag-overlay, [data-rich-editing='true']"),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Close wizard" }).tap();
    await page
      .getByRole("button", { name: "Configure an element", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("canvas-heading").focus();
    await page.keyboard.press("Space");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("dialog", { name: /Configure/ })).toHaveCount(
      1,
    );
  } finally {
    await context.close();
  }
});

test("viewport reflow retains pending settings and Advanced disclosure across phone and wide layouts", async ({
  page,
}) => {
  await boot(page);
  const dialog = await open(page);
  await dialog
    .getByLabel("Image description", { exact: true })
    .fill("Retained while resizing");
  await dialog.getByText("Advanced content", { exact: true }).click();
  await dialog
    .getByLabel("Load image with high priority", { exact: true })
    .check();
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [768, 1024],
    [1008, 800],
    [1440, 900],
    [1920, 1080],
    [3840, 2160],
  ]) {
    await page.setViewportSize({ width, height });
    await noHorizontalOverflow(dialog);
    await expect(
      dialog.getByLabel("Image description", { exact: true }),
    ).toHaveValue("Retained while resizing");
    await expect(
      dialog.getByLabel("Load image with high priority", { exact: true }),
    ).toBeChecked();
    await expect(
      dialog.getByLabel("Load image with high priority", { exact: true }),
    ).toBeVisible();
  }
  await dialog.getByLabel("Image description", { exact: true }).press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("long contextual previews can scroll without activating page actions", async ({
  page,
}) => {
  await boot(page);
  const dialog = await open(page);
  await next(dialog);
  await dialog.getByLabel("Height", { exact: true }).fill("1500px");
  await dialog.getByLabel("Height", { exact: true }).press("Tab");
  const frame = dialog.getByTitle("Element configuration preview");
  await frame.hover();
  await page.mouse.wheel(0, 400);
  await expect
    .poll(() =>
      frame
        .contentFrame()
        .locator("body")
        .evaluate((body) => body.ownerDocument.defaultView.scrollY),
    )
    .toBeGreaterThan(0);
  await frame.click();
  await expect(
    dialog.getByRole("group", { name: "Read-only page preview" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("picker hover keeps instructions and canvas targets stationary on phones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await boot(page, "paragraph");
  await page
    .getByRole("button", { name: "Configure an element", exact: true })
    .click();
  const target = page.getByTestId("canvas-paragraph");
  await target.scrollIntoViewIfNeeded();
  const message = page.locator(".pb-wizard-picker-message");
  const before = await message.boundingBox();
  await target.hover();
  await expect(target).toHaveAttribute("data-wizard-target", "true");
  expect((await message.boundingBox()).height).toBeCloseTo(before.height, 1);
  await target.click();
  await expect(
    page.getByRole("dialog", { name: "Configure Paragraph" }),
  ).toBeVisible();
});
