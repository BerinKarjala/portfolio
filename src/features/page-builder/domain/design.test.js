import { describe, expect, it } from "vitest";
import {
  createProject,
  migrateProject,
  validateProject,
  duplicateProject,
} from "./project";
import { applyCommand } from "./structure";
import { resolveStyles, colorToHex, validateStyles } from "./styles";
import { COMPONENTS } from "./catalog";

const run = (p, command) => applyCommand(p, command);
const add = (p, component, parentId = null) =>
  run(p, { type: "ADD", component, parentId });
describe("M3 components and style contracts", () => {
  it("creates every palette component and validates safe rich component props", () => {
    for (const c of COMPONENTS) {
      let p = createProject();
      let parentId = null;
      if (c.type === "listItem") {
        const r = add(p, "list");
        p = r.project;
        parentId = r.selection[0];
      }
      expect(validateProject(add(p, c.type, parentId).project)).toBeTruthy();
    }
    expect(COMPONENTS.map((c) => c.type)).toEqual(
      expect.arrayContaining([
        "button",
        "form",
        "table",
        "gallery",
        "icon",
        "video",
        "audio",
        "embed",
        "card",
      ]),
    );
  });
  it("rejects unsafe endpoints, embeds, visitor values and scripts in complex components", () => {
    for (const type of ["form", "embed", "video", "table"]) {
      const r = add(createProject(), type);
      const p = r.project;
      const e = p.page.elements[r.selection[0]];
      if (type === "form") e.props.action = "http://example.com/post";
      if (type === "embed") e.props.url = "https://evil.example/embed";
      if (type === "video") {
        e.props.autoplay = true;
        e.props.muted = false;
      }
      if (type === "table") e.props.rows[0][0] = { html: "bad" };
      expect(() => validateProject(p)).toThrow();
    }
    const r = add(createProject(), "form");
    r.project.page.elements[r.selection[0]].props.fields[0].value =
      "visitor secret";
    expect(() => validateProject(r.project)).toThrow();
  });
  it("accepts controlled colors/units and rejects CSS functions, unsafe fonts and fixed positioning", () => {
    expect(colorToHex("rgba(255, 0, 0, 0.5)")).toBe("#ff000080");
    expect(colorToHex("hsl(120, 100%, 25%)")).toBe("#008000");
    expect(
      validateStyles({
        marginLeft: "-1rem",
        paddingTop: "2%",
        fontFamily: "Inter",
        opacity: 0.5,
        objectPosition: "25% 75%",
      }),
    ).toBeTruthy();
    for (const s of [
      { width: "calc(1px)" },
      { backgroundImage: "url(javascript:x)" },
      { fontFamily: "evil; color:red" },
      { position: "fixed" },
      { color: "red;display:none" },
    ])
      expect(() => validateStyles(s)).toThrow();
  });
  it("resolves parent presets, variants, state overrides and bakes removal through descendants", () => {
    let {
      project: p,
      selection: [root],
    } = add(createProject(), "container");
    let r = add(p, "paragraph", root);
    p = r.project;
    const child = r.selection[0];
    p = run(p, {
      type: "PRESET_SAVE",
      preset: {
        id: "base",
        name: "Body",
        category: "Typography",
        parentId: null,
        styles: { color: "#123456", fontSize: "1rem" },
        states: { hover: { color: "#654321" } },
        variants: { large: { fontSize: "2rem" } },
      },
    }).project;
    p = run(p, {
      type: "PRESET_SAVE",
      preset: {
        id: "variant",
        name: "Large",
        category: "Typography",
        parentId: "base",
        styles: { fontWeight: 700 },
        states: {},
        variants: {},
      },
    }).project;
    p = run(p, {
      type: "PRESET_APPLY",
      ids: [root],
      category: "Typography",
      presetId: "variant",
      variant: "",
    }).project;
    expect(resolveStyles(p, child).fontSize).toBe("1rem");
    expect(resolveStyles(p, child, "hover").color).toBe("#654321");
    const before = resolveStyles(p, child, "hover");
    p = run(p, {
      type: "PRESET_REMOVE",
      presetId: "base",
      confirmed: true,
    }).project;
    expect(resolveStyles(p, child, "hover")).toEqual(before);
    expect(p.presets.variant.parentId).toBe(null);
    expect(() =>
      run(p, {
        type: "PRESET_SAVE",
        preset: { ...p.presets.variant, parentId: "variant" },
      }),
    ).toThrow(/cycle/i);
  });
  it("migrates the actual schema-2 shape without mutating or dropping content", () => {
    const p = createProject({ templateId: "portfolio" });
    p.schemaVersion = 2;
    for (const e of Object.values(p.page.elements)) {
      delete e.effects;
      delete e.instance;
      delete e.styles.states;
      delete e.presetVariants;
      delete e.accessibility;
      if (e.props.document)
        e.props.document = {
          version: 1,
          nodes: [{ type: "text", text: "Legacy" }],
        };
    }
    const raw = JSON.stringify(p);
    const q = migrateProject(p);
    expect(q.schemaVersion).toBe(3);
    expect(JSON.stringify(p)).toBe(raw);
    expect(
      Object.values(q.page.elements).find((e) => e.props.document).props
        .document.version,
    ).toBe(2);
  });
});

describe("linked masters and independent copies (AC-05)", () => {
  it("updates structure through a second instance and rejects any locked-instance propagation atomically", () => {
    let r = add(createProject(), "container"),
      p = r.project,
      root = r.selection[0];
    r = add(p, "heading", root);
    p = r.project;
    p = run(p, { type: "MASTER_CREATE", ids: [root], name: "Panel" }).project;
    const masterId = Object.keys(p.masters)[0];
    r = run(p, { type: "MASTER_INSERT", masterId, parentId: null });
    p = r.project;
    const second = r.selection[0];
    p = run(p, {
      type: "MASTER_EDIT",
      masterId,
      instanceRoot: second,
      command: { type: "ADD", component: "paragraph", parentId: second },
    }).project;
    expect(p.page.elements[root].children).toHaveLength(2);
    expect(p.page.elements[second].children).toHaveLength(2);
    const child = p.page.elements[root].children[0];
    p = run(p, {
      type: "PATCH",
      ids: [child],
      patch: { locked: true },
    }).project;
    const raw = JSON.stringify(p);
    expect(() =>
      run(p, {
        type: "MASTER_EDIT",
        masterId,
        instanceRoot: second,
        command: { type: "PATCH", ids: [second], patch: { name: "Blocked" } },
      }),
    ).toThrow(/lock/i);
    expect(JSON.stringify(p)).toBe(raw);
    expect(() =>
      run(p, { type: "MASTER_REMOVE", masterId, confirmed: true }),
    ).toThrow(/lock/i);
  });
  it("remaps rich internal links when an entire linked component is duplicated", () => {
    let r = add(createProject(), "container"),
      p = r.project,
      root = r.selection[0];
    p = run(p, {
      type: "PATCH",
      ids: [root],
      patch: { htmlId: "section" },
    }).project;
    r = add(p, "paragraph", root);
    p = r.project;
    p = run(p, {
      type: "PATCH",
      ids: r.selection,
      patch: {
        props: {
          document: {
            version: 2,
            nodes: [
              {
                type: "link",
                text: "Jump",
                href: "#section",
                marks: [],
                styles: {},
              },
            ],
          },
        },
      },
    }).project;
    p = run(p, { type: "MASTER_CREATE", ids: [root], name: "Linked" }).project;
    r = run(p, { type: "DUPLICATE", ids: [root] });
    p = r.project;
    const copied = p.page.elements[r.selection[0]];
    expect(
      p.page.elements[copied.children[0]].props.document.nodes[0].href,
    ).toBe("#" + copied.htmlId);
    expect(validateProject(p)).toBe(p);
  });
  it("propagates shared content, keeps local placement, detaches, removes and duplicates safely", () => {
    let {
      project: p,
      selection: [root],
    } = add(createProject(), "container");
    let r = add(p, "paragraph", root);
    p = r.project;
    const text = r.selection[0];
    r = run(p, { type: "MASTER_CREATE", ids: [root], name: "Callout" });
    p = r.project;
    const masterId = Object.keys(p.masters)[0];
    r = run(p, { type: "MASTER_INSERT", masterId, parentId: null });
    p = r.project;
    const other = r.selection[0];
    p = run(p, {
      type: "PATCH",
      ids: [other],
      patch: { geometry: { x: 25 }, styles: { overrides: { width: "80%" } } },
    }).project;
    expect(() =>
      run(p, { type: "PATCH", ids: [text], patch: { name: "Blocked" } }),
    ).toThrow(/master|linked/i);
    p = run(p, {
      type: "MASTER_EDIT",
      masterId,
      instanceRoot: root,
      command: {
        type: "PATCH",
        ids: [text],
        patch: {
          props: {
            document: {
              version: 2,
              nodes: [
                { type: "text", text: "Shared update", marks: [], styles: {} },
              ],
            },
          },
        },
      },
    }).project;
    const otherText = p.page.elements[p.page.elements[other].children[0]];
    expect(otherText.props.document.nodes[0].text).toBe("Shared update");
    expect(p.page.elements[other].geometry.x).toBe(25);
    expect(p.page.elements[other].styles.overrides.width).toBe("80%");
    const q = duplicateProject(p);
    expect(validateProject(q)).toBe(q);
    p = run(p, { type: "MASTER_DETACH", ids: [other] }).project;
    expect(p.page.elements[other].instance).toBe(null);
    expect(() => run(p, { type: "MASTER_REMOVE", masterId })).toThrow(
      /confirm/i,
    );
    p = run(p, { type: "MASTER_REMOVE", masterId, confirmed: true }).project;
    expect(p.page.elements[root].instance).toBe(null);
    expect(p.masters).toEqual({});
  });
  it("copies a transitive preset graph into an independent master with fresh IDs", () => {
    let {
      project: p,
      selection: [root],
    } = add(createProject(), "card");
    for (const preset of [
      { id: "base", parentId: null },
      { id: "child", parentId: "base" },
    ])
      p = run(p, {
        type: "PRESET_SAVE",
        preset: {
          ...preset,
          name: preset.id,
          category: "Appearance",
          styles: { backgroundColor: "#112233" },
          states: {},
          variants: {},
        },
      }).project;
    p = run(p, {
      type: "PRESET_APPLY",
      ids: [root],
      category: "Appearance",
      presetId: "child",
      variant: "",
    }).project;
    p = run(p, { type: "MASTER_CREATE", ids: [root], name: "Card" }).project;
    const id = Object.keys(p.masters)[0];
    const q = run(createProject(), {
      type: "MASTER_COPY",
      source: p,
      masterId: id,
    }).project;
    expect(Object.keys(q.presets)).toHaveLength(2);
    expect(Object.keys(q.masters)).toHaveLength(1);
    expect(q.masters[id]).toBeUndefined();
    expect(q.presets.base).toBeUndefined();
    expect(validateProject(q)).toBe(q);
  });
});
