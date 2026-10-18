import { expect, test } from "@playwright/test";

async function boot(page, template = "Blank") {
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Canvas tests");
  await page.getByRole("radio", { name: new RegExp(`^${template} `) }).check();
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Canvas tests", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
}
const add = (page, name) =>
  page.getByRole("button", { name: `Add ${name}`, exact: true }).click();
async function field(page, label, value) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press("Tab");
}
async function dragMouse(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
}
test("mouse palette drag inserts a node and its move handle reparents it without changing identity", async ({
  page,
}, testInfo) => {
  await boot(page);
  await add(page, "Container");
  const container = page.getByTestId("canvas-container");
  const containerId = await container.getAttribute("data-element-id");
  await page
    .getByRole("button", { name: "Drag Heading", exact: true })
    .scrollIntoViewIfNeeded();
  const handle = await page
    .getByRole("button", { name: "Drag Heading", exact: true })
    .boundingBox();
  const target = await container
    .locator(`[data-drop-id="inside:${containerId}"]`)
    .boundingBox();
  await dragMouse(
    page,
    { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
    { x: target.x + target.width / 2, y: target.y + target.height / 2 },
  );
  await expect(
    container.locator(`[data-drop-id="inside:${containerId}"]`),
  ).toHaveAttribute("data-over", "true");
  await page.mouse.up();
  const heading = page.getByTestId("canvas-heading");
  await expect(heading).toBeVisible();
  const headingId = await heading.getAttribute("data-element-id");
  await expect(
    container.locator(`[data-element-id="${headingId}"]`),
  ).toHaveCount(1);
  const move = await heading
    .getByRole("button", { name: "Move Heading", exact: true })
    .boundingBox();
  const root = await page.locator('[data-drop-id="root-end"]').boundingBox();
  await dragMouse(
    page,
    { x: move.x + 8, y: move.y + 8 },
    { x: root.x + root.width / 2, y: root.y + root.height / 2 },
  );
  await page.mouse.up();
  await expect(
    page.locator(
      `[data-container-id="__page_root__"] > [data-element-id="${headingId}"]`,
    ),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    container.locator(`[data-element-id="${headingId}"]`),
  ).toHaveCount(1);
  await testInfo.attach("structured-canvas", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("keyboard sensor drops a palette component and Layers provides keyboard navigation", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: "Drag Heading", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-drop-id="root-end"]')).toHaveAttribute(
    "data-over",
    "true",
  );
  await page.keyboard.press("Space");
  await expect(page.getByTestId("canvas-heading")).toBeVisible();
  await add(page, "Paragraph");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const first = page.getByRole("treeitem", { name: "Heading", exact: true });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Element name", { exact: true })).toHaveValue(
    "Heading",
  );
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Element name", { exact: true })).toHaveValue(
    "Paragraph",
  );
  await page
    .getByRole("button", { name: "Move Paragraph up", exact: true })
    .click();
  await expect(
    page
      .locator('[data-container-id="__page_root__"] > [data-element-id]')
      .first(),
  ).toHaveAttribute("data-type", "paragraph");
});

test("free-form drag and resize use scaled nested content boxes and each gesture is one undo action", async ({
  page,
}, testInfo) => {
  await boot(page);
  await add(page, "Container");
  await add(page, "Heading");
  const node = page.getByTestId("canvas-heading");
  const parent = page
    .getByTestId("canvas-container")
    .locator(".pb-node-children");
  await page.getByRole("button", { name: "Layout", exact: true }).click();
  await page.getByLabel("Placement", { exact: true }).selectOption("absolute");
  await field(page, "X (%)", 10);
  await field(page, "Y (%)", 10);
  await field(page, "WIDTH (%)", 40);
  await field(page, "HEIGHT (%)", 40);
  const original = await node.boundingBox();
  const box = await parent.boundingBox();
  const move = await node
    .getByRole("button", { name: "Move Heading", exact: true })
    .boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.move(move.x + 8, move.y + 8);
  await page.mouse.down();
  await page.mouse.move(move.x + 48, move.y + 28, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  const moved = await node.boundingBox();
  expect(moved.x - original.x).toBeCloseTo(40, 0);
  expect(moved.y - original.y).toBeCloseTo(20, 0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await node.boundingBox()).x)
    .toBeCloseTo(original.x, 0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const resize = await node
    .getByRole("button", { name: "Resize Heading", exact: true })
    .boundingBox();
  const beforeResize = await node.boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.move(resize.x + 8, resize.y + 8);
  await page.mouse.down();
  await page.mouse.move(resize.x + 38, resize.y + 18, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  expect((await node.boundingBox()).width - beforeResize.width).toBeCloseTo(
    30,
    0,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await node.boundingBox()).width).toBeCloseTo(beforeResize.width, 0);
  await testInfo.attach("free-form-canvas", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("groups protect locked descendants; ungroup and clipboard remain atomic", async ({
  page,
}) => {
  await boot(page);
  await add(page, "Heading");
  await page.getByLabel("Insert into", { exact: true }).selectOption("page");
  await add(page, "Paragraph");
  await page.getByTestId("canvas-heading").click({ position: { x: 5, y: 10 } });
  await page
    .getByTestId("canvas-paragraph")
    .click({ position: { x: 5, y: 10 }, modifiers: ["Shift"] });
  await page.getByRole("button", { name: "Group", exact: true }).click();
  await expect(page.getByTestId("canvas-container")).toHaveCount(1);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("button", { name: "Expand Group", exact: true }).click();
  await page.getByRole("button", { name: "Lock Heading", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ungroup", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Unlock Heading", exact: true })
    .click();
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Ungroup", exact: true }).click();
  await expect(page.getByTestId("canvas-container")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("canvas-container")).toHaveCount(1);
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.getByTestId("canvas-heading")).toHaveCount(2);
});

test("four-level nesting is enforced and runtime workspace restores without undo history", async ({
  page,
}) => {
  await boot(page);
  for (let i = 0; i < 4; i++) await add(page, "Container");
  await expect(
    page.getByRole("button", { name: "Add Heading", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const id = await page
    .getByTestId("canvas-container")
    .last()
    .getAttribute("data-element-id");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page
    .getByRole("button", { name: "Open Canvas tests", exact: true })
    .click();
  await expect(page.locator(`[data-element-id="${id}"]`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
});

test("touch long-press drag, cancellation, and two-finger zoom", async ({
  browser,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Real touchscreen gestures use Chromium CDP; desktop keyboard/pointer cases run in every engine.",
  );
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await boot(page);
  await add(page, "Container");
  const cdp = await context.newCDPSession(page);
  const touch = async (type, points) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const handle = await page
    .getByRole("button", { name: "Drag Heading", exact: true })
    .boundingBox();
  const container = page.getByTestId("canvas-container");
  const id = await container.getAttribute("data-element-id");
  const target = await container
    .locator(`[data-drop-id="inside:${id}"]`)
    .boundingBox();
  const a = {
    x: handle.x + handle.width / 2,
    y: handle.y + handle.height / 2,
    id: 1,
  };
  await touch("touchStart", [a]);
  await page.waitForTimeout(320);
  for (let i = 1; i <= 10; i++)
    await touch("touchMove", [
      {
        x: a.x + ((target.x + target.width / 2 - a.x) * i) / 10,
        y: a.y + ((target.y + target.height / 2 - a.y) * i) / 10,
        id: 1,
      },
    ]);
  await touch("touchEnd", []);
  await expect(page.getByTestId("canvas-heading")).toBeVisible();
  const before = await page
    .getByTestId("canvas-heading")
    .getAttribute("data-element-id");
  await touch("touchStart", [a]);
  await page.waitForTimeout(320);
  await touch("touchCancel", []);
  await expect(page.getByTestId("canvas-heading")).toHaveCount(1);
  expect(
    await page.getByTestId("canvas-heading").getAttribute("data-element-id"),
  ).toBe(before);
  const viewport = await page.getByTestId("canvas-scroll").boundingBox();
  const x = viewport.x + viewport.width / 2,
    y = viewport.y + viewport.height - 80;
  const zoom = Number(
    await page.getByLabel("Zoom", { exact: true }).inputValue(),
  );
  await touch("touchStart", [
    { x: x - 40, y, id: 1 },
    { x: x + 40, y, id: 2 },
  ]);
  await touch("touchMove", [
    { x: x - 70, y, id: 1 },
    { x: x + 70, y, id: 2 },
  ]);
  await touch("touchEnd", []);
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Zoom", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(zoom);
  await context.close();
});

test("overlap cycling and layer picker select covered elements; Escape cancels an uncommitted pointer gesture", async ({
  page,
}) => {
  await boot(page);
  for (const [component, name] of [
    ["Heading", "First"],
    ["Paragraph", "Second"],
  ]) {
    await add(page, component);
    await field(page, "Element name", name);
    await page.getByRole("button", { name: "Layout", exact: true }).click();
    await page
      .getByLabel("Placement", { exact: true })
      .selectOption("absolute");
    for (const [label, value] of [
      ["X (%)", 10],
      ["Y (%)", 10],
      ["WIDTH (%)", 35],
      ["HEIGHT (%)", 20],
    ])
      await field(page, label, value);
  }
  const second = page.getByTestId("canvas-paragraph");
  const rect = await second.boundingBox();
  await page.keyboard.down("Alt");
  await page.mouse.click(rect.x + 5, rect.y + 20);
  await page.keyboard.up("Alt");
  await expect(page.getByLabel("Element name", { exact: true })).toHaveValue(
    "First",
  );
  await page.getByRole("button", { name: "Select layer", exact: true }).click();
  const menu = page.getByRole("dialog", {
    name: "Select a layer",
    exact: true,
  });
  await menu.getByRole("button", { name: "Second", exact: true }).click();
  await expect(page.getByLabel("Element name", { exact: true })).toHaveValue(
    "Second",
  );
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page
    .getByRole("button", { name: "Open Canvas tests", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  const before = await second.boundingBox();
  const move = await second
    .getByRole("button", { name: "Move Second", exact: true })
    .boundingBox();
  await page.mouse.move(move.x + 5, move.y + 5);
  await page.mouse.down();
  await page.mouse.move(move.x + 35, move.y + 15, { steps: 6 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Page Builder", exact: true }),
  ).toBeVisible();
  expect((await second.boundingBox()).x).toBeCloseTo(before.x, 0);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await second.focus();
  const viewport = page.getByTestId("canvas-scroll");
  const view = await viewport.boundingBox();
  const initialScroll = await viewport.evaluate((el) => el.scrollTop);
  await page.keyboard.down("Space");
  await page.mouse.move(view.x + 20, view.y + view.height - 30);
  await page.mouse.down();
  await page.mouse.move(view.x + 20, view.y + view.height - 50, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect
    .poll(() => viewport.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(initialScroll);
  await expect(page.getByLabel("Element name", { exact: true })).toHaveValue(
    "Second",
  );
  const beforeZoom = Number(
    await page.getByLabel("Zoom", { exact: true }).inputValue(),
  );
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -80);
  await page.keyboard.up("Control");
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Zoom", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(beforeZoom);
});

test("mobile component insertion opens the inspector drawer and Layers has touch multi-select controls", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page
    .getByRole("button", { name: "Library / Layers", exact: true })
    .click();
  await add(page, "Heading");
  await expect(page.getByLabel("Element name", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Library / Layers", exact: true })
    .click();
  await add(page, "Paragraph");
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Library / Layers", exact: true })
    .click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Select layer Heading", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Select layer Paragraph", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Group", exact: true }),
  ).toBeEnabled();
  await testInfo.attach("mobile-layers-drawer", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("representative structured and grid canvas visual baselines", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "M2 establishes representative Chromium baselines; the full visual matrix is an M5 release gate.",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await boot(page, "Portfolio");
  await field(page, "Custom canvas width", 640);
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await page.addStyleTag({
    content:
      ".pb-canvas-document{font-family:Arial!important}.pb-node-controls,.pb-resize-handle{visibility:hidden!important}",
  });
  const section = page.getByTestId("canvas-container").first();
  await expect(section).toHaveScreenshot("canvas-structured.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
  });
  await section.click({ position: { x: 5, y: 5 } });
  await page.getByRole("button", { name: "Layout", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Layout engine", exact: true })
    .selectOption("grid");
  await expect(section).toHaveScreenshot("canvas-grid.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
  });
});

test("canvas edge resizing updates workspace width without creating a content history action", async ({
  page,
}) => {
  await boot(page);
  const before = Number(
    await page.getByLabel("Custom canvas width", { exact: true }).inputValue(),
  );
  const zoom =
    Number(await page.getByLabel("Zoom", { exact: true }).inputValue()) / 100;
  const handle = page.getByRole("button", {
    name: "Resize canvas width",
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const rect = await handle.boundingBox();
  await page.mouse.move(rect.x + 5, rect.y + 30);
  await page.mouse.down();
  await page.mouse.move(rect.x + 35, rect.y + 30, { steps: 6 });
  await page.mouse.up();
  const after = Number(
    await page.getByLabel("Custom canvas width", { exact: true }).inputValue(),
  );
  expect(after - before).toBeCloseTo(30 / zoom, 0);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
});
