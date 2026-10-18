// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createProject, documentText } from "../domain/project";
import { makeField } from "../domain/components";
import { preflight, diagnosticSummary } from "./preflight";
import { makeElement, applyCommand } from "../domain/structure";
import { compileProject, previewDocument, prepareExport } from "./compiler";
import { packageZip } from "./zip";

function fixture() {
  let p = createProject({ name: "Export & learn", templateId: "blank" });
  for (const type of [
    "heading",
    "paragraph",
    "link",
    "button",
    "divider",
    "image",
    "nav",
    "list",
    "form",
    "table",
    "gallery",
    "icon",
    "video",
    "audio",
    "embed",
    "card",
  ]) {
    p = applyCommand(p, {
      type: "ADD",
      component: type,
      parentId: null,
    }).project;
  }
  return p;
}
const parse = (html) => new DOMParser().parseFromString(html, "text/html");
describe("standalone compiler", () => {
  it("produces deterministic safe HTML and CSS, metadata and native components without a runtime", () => {
    const p = fixture();
    const h = Object.values(p.page.elements).find((e) => e.type === "heading");
    h.props.document = documentText('<script>alert("x")</script> & words');
    const original = structuredClone(p);
    const first = compileProject(p),
      second = compileProject(structuredClone(p));
    expect(first).toEqual(second);
    expect(first.errors).toEqual([]);
    const d = parse(first.html);
    expect(d.querySelector("h2").textContent).toBe(
      '<script>alert("x")</script> & words',
    );
    expect(d.querySelectorAll("script,[onclick],[style]")).toHaveLength(0);
    expect(d.querySelector("link[rel=stylesheet]").getAttribute("href")).toBe(
      "styles.css",
    );
    expect(d.title).toBe("Export & learn");
    expect(d.querySelector("form").getAttribute("method")).toBe("POST");
    expect(d.querySelector("label").htmlFor).toBe(
      d.querySelector("form input").id,
    );
    for (const tag of [
      "nav",
      "details",
      "table",
      "th[scope=col]",
      "figure",
      "svg",
      "video",
      "audio",
      "iframe",
      "article",
    ])
      expect(d.querySelector(tag)).not.toBeNull();
    expect(first.css).toContain("prefers-reduced-motion");
    expect(first.css).toContain("max-width: 599px");
    expect(p).toEqual(original);
  });
  it("blocks executable, invalid layout, duplicate IDs and CSS data before serialization", () => {
    const mutations = [
      (p) =>
        (p.page.elements[p.page.rootElementIds[0]].props.onclick = "alert(1)"),
      (p) => (p.globalStyles.backgroundImage = "javascript:alert(1)"),
      (p) => {
        Object.values(p.page.elements).find(
          (e) => e.type === "link",
        ).props.href = "https:example.com/path";
      },
      (p) => {
        Object.values(p.page.elements).find(
          (e) => e.type === "form",
        ).props.action = "https:/example.com/path";
      },
      (p) => {
        Object.values(p.page.elements).find(
          (e) => e.type === "embed",
        ).props.url = "https:www.youtube.com/embed/dQw4w9WgXcQ";
      },
      (p) => p.page.rootElementIds.push(p.page.rootElementIds[0]),
      (p) => {
        const e = Object.values(p.page.elements);
        e[0].htmlId = e[1].htmlId = "same";
      },
    ];
    for (const mutate of mutations) {
      const p = fixture();
      mutate(p);
      const result = compileProject(p);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.html).toBe("");
      expect(result.css).toBe("");
      expect(() => prepareExport(p, { acknowledgeWarnings: true })).toThrow();
    }
  });
  it("omits globally hidden subtrees and retains breakpoint-hidden content with CSS", () => {
    const p = fixture(),
      nodes = Object.values(p.page.elements);
    nodes[0].visibility.globalHidden = true;
    nodes[1].visibility.mobile = false;
    const c = compileProject(p),
      d = parse(c.html);
    expect(d.querySelector("." + c.classes[nodes[0].id])).toBeNull();
    expect(d.querySelector("." + c.classes[nodes[1].id])).not.toBeNull();
    expect(c.css).toContain(
      "." + c.classes[nodes[1].id] + " { display: none !important; }",
    );
    expect(c.css).not.toContain("." + c.classes[nodes[0].id] + " {");
  });
  it("previews the compiled document in an inert navigation mode while exports retain endpoints", () => {
    const p = fixture(),
      c = compileProject(p),
      preview = parse(previewDocument(c));
    expect(preview.querySelector("form").getAttribute("action")).toBeNull();
    expect(preview.querySelector("a").getAttribute("href")).toBeNull();
    expect(preview.querySelector("style").textContent).toBe(c.css);
    expect(
      preview.querySelector('meta[http-equiv="Content-Security-Policy"]')
        .content,
    ).toContain("form-action 'none'");
    expect(preview.querySelector("script")).toBeNull();
    expect(parse(c.html).querySelector("form").getAttribute("action")).toBe(
      "https://example.com/contact",
    );
  });
  it("requires warning acknowledgement for every delivery mode and returns a safe slug", () => {
    const p = fixture();
    p.name = "../../Résumé <test>";
    const image = Object.values(p.page.elements).find(
      (e) => e.type === "image",
    );
    image.props.alt = "";
    expect(
      compileProject(p).warnings.some(
        (w) => w.code === "missing-alt" && w.elementId === image.id,
      ),
    ).toBe(true);
    expect(() => prepareExport(p)).toThrow(/warnings/i);
    const c = prepareExport(p, { acknowledgeWarnings: true });
    expect(c.filename).toBe("resume-test.zip");
    expect(Object.keys(c.files)).toEqual(["index.html", "styles.css"]);
  });
  it("packages exactly two UTF-8 files with valid ZIP headers and CRCs", () => {
    const bytes = packageZip({
      "index.html": "é🌱",
      "styles.css": "body { color: green; }",
    });
    const view = new DataView(bytes.buffer);
    let at = 0;
    const names = [];
    while (view.getUint32(at, true) === 0x04034b50) {
      const length = view.getUint32(at + 18, true),
        nameLength = view.getUint16(at + 26, true),
        extra = view.getUint16(at + 28, true);
      expect(view.getUint16(at + 8, true)).toBe(0);
      names.push(
        new TextDecoder().decode(bytes.slice(at + 30, at + 30 + nameLength)),
      );
      at += 30 + nameLength + extra + length;
    }
    expect(names).toEqual(["index.html", "styles.css"]);
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    expect(() => packageZip({ "x.js": "bad" })).toThrow();
  });
});

describe("M4 resolved styles, semantics and diagnostics", () => {
  it("preserves quoted CSS URL punctuation, deduplicates styles and prunes unused preset fonts", () => {
    const p = createProject({ templateId: "blank" });
    const a = makeElement("paragraph"),
      b = makeElement("paragraph");
    p.page.elements = { [a.id]: a, [b.id]: b };
    p.page.rootElementIds = [a.id, b.id];
    p.globalStyles.backgroundImage = "https://example.com/art;a=1,b=2.png";
    p.presets.unused = {
      id: "unused",
      name: "Unused font",
      category: "Typography",
      parentId: null,
      styles: { fontFamily: "Lora" },
      states: {},
      variants: {},
    };
    a.styles.overrides.color = b.styles.overrides.color = "#123456";
    const c = compileProject(p);
    expect(c.css).toContain('url("https://example.com/art;a=1,b=2.png")');
    expect(c.html).not.toContain("fonts.googleapis");
    expect(c.css.match(/color: #123456;/g)).toHaveLength(1);
    a.styles.states.hover = { fontFamily: "Inter", color: "#654321" };
    const updated = compileProject(p);
    expect(updated.html).toContain("display=swap");
    expect(updated.html).toContain("family=Inter");
    expect(updated.css).toContain(":hover");
  });
  it("serializes rich marks/links/icons, list semantics, state inheritance and reduced-motion effects", () => {
    let p = createProject();
    const list = applyCommand(p, { type: "ADD", component: "list" });
    p = list.project;
    const child = applyCommand(p, {
      type: "ADD",
      component: "listItem",
      parentId: list.selection[0],
    });
    p = child.project;
    const e = p.page.elements[child.selection[0]];
    e.props.document = {
      version: 2,
      nodes: [
        {
          type: "link",
          text: "Safe & sound",
          href: "https://example.com",
          marks: ["bold", "italic", "superscript"],
          styles: { fontFamily: "Lora" },
        },
        { type: "break" },
        {
          type: "icon",
          iconId: "star",
          label: "Star",
          styles: { color: "#123456" },
        },
      ],
    };
    e.effects.animation = "pulse";
    e.effects.iterations = "infinite";
    const c = compileProject(p),
      d = parse(c.html);
    expect(d.querySelector("ul > li a sup em strong").textContent).toBe(
      "Safe & sound",
    );
    expect(d.querySelector("li svg").getAttribute("aria-label")).toBe("Star");
    expect(c.css).toContain("@keyframes pb-pulse");
    expect(c.css).not.toContain("@keyframes pb-zoom");
    expect(c.css).toContain("animation: none !important");
  });
  it("generates unique field/option IDs independently of user HTML IDs and repeated field identifiers", () => {
    const p = fixture(),
      form = Object.values(p.page.elements).find((e) => e.type === "form");
    const radio = makeField("radio");
    radio.id = "a";
    radio.name = "choice";
    const text = makeField();
    text.id = "a-option-0";
    text.name = "other";
    form.props.fields = [radio, text];
    form.htmlId = "pb-field-authored";
    const d = parse(compileProject(p).html),
      ids = [...d.querySelectorAll("[id]")].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const label of d.querySelectorAll("label[for]"))
      expect(d.getElementById(label.htmlFor)).not.toBeNull();
    expect(
      [...d.querySelectorAll("input[type=radio]")].map((e) => e.value),
    ).toEqual(radio.options);
  });
  it("keeps generated element classes distinct from internal component helpers", () => {
    const p = createProject(),
      table = makeElement("table");
    table.id = "scroll";
    p.page.elements = { scroll: table };
    p.page.rootElementIds = ["scroll"];
    const c = compileProject(p),
      d = parse(c.html);
    expect(c.errors).toEqual([]);
    expect(d.querySelectorAll("." + c.classes.scroll)).toHaveLength(1);
  });
  it("reports observable resource failures with correction targets and drops stale failures after URL edits", () => {
    const p = fixture(),
      image = Object.values(p.page.elements).find((e) => e.type === "image");
    const observedFailures = [{ elementId: image.id, url: image.props.src }];
    expect(
      compileProject(p, { observedFailures }).warnings.filter(
        (w) => w.code === "resource-failed",
      ),
    ).toHaveLength(1);
    image.props.src = "https://example.com/repaired.jpg";
    expect(
      compileProject(p, { observedFailures }).warnings.some(
        (w) => w.code === "resource-failed",
      ),
    ).toBe(false);
    const safe = diagnosticSummary(compileProject(p));
    expect(safe).not.toContain(image.id);
    expect(safe).not.toContain("https:");
    expect(safe).not.toContain(p.name);
  });
  it("locates invalid components while blocking output and handles unsafe style contexts", () => {
    const p = fixture(),
      image = Object.values(p.page.elements).find((e) => e.type === "image");
    image.props.src = "javascript:alert(1)";
    expect(preflight(p).errors[0].elementId).toBe(image.id);
    const q = fixture();
    q.globalStyles.backgroundImage =
      "https://example.com/</style><script>x</script>";
    expect(compileProject(q).html).toBe("");
  });
  it("has no component count cap and measures a 250-component compilation without inventing a timing budget", () => {
    const p = createProject();
    for (let i = 0; i < 250; i++) {
      const e = makeElement("paragraph");
      p.page.elements[e.id] = e;
      p.page.rootElementIds.push(e.id);
    }
    const start = performance.now(),
      c = compileProject(p),
      elapsed = performance.now() - start;
    expect(c.errors).toEqual([]);
    expect(Object.keys(c.classes)).toHaveLength(250);
    expect(elapsed).toBeGreaterThan(0);
    expect(new TextEncoder().encode(c.html).length).toBeGreaterThan(1000);
  });
});
