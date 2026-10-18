import { readFile } from "node:fs/promises";
import { test, expect, chromium, firefox, webkit } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  createProject,
  documentText,
  validateProject,
} from "../src/features/page-builder/domain/project";
import { applyCommand } from "../src/features/page-builder/domain/structure";
import { resolveStyles } from "../src/features/page-builder/domain/styles";
import { compileProject } from "../src/features/page-builder/exporters/compiler";

const types = { chromium, firefox, webkit };
let errors;
test.beforeEach(({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors).toEqual([]));
async function launch(page) {
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
}
async function seed(page, project) {
  await page.addInitScript((p) => {
    if (window !== window.top || localStorage.getItem("acceptance-seeded"))
      return;
    localStorage.setItem(
      "page-builder:project:" + p.projectId,
      JSON.stringify(p),
    );
    localStorage.setItem("acceptance-seeded", "yes");
  }, project);
}
async function open(page, project) {
  await launch(page);
  await page
    .getByRole("button", { name: "Open " + project.name, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: project.name, exact: true }),
  ).toBeVisible();
}
function fingerprint(p) {
  return {
    metadata: p.page.metadata,
    presets: p.presets,
    masters: p.masters,
    nodes: p.page.rootElementIds.flatMap(function walk(id) {
      const e = p.page.elements[id];
      return [
        {
          type: e.type,
          name: e.name,
          htmlId: e.htmlId,
          props: e.props,
          styles: resolveStyles(p, id),
          linked: !!e.instance,
        },
        ...e.children.flatMap(walk),
      ];
    }),
  };
}
function portableFixture(name) {
  let p = createProject({ name });
  const add = (component, parentId = null) => {
    const result = applyCommand(p, { type: "ADD", component, parentId });
    p = result.project;
    return result.selection[0];
  };
  const card = add("card"),
    heading = add("heading", card),
    paragraph = add("paragraph", card),
    link = add("link", card);
  p.page.elements[heading].htmlId = "portable-heading";
  p.page.elements[heading].props.document = documentText("Portable café 😀");
  p.page.elements[paragraph].props.document = {
    version: 2,
    nodes: [
      {
        type: "text",
        text: "Styled text",
        marks: ["bold"],
        styles: { color: "#123456" },
      },
      {
        type: "link",
        text: "Internal destination",
        href: "#portable-heading",
        marks: [],
        styles: {},
      },
    ],
  };
  p.page.elements[link].props = {
    text: "Go to heading",
    href: "#portable-heading",
  };
  for (const [id, parentId] of [
    ["portable-base", null],
    ["portable-child", "portable-base"],
  ])
    p = applyCommand(p, {
      type: "PRESET_SAVE",
      preset: {
        id,
        name: id,
        parentId,
        category: "Appearance",
        styles: { backgroundColor: "#dceedd" },
        states: {},
        variants: {},
      },
    }).project;
  p = applyCommand(p, {
    type: "PRESET_APPLY",
    ids: [card],
    category: "Appearance",
    presetId: "portable-child",
    variant: "",
  }).project;
  p = applyCommand(p, {
    type: "MASTER_CREATE",
    ids: [card],
    name: "Portable card",
  }).project;
  const masterId = Object.keys(p.masters)[0];
  p = applyCommand(p, { type: "MASTER_INSERT", masterId }).project;
  return validateProject(p);
}

test("JSON downloaded in each other engine restores rich text, links, masters and transitive presets", async ({
  page,
  browserName,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
  const transfers = [];
  for (const sourceName of Object.keys(types).filter(
    (name) => name !== browserName,
  )) {
    const sourceBrowser = await types[sourceName].launch();
    try {
      const source = await sourceBrowser.newPage({
        baseURL,
        acceptDownloads: true,
      });
      source.on("pageerror", (e) => errors.push(e.message));
      const p = portableFixture(sourceName + " to " + browserName);
      await seed(source, p);
      await open(source, p);
      await source
        .getByLabel("Page title", { exact: true })
        .fill("Saved by " + sourceName);
      await expect(
        source.getByRole("status", { name: "Save status" }),
      ).toHaveText("Saved in this browser");
      const promise = source.waitForEvent("download");
      await source
        .getByRole("button", { name: "Download project JSON", exact: true })
        .click();
      const download = await promise;
      const path = await download.path();
      const portable = JSON.parse(await readFile(path, "utf8")).project;
      await launch(page);
      await page
        .getByLabel("Import project or collection JSON")
        .setInputFiles(path);
      const review = page.getByRole("dialog", {
        name: "Review JSON restore",
        exact: true,
      });
      await review
        .getByRole("button", { name: "Restore 1 copy", exact: true })
        .click();
      await page.getByRole("button", { name: "Close Restore report" }).click();
      await page
        .getByRole("button", { name: "Open " + p.name, exact: true })
        .click();
      await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
        "Saved by " + sourceName,
      );
      const restored = await page.evaluate(
        (name) =>
          Object.keys(localStorage)
            .filter((k) => k.startsWith("page-builder:project:"))
            .map((k) => JSON.parse(localStorage.getItem(k)))
            .find((p) => p.name === name),
        p.name,
      );
      validateProject(restored);
      expect(restored.projectId).not.toBe(portable.projectId);
      expect(
        Object.keys(restored.page.elements).some(
          (id) => portable.page.elements[id],
        ),
      ).toBe(false);
      expect(fingerprint(restored)).toEqual(fingerprint(portable));
      expect(compileProject(restored).errors).toEqual([]);
      await page
        .getByRole("button", { name: "Preview and export", exact: true })
        .click();
      const frame = page.frameLocator('iframe[title="Website preview"]');
      await expect(
        frame.getByRole("heading", { name: "Portable café 😀", exact: true }),
      ).toHaveCount(2);
      await expect(
        frame.locator("strong").filter({ hasText: "Styled text" }),
      ).toHaveCount(2);
      await page.getByRole("button", { name: "Close Page Builder" }).click();
      transfers.push({
        source: sourceName,
        target: browserName,
        sourceVersion: sourceBrowser.version(),
        bytes: Buffer.byteLength(JSON.stringify(portable)),
        passed: true,
      });
    } finally {
      await sourceBrowser.close();
    }
  }
  await testInfo.attach("cross-engine-backup-transfer", {
    body: Buffer.from(JSON.stringify(transfers, null, 2)),
    contentType: "application/json",
  });
});

test("failed media, backgrounds and trusted providers preserve content and report only observable failures", async ({
  page,
}, testInfo) => {
  let p = createProject({ name: "Provider failures" });
  const add = (type) => {
    const result = applyCommand(p, { type: "ADD", component: type });
    p = result.project;
    return result.selection[0];
  };
  const card = add("card"),
    video = add("video"),
    audio = add("audio");
  p.page.elements[card].styles.overrides = {
    backgroundImage: "https://example.com/failed-background.jpg",
    backgroundColor: "#dceedd",
    color: "#17251d",
    padding: "1rem",
  };
  const textResult = applyCommand(p, {
    type: "ADD",
    component: "paragraph",
    parentId: card,
  });
  p = textResult.project;
  p.page.elements[textResult.selection[0]].props.document = documentText(
    "Readable fallback content",
  );
  const providers = [
    ["youtube", "https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["vimeo", "https://player.vimeo.com/video/76979871"],
    ["maps", "https://www.google.com/maps/embed?pb=portable"],
  ];
  for (const [provider, url] of providers) {
    const id = add("embed");
    p.page.elements[id].props = {
      provider,
      url,
      title: provider + " unavailable",
    };
  }
  const blocked = [];
  await page.route("https://example.com/**", (route) => {
    blocked.push(route.request().url());
    return route.abort();
  });
  for (const [, url] of providers)
    await page.route(url, (route) => {
      blocked.push(route.request().url());
      return route.abort();
    });
  await seed(page, p);
  await open(page, p);
  await expect(page.getByTestId("canvas-paragraph").locator("p")).toHaveText(
    "Readable fallback content",
  );
  await expect(page.getByTestId("canvas-card")).toHaveCSS(
    "background-color",
    "rgb(220, 238, 221)",
  );
  // Native media loads on demand in the editor. Loading is local to the browser; play() is never called.
  for (const id of [video, audio]) {
    const media = page
      .locator(`[data-element-id="${id}"]`)
      .locator("video,audio");
    await media.evaluate((element) => {
      element.preload = "metadata";
      element.load();
    });
    await expect
      .poll(() => media.evaluate((element) => element.error?.code || 0))
      .toBeGreaterThan(0);
  }
  for (let i = 0; i < providers.length; i++)
    await page
      .getByRole("button", { name: "Load external embed", exact: true })
      .first()
      .click();
  await expect
    .poll(() => providers.every(([, url]) => blocked.includes(url)))
    .toBe(true);
  await page
    .getByRole("button", { name: "Preview and export", exact: true })
    .click();
  const failed = page
    .locator(".pb-diagnostics li")
    .filter({ hasText: "Warning · resource failed" });
  await expect(failed).toHaveCount(2);
  await expect(
    page.getByText(
      "Check text contrast over this external background. Its load status is unknown.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Download website ZIP" })
      .isDisabled(),
  ).toBe(true);
  const stored = await page.evaluate(
    (id) => JSON.parse(localStorage.getItem("page-builder:project:" + id)),
    p.projectId,
  );
  expect(stored).toEqual(p);
  await testInfo.attach("failed-provider-requests", {
    body: Buffer.from(
      JSON.stringify(
        {
          blocked,
          observedWarnings: 2,
          unknownStatusPreservedFor: ["background", "provider frames"],
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
});

async function keyboardActivate(page, locator) {
  await locator.focus();
  await expect(locator).toBeFocused();
  await expect
    .poll(() =>
      locator.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const at = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return (
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.top >= 0 &&
          r.bottom <= innerHeight &&
          (at === el || el.contains(at))
        );
      }),
    )
    .toBe(true);
  await page.keyboard.press("Enter");
}
test("320px reflow keeps guide, drawers, Undo, export and close reachable with keyboard focus", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const p = createProject({ name: "Keyboard reflow" });
  await seed(page, p);
  await open(page, p);
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Quick guide", exact: true }),
  );
  const guide = page.getByRole("dialog", { name: "Page Builder quick guide" });
  await expect(
    guide.getByRole("button", { name: "Close Page Builder quick guide" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(guide.getByRole("button", { name: "Next step" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    guide.getByRole("button", { name: "Close Page Builder quick guide" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Library / Layers", exact: true }),
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Add Paragraph", exact: true }),
  );
  await page
    .getByLabel("Text content", { exact: true })
    .fill("Keyboard-accessible content");
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Close inspector", exact: true }),
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Undo", exact: true }),
  );
  await expect(page.getByTestId("canvas-paragraph").locator("p")).toHaveText(
    "Write something worth sharing.",
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Undo", exact: true }),
  );
  await expect(page.getByTestId("canvas-paragraph")).toHaveCount(0);
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Redo", exact: true }),
  );
  await expect(page.getByTestId("canvas-paragraph")).toHaveCount(1);
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Redo", exact: true }),
  );
  await expect(page.getByTestId("canvas-paragraph").locator("p")).toHaveText(
    "Keyboard-accessible content",
  );
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Preview and export", exact: true }),
  );
  await expect(
    page
      .frameLocator('iframe[title="Website preview"]')
      .getByText("Keyboard-accessible content", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("dialog", { name: "Page Builder", exact: true })
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    )
    .toBe(true);
  const scan = await new AxeBuilder({ page })
    .include(".pb-root")
    .exclude("iframe")
    .analyze();
  expect(scan.violations).toEqual([]);
  await testInfo.attach("320px-keyboard-export", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await keyboardActivate(
    page,
    page.getByRole("button", { name: "Close Page Builder", exact: true }),
  );
  await expect(
    page.getByRole("button", { name: "Open Page Builder full screen" }),
  ).toBeFocused();
});
