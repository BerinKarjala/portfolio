import { describe, it, expect } from "vitest";
import { createProject, validateProject } from "./project";
import { applyCommand } from "./structure";
import { resolveStyles, ownStyles } from "./styles";
import { builderReducer, initialState } from "../state/builderReducer";
const cmd = (p, c) => applyCommand(p, c);
const add = (p, type, parentId = null) =>
  cmd(p, { type: "ADD", component: type, parentId });
describe("design graph safety and appearance invariants", () => {
  it("preserves linked style sharing on a normal preset bake and detaches conflicting inherited contexts only", () => {
    let r = add(createProject(), "container"),
      p = r.project,
      parent = r.selection[0];
    r = add(p, "card");
    p = r.project;
    const root = r.selection[0];
    p = cmd(p, { type: "MASTER_CREATE", ids: [root], name: "Card" }).project;
    const masterId = Object.keys(p.masters)[0];
    r = cmd(p, { type: "MASTER_INSERT", masterId, parentId: parent });
    p = r.project;
    const inside = r.selection[0];
    p = cmd(p, {
      type: "PRESET_SAVE",
      preset: {
        id: "box",
        name: "Box",
        category: "Appearance",
        parentId: null,
        styles: { backgroundColor: "#112233" },
        states: {},
        variants: {},
      },
    }).project;
    p = cmd(p, {
      type: "PRESET_APPLY",
      ids: [parent],
      category: "Appearance",
      presetId: "box",
    }).project;
    const before = resolveStyles(p, inside);
    p = cmd(p, {
      type: "PRESET_REMOVE",
      presetId: "box",
      confirmed: true,
    }).project;
    expect(resolveStyles(p, inside)).toEqual(before);
    expect(p.page.elements[inside].instance).toBe(null);
    expect(p.page.elements[root].instance.masterId).toBe(masterId);
    expect(validateProject(p)).toBe(p);
  });
  it("preserves selection and restores preset/master/global edits as single history actions", () => {
    let s = builderReducer(initialState, {
      type: "OPEN",
      project: createProject(),
      readOnly: false,
    });
    const command = (c) => {
      s = builderReducer(s, { type: "COMMAND", command: c });
      expect(s.editor.commandError).toBe("");
    };
    command({ type: "ADD", component: "heading" });
    const id = s.editor.selection[0];
    command({
      type: "PRESET_SAVE",
      preset: {
        id: "text",
        name: "Body",
        category: "Typography",
        parentId: null,
        styles: { color: "#123456" },
        states: {},
        variants: {},
      },
    });
    expect(s.editor.selection).toEqual([id]);
    s = builderReducer(s, { type: "UNDO" });
    expect(s.editor.project.presets).toEqual({});
    s = builderReducer(s, { type: "REDO" });
    expect(s.editor.project.presets.text).toBeTruthy();
    command({ type: "MASTER_CREATE", ids: [id], name: "Title" });
    s = builderReducer(s, { type: "UNDO" });
    expect(s.editor.project.masters).toEqual({});
    expect(s.editor.project.page.elements[id].instance).toBe(null);
    command({ type: "GLOBAL_EFFECTS", effects: { animation: "fade" } });
    s = builderReducer(s, { type: "UNDO" });
    expect(s.editor.project.globalEffects.animation).toBe("none");
  });
  it("applies inherited preset box properties on descendants and reports inherited text overrides correctly", () => {
    let r = add(createProject(), "container"),
      p = r.project,
      root = r.selection[0];
    r = add(p, "paragraph", root);
    p = r.project;
    const child = r.selection[0];
    p = cmd(p, {
      type: "PRESET_SAVE",
      preset: {
        id: "box",
        name: "Box",
        category: "Layout",
        parentId: null,
        styles: { padding: "2rem" },
        states: {},
        variants: {},
      },
    }).project;
    p = cmd(p, {
      type: "PRESET_APPLY",
      ids: [root],
      category: "Layout",
      presetId: "box",
    }).project;
    p = cmd(p, {
      type: "PATCH",
      ids: [root],
      patch: { styles: { overrides: { color: "#aabbcc" } } },
    }).project;
    expect(ownStyles(p, child).padding).toBe("2rem");
    expect(resolveStyles(p, child).color).toBe("#aabbcc");
  });
  it("makes a master independent of its original parent while keeping preset dependencies", () => {
    let r = add(createProject(), "container"),
      p = r.project,
      root = r.selection[0];
    r = add(p, "card", root);
    p = r.project;
    const card = r.selection[0];
    p = cmd(p, {
      type: "PATCH",
      ids: [root],
      patch: { styles: { overrides: { color: "#aabbcc" } } },
    }).project;
    p = cmd(p, {
      type: "PRESET_SAVE",
      preset: {
        id: "body",
        name: "Body",
        category: "Typography",
        parentId: null,
        styles: { fontSize: "1.5rem" },
        states: {},
        variants: {},
      },
    }).project;
    p = cmd(p, {
      type: "PRESET_APPLY",
      ids: [root],
      category: "Typography",
      presetId: "body",
    }).project;
    const before = resolveStyles(p, card);
    p = cmd(p, { type: "MASTER_CREATE", ids: [card], name: "Card" }).project;
    r = cmd(p, {
      type: "MASTER_INSERT",
      masterId: Object.keys(p.masters)[0],
      parentId: null,
    });
    p = r.project;
    expect(resolveStyles(p, r.selection[0])).toEqual(before);
  });
  it("rejects forged linked content, missing preset refs and category cycles without modifying originals", () => {
    let r = add(createProject(), "heading"),
      p = r.project,
      id = r.selection[0];
    p = cmd(p, { type: "MASTER_CREATE", ids: [id], name: "Title" }).project;
    const forged = structuredClone(p);
    forged.page.elements[id].props.level = 6;
    expect(() => validateProject(forged)).toThrow(/linked|master/i);
    const bad = structuredClone(p);
    bad.page.elements[id].presetIds.Layout = "missing";
    expect(() => validateProject(bad)).toThrow(/preset/i);
    expect(validateProject(p)).toBe(p);
  });
  it.each([
    ["form", "action", "javascript:alert(1)"],
    ["form", "method", "PUT"],
    ["embed", "url", "https://www.youtube.com.evil.example/embed/123456"],
    ["embed", "url", "https://www.youtube.com/embed/123456?autoplay=1"],
    ["gallery", "hover", "url(javascript:bad)"],
    ["video", "poster", "data:image/svg+xml,bad"],
    ["audio", "preload", "execute"],
    ["icon", "iconId", "<svg onload=bad>"],
  ])("rejects unsupported %s %s", (type, key, value) => {
    const r = add(createProject(), type);
    const original = JSON.stringify(r.project);
    expect(() =>
      cmd(r.project, {
        type: "PATCH",
        ids: r.selection,
        patch: { props: { [key]: value } },
      }),
    ).toThrow();
    expect(JSON.stringify(r.project)).toBe(original);
  });
  it("bakes preset states as deltas so later normal edits keep their normal behavior", () => {
    let r = add(createProject(), "paragraph"),
      p = r.project,
      id = r.selection[0];
    p = cmd(p, {
      type: "PRESET_SAVE",
      preset: {
        id: "body",
        name: "Body",
        category: "Typography",
        parentId: null,
        styles: { color: "#123456" },
        states: { hover: { fontWeight: 700 } },
        variants: {},
      },
    }).project;
    p = cmd(p, {
      type: "PRESET_APPLY",
      ids: [id],
      category: "Typography",
      presetId: "body",
    }).project;
    p = cmd(p, {
      type: "PRESET_REMOVE",
      presetId: "body",
      confirmed: true,
    }).project;
    p = cmd(p, {
      type: "STYLE",
      ids: [id],
      styles: { color: "#abcdef" },
    }).project;
    expect(resolveStyles(p, id, "hover").color).toBe("#abcdef");
    expect(resolveStyles(p, id, "hover").fontWeight).toBe(700);
  });
});
