import { readFile } from "node:fs/promises";
import { crc32 } from "node:zlib";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  createProject,
  documentText,
} from "../src/features/page-builder/domain/project";
import { applyCommand } from "../src/features/page-builder/domain/structure";

let errors;
test.beforeEach(({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors).toEqual([]));
function fixture() {
  let p = createProject({ name: "Export studio", templateId: "blank" });
  const add = (component, parentId = null) => {
    const r = applyCommand(p, { type: "ADD", component, parentId });
    p = r.project;
    return r.selection[0];
  };
  const root = add("container");
  p.page.elements[root].styles.overrides = {
    padding: "1rem",
    gap: "1rem",
    backgroundColor: "#ffffff",
    color: "#17251d",
  };
  const heading = add("heading", root);
  p.page.elements[heading].props.level = 1;
  p.page.elements[heading].props.document = documentText(
    "Native export studio",
  );
  p.page.elements[heading].styles.overrides = {
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1.2,
  };
  const text = add("paragraph", root);
  p.page.elements[text].props.document = {
    version: 2,
    nodes: [
      {
        type: "text",
        text: "Hello <world> & everyone",
        marks: ["bold"],
        styles: { color: "#173f33" },
      },
    ],
  };
  const section = add("link", root);
  p.page.elements[section].props = { text: "Go to heading", href: "#intro" };
  p.page.elements[heading].htmlId = "intro";
  const external = add("button", root);
  p.page.elements[external].props = {
    text: "External destination",
    href: "https://example.com/destination",
  };
  const form = add("form", root);
  p.page.elements[form].props.fields[0].required = false;
  const nav = add("nav");
  const link = add("link", nav);
  p.page.elements[link].props = { text: "Menu destination", href: "#intro" };
  const table = add("table"),
    icon = add("icon"),
    image = add("image");
  p.page.elements[image].visibility.globalHidden = true;
  const hidden = add("paragraph");
  p.page.elements[hidden].props.document = documentText("Desktop only note");
  p.page.elements[hidden].visibility.mobile = false;
  p.page.metadata.description = "A deterministic export fixture.";
  return p;
}
async function boot(page, project = fixture()) {
  await page.route("https://example.com/**", (route) => route.abort());
  await page.addInitScript((p) => {
    if (window !== window.top) return;
    if (!localStorage.getItem("m4-seeded")) {
      localStorage.setItem(
        "page-builder:project:" + p.projectId,
        JSON.stringify(p),
      );
      localStorage.setItem("m4-seeded", "yes");
    }
  }, project);
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page
    .getByRole("button", { name: "Open " + project.name, exact: true })
    .click();
}
async function output(page) {
  await page
    .getByRole("button", { name: "Preview and export", exact: true })
    .click();
  return page.frameLocator('iframe[title="Website preview"]');
}
function unzip(bytes) {
  const files = {};
  let at = 0;
  while (bytes.readUInt32LE(at) === 0x04034b50) {
    expect(bytes.readUInt16LE(at + 8)).toBe(0);
    const size = bytes.readUInt32LE(at + 18),
      nameSize = bytes.readUInt16LE(at + 26),
      extra = bytes.readUInt16LE(at + 28),
      name = bytes.subarray(at + 30, at + 30 + nameSize).toString("utf8");
    const data = bytes.subarray(
      at + 30 + nameSize + extra,
      at + 30 + nameSize + extra + size,
    );
    expect(crc32(data)).toBe(bytes.readUInt32LE(at + 14));
    files[name] = data.toString("utf8");
    at += 30 + nameSize + extra + size;
  }
  expect(bytes.readUInt32LE(at)).toBe(0x02014b50);
  expect(Object.keys(files)).toEqual(["index.html", "styles.css"]);
  return files;
}
async function zip(page) {
  const acknowledge = page.getByLabel(
    "I reviewed the warnings and want to export.",
  );
  if (await acknowledge.count()) await acknowledge.check();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download website ZIP" }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("export-studio.zip");
  return unzip(await readFile(await download.path()));
}

test("sandbox preview blocks external navigation, submissions and parent access while native controls work", async ({
  page,
}) => {
  await boot(page);
  const frame = await output(page);
  await expect(
    frame.getByRole("heading", { name: "Native export studio" }),
  ).toBeVisible();
  expect(
    await page
      .locator('iframe[title="Website preview"]')
      .getAttribute("sandbox"),
  ).toBe("");
  expect(
    await frame
      .locator("a")
      .evaluateAll((a) =>
        a.every((n) => !n.href || n.getAttribute("href").startsWith("#")),
      ),
  ).toBe(true);
  expect(await frame.locator("form").getAttribute("action")).toBeNull();
  expect(await frame.locator("script").count()).toBe(0);
  const isolated = await frame.locator("body").evaluate(() => {
    try {
      return window.parent.document === document;
    } catch {
      return true;
    }
  });
  expect(isolated).toBe(true);
  await frame
    .getByRole("textbox", { name: "Email address" })
    .fill("visitor@example.com");
  await frame.getByRole("button", { name: "Send message" }).click();
  await expect(
    frame.getByRole("heading", { name: "Native export studio" }),
  ).toBeVisible();
  expect(page.url()).toContain("/projects/page-builder");
  const records = await page.evaluate(() =>
    Object.entries(localStorage)
      .filter(([k]) => k.startsWith("page-builder:project:"))
      .map(([, v]) => v)
      .join(""),
  );
  expect(records).not.toContain("visitor@example.com");
  await page.getByLabel("Preview device").selectOption("390");
  await expect(frame.getByText("Desktop only note")).toBeHidden();
  await frame.getByText("Menu", { exact: true }).click();
  await expect(
    frame.getByRole("link", { name: "Menu destination" }),
  ).toBeHidden();
  await frame.getByText("Menu", { exact: true }).click();
  await expect(
    frame.getByRole("link", { name: "Menu destination" }),
  ).toBeVisible();
  const grip = page.getByRole("separator", { name: "Resize preview" });
  await grip.focus();
  await grip.press("ArrowRight");
  await expect(page.getByLabel("Preview width")).toHaveValue("400");
});

test("ZIP and individual downloads retain native endpoints and render identically to the preview at all device widths", async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await boot(page);
  const frame = await output(page);
  const files = await zip(page);
  expect(files["index.html"]).not.toMatch(/<script\b|\bon\w+=|javascript:/i);
  expect(files["index.html"]).toContain('href="styles.css"');
  expect(files["index.html"]).toContain('action="https://example.com/contact"');
  await page.getByText("Individual files", { exact: true }).click();
  for (const name of ["index.html", "styles.css"]) {
    const promise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download " + name, exact: true })
      .click();
    expect(await readFile(await (await promise).path(), "utf8")).toBe(
      files[name],
    );
  }
  await context.route("http://127.0.0.1:4173/__m4__/**", (route) => {
    const file = route.request().url().endsWith("styles.css")
      ? "styles.css"
      : "index.html";
    return route.fulfill({
      contentType: file.endsWith("css") ? "text/css" : "text/html",
      body: files[file],
    });
  });
  const exported = await context.newPage();
  for (const width of [390, 768, 1280]) {
    await page.getByLabel("Preview device").selectOption(String(width));
    await exported.setViewportSize({ width, height: 640 });
    await exported.goto("/__m4__/index.html");
    const metrics = (locator) =>
      locator.evaluateAll((nodes) =>
        nodes.map((e) => {
          const s = getComputedStyle(e),
            b = e.getBoundingClientRect();
          return {
            tag: e.tagName,
            font: s.font,
            color: s.color,
            background: s.backgroundColor,
            display: s.display,
            padding: s.padding,
            margin: s.margin,
            width: b.width,
            height: b.height,
            x: b.x,
            y: b.y,
          };
        }),
      );
    expect(await metrics(frame.locator(".pb-node"))).toEqual(
      await metrics(exported.locator(".pb-node")),
    );
    await testInfo.attach(`preview-${width}`, {
      body: await frame.locator("body").screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    await testInfo.attach(`export-${width}`, {
      body: await exported.screenshot(),
      contentType: "image/png",
    });
    await expect.soft(exported).toHaveScreenshot(`compiled-page-${width}.png`, {
      animations: "disabled",
    });
  }
  await exported.close();
});

test("preflight warnings gate every download and affected-element navigation opens the editor selection", async ({
  page,
}) => {
  const p = fixture();
  const e = Object.values(p.page.elements).find((e) => e.type === "image");
  e.visibility.globalHidden = false;
  e.props.alt = "";
  await boot(page, p);
  await output(page);
  await expect(
    page.getByRole("button", { name: "Download website ZIP" }),
  ).toBeDisabled();
  await page.getByText("Individual files", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download index.html" }),
  ).toBeDisabled();
  const row = page
    .locator(".pb-diagnostics li")
    .filter({ hasText: "missing alt" });
  await row.getByRole("button", { name: "Show affected element" }).click();
  await expect(page.locator(`[data-element-id="${e.id}"]`)).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByLabel("Image description")).toBeVisible();
});

test("template selection uses the same sandbox compiler without creating or changing saved projects", async ({
  page,
}) => {
  await page.route("https://example.com/**", (route) => route.abort());
  await page.goto("/projects/page-builder");
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("radio", { name: /^Portfolio / }).check();
  await page.getByRole("button", { name: "Preview selected template" }).click();
  const frame = page.frameLocator('iframe[title="Template preview"]');
  await expect(
    frame.getByRole("heading", {
      name: "Thoughtful work. Lasting impressions.",
    }),
  ).toBeVisible();
  await page.getByLabel("Preview device").selectOption("390");
  await expect(frame.locator("nav summary")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) =>
          k.startsWith("page-builder:project:"),
        ).length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your projects" }),
  ).toBeVisible();
});

test("export controls pass scoped desktop and mobile accessibility checks and generated code stays read-only", async ({
  page,
}, testInfo) => {
  await boot(page);
  await output(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const scan = await new AxeBuilder({ page })
      .include(".pb-export-workspace")
      .exclude("iframe")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    await testInfo.attach(`export-workspace-${width}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  }
  await page.getByRole("button", { name: "HTML", exact: true }).click();
  await page.getByText("Select code manually", { exact: true }).click();
  await expect(page.getByLabel("Read-only HTML code")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(page.getByLabel("Read-only HTML code")).toContainText(
    "styles.css",
  );
  await page.getByRole("button", { name: "CSS", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeVisible();
});

test("damaged records remain isolated and collection restores provide per-record reports", async ({
  page,
}) => {
  const p = fixture();
  await boot(page, p);
  await page.getByRole("button", { name: "Back to projects" }).click();
  await page.evaluate(() =>
    localStorage.setItem("page-builder:project:damaged", "{invalid"),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Open Page Builder full screen" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Stored data needs attention",
      exact: true,
    }),
  ).toBeVisible();
  const backup = {
    kind: "page-builder-collection",
    formatVersion: 1,
    projects: [p, { ...p, schemaVersion: 999 }],
  };
  await page.getByLabel("Import project or collection JSON").setInputFiles({
    name: "mixed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const review = page.getByRole("dialog", { name: "Review JSON restore" });
  await expect(review.getByText("Identical saved record")).toBeVisible();
  await expect(
    review.getByRole("checkbox", { name: /Invalid record/ }),
  ).toBeDisabled();
  await review.getByRole("button", { name: "Restore 1 copy" }).click();
  const report = page.getByRole("dialog", { name: "Restore report" });
  await expect(report.getByText("Export studio (2) · restored")).toBeVisible();
  await report.getByRole("button", { name: "Close Restore report" }).click();
  await expect(
    page.getByRole("button", { name: "Open Export studio (2)", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("page-builder:project:damaged"),
    ),
  ).toBe("{invalid");
});

test("250 components remain editable and export preview timings are observable without a separate count cap", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const { makeElement } = await import(
    "../src/features/page-builder/domain/structure"
  );
  const p = createProject({ name: "Large page" });
  for (let i = 0; i < 250; i++) {
    const e = makeElement("paragraph");
    e.props.document = documentText("Component " + (i + 1));
    p.page.elements[e.id] = e;
    p.page.rootElementIds.push(e.id);
  }
  const start = Date.now();
  await boot(page, p);
  const opened = Date.now();
  await expect(
    page
      .locator(".pb-banner")
      .filter({ hasText: "This page has more than 200 elements." }),
  ).toBeVisible();
  const frame = await output(page);
  await expect(frame.locator("p")).toHaveCount(250);
  const previewed = Date.now();
  const metrics = await frame
    .locator("body")
    .evaluate(() => ({
      nodes: document.querySelectorAll("*").length,
      scripts: document.scripts.length,
      htmlBytes: new TextEncoder().encode(document.documentElement.outerHTML)
        .length,
    }));
  expect(metrics.scripts).toBe(0);
  await testInfo.attach("large-page-metrics", {
    body: Buffer.from(
      JSON.stringify(
        {
          components: 250,
          openMs: opened - start,
          previewMs: previewed - opened,
          ...metrics,
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
});
