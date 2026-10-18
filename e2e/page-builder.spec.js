import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function launch(page) {
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Page Builder", exact: true }),
  ).toBeVisible();
}
async function create(page, name = "My website", template = "Blank") {
  await page.getByRole("button", { name: "New project" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Create a project",
    exact: true,
  });
  await dialog.getByLabel("Project name", { exact: true }).fill(name);
  await dialog
    .getByRole("radio", { name: new RegExp(`^${template} `) })
    .check();
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("portfolio launch page opens full screen and restores keyboard focus", async ({
  page,
}, testInfo) => {
  await page.goto("/projects/page-builder");
  await expect(
    page.getByRole("heading", { name: "Page Builder Source" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await testInfo.attach("portfolio-project-page", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  const launcher = page.getByRole("button", {
    name: "Open Page Builder full screen",
  });
  await launcher.focus();
  await page.keyboard.press("Enter");
  const box = await page
    .getByRole("dialog", { name: "Page Builder", exact: true })
    .boundingBox();
  expect(box.width).toBe(page.viewportSize().width);
  expect(box.height).toBe(page.viewportSize().height);
  await page.getByRole("button", { name: "Close Page Builder" }).click();
  await expect(launcher).toBeFocused();
});

test("template project survives autosave, reload, and JSON copy restore", async ({
  page,
}, testInfo) => {
  await launch(page);
  await create(page, "Portfolio", "Portfolio");
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Saved portfolio title");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  await page.getByLabel("Layout width").selectOption("390");
  await testInfo.attach("starter-layout", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download project JSON" }).click();
  const download = await downloaded;
  const path = await download.path();
  expect(
    JSON.parse(await readFile(path, "utf8")).project.page.metadata.title,
  ).toBe("Saved portfolio title");
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open Portfolio", exact: true })
    .click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Saved portfolio title",
  );
  await expect(page.getByLabel("Layout width")).toHaveValue("390");
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page
    .getByLabel("Import project or collection JSON")
    .setInputFiles(path);
  const review = page.getByRole("dialog", { name: "Review JSON restore" });
  await expect(review.getByText("Identical saved record")).toBeVisible();
  await review.getByRole("button", { name: "Restore 1 copy" }).click();
  await page.getByRole("button", { name: "Close Restore report" }).click();
  await expect(
    page.getByRole("button", { name: "Open Portfolio (2)", exact: true }),
  ).toBeVisible();
  await testInfo.attach("project-dashboard", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("takeover makes the other tab read-only and a stale tab reloads the saved revision", async ({
  page,
  context,
}) => {
  await launch(page);
  await create(page, "Shared");
  const second = await context.newPage();
  await launch(second);
  await second
    .getByRole("button", { name: "Open Shared", exact: true })
    .click();
  await expect(second.getByLabel("Page title", { exact: true })).toBeDisabled();
  await second.getByRole("button", { name: "Take over editing" }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toBeDisabled();
  await second
    .getByLabel("Page title", { exact: true })
    .fill("Latest owner title");
  await expect(second.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  await page.getByRole("button", { name: "Take over editing" }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Latest owner title",
  );
  await expect(second.getByLabel("Page title", { exact: true })).toBeDisabled();
  // Ownership changes replace the drag context; camera listeners must rebind.
  const zoomBefore = Number(
    await page.getByLabel("Zoom", { exact: true }).inputValue(),
  );
  await page.getByTestId("canvas-scroll").hover({ position: { x: 30, y: 30 } });
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -80);
  await page.keyboard.up("Control");
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Zoom", { exact: true }).inputValue()),
    )
    .toBeGreaterThan(zoomBefore);
  await second.close();
});

test("quota failures preserve saved bytes and provide an unsaved recovery download", async ({
  page,
}) => {
  await launch(page);
  await create(page, "Recoverable");
  const saved = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) =>
      key.startsWith("page-builder:project:"),
    );
    const raw = localStorage.getItem(key);
    window.originalStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("page-builder:project:"))
        throw new DOMException("Storage full", "QuotaExceededError");
      return window.originalStorageWrite.call(this, key, value);
    };
    return { key, raw };
  });
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Unsaved, recoverable title");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Save failed · unsaved changes",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), saved.key),
  ).toBe(saved.raw);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download unsaved JSON" }).click();
  const path = await (await downloaded).path();
  expect(
    JSON.parse(await readFile(path, "utf8")).project.page.metadata.title,
  ).toBe("Unsaved, recoverable title");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Close Page Builder" }).click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "Unsaved, recoverable title",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalStorageWrite;
  });
  await page.getByRole("button", { name: "Retry save now" }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
});

test("mobile dialogs fit the screen and Escape returns to the launch preview", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await launch(page);
  await page.getByRole("button", { name: "New project" }).click();
  const dialog = page.getByRole("dialog", { name: "Create a project" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.width).toBeLessThanOrEqual(390);
  await testInfo.attach("mobile-template-selection", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New project" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open Page Builder full screen" }),
  ).toBeFocused();
});

test("gallery fallback and existing game routes remain available", async ({
  page,
}) => {
  await page.route("**/*sanity.io/**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/project");
  await expect(
    page.getByRole("link", { name: "View project: HTML Page Builder" }),
  ).toHaveAttribute("href", "/projects/page-builder");
  await page.goto("/projects/SudokuSolver");
  await expect(
    page.getByRole("heading", { name: "Solve Sudoku puzzles with clarity." }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Row 1 Column 1", exact: true }),
  ).toBeVisible();
  await page.goto("/projects/Minesweeper");
  await expect(page.locator(".gridX")).toBeVisible();
});
