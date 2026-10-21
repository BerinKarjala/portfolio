import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
let pageErrors;
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
});
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

async function boot(page, template = "Blank") {
  await page.route("https://example.com/**", (route) => route.abort());
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Design systems");
  await page
    .getByRole("radio", { name: new RegExp("^" + template + " ") })
    .check();
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Design systems", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
}
const add = (page, name) =>
  page.getByRole("button", { name: "Add " + name, exact: true }).click();
async function field(page, label, value) {
  const node = page.getByLabel(label, { exact: true });
  await node.fill(String(value));
  await node.press("Tab");
}
async function selectText(page, start, end) {
  await page.getByRole("textbox", { name: "Rich text content" }).evaluate(
    (root, { start, end }) => {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      function at(offset) {
        for (const n of nodes) {
          if (offset <= n.textContent.length) return [n, offset];
          offset -= n.textContent.length;
        }
        return [root, root.childNodes.length];
      }
      const range = document.createRange();
      range.setStart(...at(start));
      range.setEnd(...at(end));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    },
    { start, end },
  );
}
async function tab(page, name) {
  await page
    .locator('[aria-label="Inspector views"]')
    .getByRole("button", { name, exact: true })
    .click();
}

test("rich formatting preserves selections across toolbar focus, safe paste, history and reload", async ({
  page,
}) => {
  await boot(page);
  await add(page, "Paragraph");
  await page.getByLabel("Text content", { exact: true }).fill("Hello world");
  await page
    .getByRole("button", { name: "Edit rich text", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Rich text content" });
  await editor.evaluate((root) => {
    root.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    root.querySelector("span").firstChild.data = "Hello world café";
    root.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: "café",
        isComposing: true,
      }),
    );
    root.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "café" }),
    );
  });
  await expect(editor).toHaveText("Hello world café");
  await editor.press("End");
  await editor.pressSequentially("😀");
  await editor.press("Backspace");
  await expect(editor).toHaveText("Hello world café");
  await selectText(page, 6, 11);
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText("world");
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByTestId("canvas-paragraph").locator("strong"),
  ).toHaveText("world");
  await expect(page.getByTestId("canvas-paragraph").locator("em")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Edit rich text", exact: true })
    .click();
  await selectText(page, 6, 11);
  await page
    .getByLabel("Rich text link URL", { exact: true })
    .fill("https://example.com/about");
  await page
    .getByRole("button", { name: "Apply text link", exact: true })
    .click();
  await expect(editor.locator("a")).toHaveText("world");
  await expect(editor.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/about",
  );
  await selectText(page, 0, 5);
  await page
    .getByLabel("Selection weight", { exact: true })
    .selectOption("500");
  await selectText(page, 16, 16);
  await page
    .getByRole("button", { name: "Insert inline icon", exact: true })
    .click();
  await expect(editor.locator("[data-rich-atom] svg")).toHaveCount(1);
  await editor.press("End");
  await editor.press("!");
  await expect(editor).toContainText("!");
  const clipboardText = await editor.evaluate((root) => {
    const data = new DataTransfer();
    const event = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    });
    // Gecko creates its own transfer for constructed ClipboardEvents.
    // Populate the actual event payload in every engine, then assert it below.
    event.clipboardData.setData("text/plain", "<script>literal</script>");
    event.clipboardData.setData("text/html", "<img src=x onerror=alert(1)>");
    root.dispatchEvent(event);
    return event.clipboardData.getData("text/plain");
  });
  expect(clipboardText).toBe("<script>literal</script>");
  await expect(editor).toContainText("<script>literal</script>");
  await expect(editor.locator("img,script")).toHaveCount(0);
  await editor.press("ControlOrMeta+z");
  await expect(editor).toHaveCount(0);
  await expect(page.getByTestId("canvas-paragraph")).not.toContainText(
    "<script>literal</script>",
  );
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open Design systems", exact: true })
    .click();
  await expect(
    page.getByTestId("canvas-paragraph").locator("strong"),
  ).toHaveText("world");
  await expect(
    page.getByTestId("canvas-paragraph").locator("a"),
  ).toHaveAttribute("href", "https://example.com/about");
});

test("forms, tables, galleries, icons and native mobile navigation have visual property controls", async ({
  page,
}) => {
  await boot(page);
  await add(page, "Form");
  await field(page, "Form endpoint (HTTPS)", "https://example.com/send");
  await page.getByLabel("Form method", { exact: true }).selectOption("GET");
  await expect(
    page
      .locator(".pb-root")
      .getByText("GET places personal information in the URL.", {
        exact: false,
      }),
  ).toBeVisible();
  await page
    .getByLabel("New field type", { exact: true })
    .selectOption("select");
  await page
    .getByRole("button", { name: "Add form field", exact: true })
    .click();
  await field(page, "Field 2 label", "Your interest");
  await field(page, "Field 2 options (separate with |)", "Design|Development");
  await expect(
    page.getByTestId("canvas-form").locator("select option"),
  ).toHaveText(["Design", "Development"]);
  await expect(
    page.getByTestId("canvas-form").locator("input").first(),
  ).toBeDisabled();
  await field(page, "Form endpoint (HTTPS)", "http://unsafe.example/send");
  await expect(
    page.getByText("Forms require an HTTPS external endpoint.", {
      exact: true,
    }),
  ).toBeVisible();
  await field(page, "Form endpoint (HTTPS)", "https://example.com/send");
  await add(page, "Table");
  await field(page, "Cell 1, 2", "Studio plan");
  await page
    .getByRole("button", { name: "Add table row", exact: true })
    .click();
  await expect(page.getByTestId("canvas-table").locator("tr")).toHaveCount(4);
  await expect(
    page.getByTestId("canvas-table").locator("th[scope=col]").nth(1),
  ).toHaveText("Studio plan");
  await page
    .getByRole("button", { name: "Delete column 3", exact: true })
    .click();
  await expect(
    page.getByTestId("canvas-table").locator("tr").first().locator("th"),
  ).toHaveCount(2);
  await add(page, "Gallery");
  await field(page, "Gallery image 1 caption", "Original study");
  await expect(
    page.getByTestId("canvas-gallery").locator("figcaption").first(),
  ).toHaveText("Original study");
  await add(page, "Icon");
  await page.getByLabel("Find an icon", { exact: true }).fill("leaf");
  await page
    .getByRole("button", { name: "Use leaf icon", exact: true })
    .click();
  await field(page, "Icon accessible label", "Nature");
  await expect(
    page.getByTestId("canvas-icon").getByRole("img", { name: "Nature" }),
  ).toBeVisible();
  await add(page, "Navigation");
  await add(page, "Link");
  await page.getByLabel("Layout width", { exact: true }).selectOption("390");
  await expect(page.getByTestId("canvas-nav").locator("summary")).toHaveText(
    "Menu",
  );
  await page.getByTestId("canvas-nav").locator("summary").click();
  await expect(page.getByTestId("canvas-nav").locator("a")).toHaveText(
    "Explore more",
  );
});

test("linked components edit through either instance and detach without losing content", async ({
  page,
}) => {
  await boot(page);
  await add(page, "Container");
  await add(page, "Paragraph");
  await page
    .getByRole("navigation", { name: "Selection path" })
    .getByRole("button", { name: /Container$/ })
    .click();
  await page.getByLabel("Component name", { exact: true }).fill("Callout");
  await page
    .getByRole("button", { name: "Make reusable component", exact: true })
    .click();
  await page.getByRole("button", { name: "Reusable", exact: true }).click();
  await page
    .getByRole("button", { name: "Insert Callout", exact: true })
    .click();
  await expect(page.getByTestId("canvas-container")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Edit master", exact: true })
    .last()
    .click();
  await page.getByTestId("canvas-paragraph").last().click();
  await page
    .getByLabel("Text content", { exact: true })
    .fill("Updated through the second instance");
  await expect(page.getByTestId("canvas-paragraph").first()).toContainText(
    "Updated through the second instance",
  );
  await expect(page.getByTestId("canvas-paragraph").last()).toContainText(
    "Updated through the second instance",
  );
  await page
    .getByRole("button", { name: "Exit master editing", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Text content", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Detach component", exact: true })
    .last()
    .click();
  await page.getByTestId("canvas-paragraph").last().click();
  await page
    .getByLabel("Text content", { exact: true })
    .fill("Independent content");
  await expect(page.getByTestId("canvas-paragraph").first()).toContainText(
    "Updated through the second instance",
  );
  await expect(page.getByTestId("canvas-paragraph").last()).toContainText(
    "Independent content",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("canvas-paragraph").last()).toContainText(
    "Updated through the second instance",
  );
});

test("autosave completion preserves an in-progress effect-control click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page);
  await add(page, "Paragraph");
  await tab(page, "Effects");
  await page.getByLabel("Animation", { exact: true }).selectOption("fade");
  const saved = page.getByRole("status", { name: "Save status" });
  await expect(saved).toHaveText("Saved in this browser");
  await field(page, "Animation repeats (number or infinite)", "infinite");
  const pause = page.getByRole("button", { name: "Pause effects", exact: true });
  await pause.scrollIntoViewIfNeeded();
  await expect(saved).toHaveText("Unsaved changes");
  const box = await pause.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // A normal save must not move the intended control between press and release.
  await expect(saved).toHaveText("Saved in this browser");
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Resume effects", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("canvas-paragraph")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
});

test("preset removal preserves effective styling; states, effects and responsive visibility work", async ({
  page,
}) => {
  await boot(page);
  await add(page, "Paragraph");
  await tab(page, "Style");
  await page.locator(".pb-computed-box > summary").click();
  await expect(page.locator(".pb-box-size")).toHaveText(/CSS size: \d/);
  await page
    .locator(".pb-style-group > summary")
    .filter({ hasText: /^Typography$/ })
    .click();
  await field(page, "Color", "rgba(20, 80, 40, 0.8)");
  await field(page, "Font size", "1.25rem");
  await page.locator(".pb-preset-manager > summary").click();
  await page.getByLabel("New preset name", { exact: true }).fill("Green type");
  await page
    .getByRole("button", { name: "Create preset from selection", exact: true })
    .click();
  await page
    .getByLabel("Apply preset", { exact: true })
    .selectOption({ label: "Green type" });
  await page
    .getByRole("button", { name: "Reset color override", exact: true })
    .click();
  const node = page.getByTestId("canvas-paragraph");
  const before = await node.evaluate((e) => getComputedStyle(e).color);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", {
      name: "Remove preset and preserve appearance",
      exact: true,
    })
    .click();
  await expect
    .poll(() => node.evaluate((e) => getComputedStyle(e).color))
    .toBe(before);
  await page.getByLabel("Style state", { exact: true }).selectOption("hover");
  await field(page, "Color", "#ab1234");
  await node.hover();
  await expect
    .poll(() => node.evaluate((e) => getComputedStyle(e).color))
    .toBe("rgb(171, 18, 52)");
  await tab(page, "Effects");
  await page.getByLabel("Animation", { exact: true }).selectOption("fade");
  await expect
    .poll(() => node.evaluate((e) => getComputedStyle(e).animationName))
    .toMatch(/^pb-fade-/);
  await page
    .getByRole("button", { name: "Pause effects", exact: true })
    .click();
  await expect
    .poll(() => node.evaluate((e) => getComputedStyle(e).animationPlayState))
    .toBe("paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => node.evaluate((e) => getComputedStyle(e).animationName))
    .toBe("none");
  await tab(page, "Accessibility");
  await page.getByLabel("Show on mobile", { exact: true }).uncheck();
  await page.getByLabel("Layout width", { exact: true }).selectOption("390");
  await expect(node).toHaveCount(0);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect(
    page.getByRole("treeitem", { name: "Paragraph", exact: true }),
  ).toBeVisible();
});

test("media settings, trusted embeds and external paste suggestions stay constrained", async ({
  page,
}) => {
  await boot(page);
  await add(page, "Video");
  await page.getByLabel("Autoplay (requires muted)", { exact: true }).check();
  await expect(page.getByLabel("Muted", { exact: true })).toBeChecked();
  await add(page, "Embed");
  await field(page, "Trusted embed URL", "https://evil.example/embed");
  await expect(
    page.getByText("Use an approved YouTube, Vimeo or Google Maps embed URL.", {
      exact: true,
    }),
  ).toBeVisible();
  await field(
    page,
    "Trusted embed URL",
    "https://player.vimeo.com/video/76979871",
  );
  await page
    .getByLabel("Embed provider", { exact: true })
    .selectOption("vimeo");
  await page.locator(".pb-external-paste > summary").click();
  await page
    .getByLabel("Paste text or an HTTPS URL", { exact: true })
    .fill("https://example.com/photo.jpg");
  await page
    .getByRole("button", { name: "Insert as image", exact: true })
    .click();
  await expect(page.getByTestId("canvas-image")).toHaveCount(1);
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText(
    "Saved in this browser",
  );
  const stored = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith("page-builder:project:"))
      .map((k) => JSON.parse(localStorage.getItem(k))),
  );
  const project = stored[0];
  expect(project.schemaVersion).toBe(3);
  expect(
    Object.values(project.page.elements).find((e) => e.type === "embed").props
      .provider,
  ).toBe("vimeo");
  expect(
    Object.values(project.page.elements).find((e) => e.type === "video").props
      .muted,
  ).toBe(true);
});

test("editor controls have accessible names and pass the scoped WCAG scan on desktop and mobile", async ({
  page,
}, testInfo) => {
  await boot(page);
  await add(page, "Paragraph");
  await page
    .getByRole("button", { name: "Edit rich text", exact: true })
    .click();
  const results = await new AxeBuilder({ page })
    .include(".pb-root")
    .exclude(".pb-canvas-document")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach("desktop-editor-accessibility", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  expect(results.violations).toEqual([]);
  const rich = await new AxeBuilder({ page })
    .include(".pb-rich-editor")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(rich.violations).toEqual([]);
  const desktopShot = testInfo.outputPath("desktop-rich-editor.png");
  await page.screenshot({ path: desktopShot });
  await testInfo.attach("desktop-rich-editor", {
    path: desktopShot,
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Done editing text", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  const mobile = await new AxeBuilder({ page })
    .include(".pb-root")
    .exclude(".pb-canvas-document")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach("mobile-editor-accessibility", {
    body: JSON.stringify(mobile.violations, null, 2),
    contentType: "application/json",
  });
  expect(mobile.violations).toEqual([]);
  const mobileShot = testInfo.outputPath("mobile-inspector.png");
  await page.screenshot({ path: mobileShot });
  await testInfo.attach("mobile-inspector", {
    path: mobileShot,
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Edit rich text", exact: true })
    .click();
  const mobileText = await new AxeBuilder({ page })
    .include(".pb-root")
    .exclude(".pb-canvas-document")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(mobileText.violations).toEqual([]);
});

test("all six starter designs render at mobile width with native navigation", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90000);
  for (const template of [
    "Portfolio",
    "Landing",
    "Business",
    "Blog",
    "Contact",
    "Gallery",
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1400 },
      baseURL: "http://127.0.0.1:4173",
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    try {
      await boot(page, template);
      await page
        .getByLabel("Layout width", { exact: true })
        .selectOption("390");
      await page.getByRole("button", { name: "100%", exact: true }).click();
      await expect(page.locator(".pb-native-nav summary")).toHaveText("Menu");
      const hero = page.getByTestId("canvas-container").first();
      const path = testInfo.outputPath(
        template.toLowerCase() + "-mobile-hero.png",
      );
      await hero.screenshot({ path });
      await testInfo.attach(template + " mobile hero", {
        path,
        contentType: "image/png",
      });
    } finally {
      await page.close();
    }
  }
});
