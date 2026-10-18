import { describe, expect, it } from "vitest";
import { createProject, migrateProject, validateProject } from "./project";
import { applyCommand, captureClipboard, isLocked } from "./structure";

const add = (p, type, parentId = null, props = {}) =>
  applyCommand(p, { type: "ADD", component: type, parentId, ...props });
function fixture() {
  let p = createProject({ name: "Canvas" });
  const a = add(p, "container");
  p = a.project;
  const b = add(p, "container");
  p = b.project;
  const text = add(p, "heading", a.selection[0]);
  return {
    p: text.project,
    a: a.selection[0],
    b: b.selection[0],
    text: text.selection[0],
  };
}

describe("atomic structural commands (AC-02, AC-04, AC-08)", () => {
  it("preserves document order for batch moves and updates retained insertion indices", () => {
    let { p, a, b, text } = fixture();
    const second = add(p, "paragraph", a);
    p = second.project;
    const moved = applyCommand(p, {
      type: "MOVE",
      ids: [second.selection[0], text],
      parentId: b,
    }).project;
    expect(moved.page.elements[b].children).toEqual([
      text,
      second.selection[0],
    ]);
    expect(moved.page.elements[second.selection[0]].geometry.flowIndex).toBe(1);
  });
  it("moves stable IDs between parents, enforces depth and legality, and rejects cycles without mutating input", () => {
    const { p, a, b, text } = fixture();
    const before = JSON.stringify(p);
    const moved = applyCommand(p, { type: "MOVE", ids: [text], parentId: b });
    expect(moved.project.page.elements[text].parentId).toBe(b);
    expect(moved.project.page.elements[a].children).toEqual([]);
    expect(() =>
      applyCommand(p, { type: "MOVE", ids: [a], parentId: text }),
    ).toThrow();
    const nested = add(p, "container", a);
    const deep = add(nested.project, "container", nested.selection[0]);
    const deepest = add(deep.project, "container", deep.selection[0]);
    expect(() => add(deepest.project, "heading", deepest.selection[0])).toThrow(
      /four|depth/i,
    );
    const list = add(p, "list");
    expect(() =>
      applyCommand(list.project, {
        type: "MOVE",
        ids: [text],
        parentId: list.selection[0],
      }),
    ).toThrow(/nest|list/i);
    expect(JSON.stringify(p)).toBe(before);
    expect(validateProject(moved.project)).toBe(moved.project);
  });
  it("protects inherited locks and independently locked descendants from parent transformations", () => {
    const { p, a, b, text } = fixture();
    const locked = applyCommand(p, {
      type: "PATCH",
      ids: [text],
      patch: { locked: true },
    }).project;
    for (const command of [
      { type: "DELETE", ids: [a] },
      { type: "MOVE", ids: [a], parentId: b },
      { type: "PATCH", ids: [a], patch: { layoutMode: "grid" } },
      { type: "GROUP", ids: [a, b] },
    ])
      expect(() => applyCommand(locked, command)).toThrow(/lock/i);
    const parentLock = applyCommand(p, {
      type: "PATCH",
      ids: [a],
      patch: { locked: true },
    }).project;
    expect(isLocked(parentLock, text)).toBe(true);
    expect(() =>
      applyCommand(parentLock, {
        type: "PATCH",
        ids: [text],
        patch: { locked: false },
      }),
    ).toThrow(/lock/i);
  });
  it("copies nested internal references with fresh IDs and unique HTML anchors, keeping outside targets", () => {
    let { p, a, text } = fixture();
    p = applyCommand(p, {
      type: "PATCH",
      ids: [text],
      patch: { htmlId: "inside" },
    }).project;
    const inside = add(p, "link", a);
    p = inside.project;
    p = applyCommand(p, {
      type: "PATCH",
      ids: inside.selection,
      patch: { props: { href: "#inside" } },
    }).project;
    const outside = add(p, "link", a);
    p = outside.project;
    p = applyCommand(p, {
      type: "PATCH",
      ids: outside.selection,
      patch: { props: { href: "#elsewhere" } },
    }).project;
    const result = applyCommand(p, {
      type: "PASTE",
      clipboard: captureClipboard(p, [a]),
      parentId: null,
    });
    const copied = result.project.page.elements[result.selection[0]];
    const nodes = copied.children.map((id) => result.project.page.elements[id]);
    expect(copied.id).not.toBe(a);
    expect(nodes.every((n) => !p.page.elements[n.id])).toBe(true);
    const copiedHeading = nodes.find((n) => n.type === "heading");
    expect(copiedHeading.htmlId).not.toBe("inside");
    expect(
      nodes.find((n) => n.props.href?.startsWith("#inside")).props.href,
    ).toBe(`#${copiedHeading.htmlId}`);
    expect(nodes.some((n) => n.props.href === "#elsewhere")).toBe(true);
    expect(validateProject(result.project)).toBe(result.project);
  });
  it("groups/ungroups as one transformation and recalculates absolute placements when unwrapping", () => {
    const { p, a, b } = fixture();
    const grouped = applyCommand(p, { type: "GROUP", ids: [a, b] });
    expect(
      grouped.project.page.elements[grouped.selection[0]].layout.group,
    ).toBe(true);
    const restored = applyCommand(grouped.project, {
      type: "UNGROUP",
      ids: grouped.selection,
    });
    expect(restored.project.page.rootElementIds).toEqual([a, b]);
    let abs = applyCommand(p, {
      type: "MODE",
      ids: [a],
      mode: "absolute",
      placements: { [a]: { x: 20, y: 10, width: 50, height: 60 } },
    }).project;
    const inner = add(abs, "container", a);
    abs = inner.project;
    abs = applyCommand(abs, {
      type: "MODE",
      ids: inner.selection,
      mode: "absolute",
      placements: {
        [inner.selection[0]]: { x: 10, y: 20, width: 50, height: 50 },
      },
    }).project;
    const unwrapped = applyCommand(abs, {
      type: "DELETE",
      ids: [a],
      mode: "unwrap",
    }).project.page.elements[inner.selection[0]];
    expect(unwrapped.parentId).toBe(null);
    expect(unwrapped.geometry).toMatchObject({
      x: 25,
      y: 22,
      width: 25,
      height: 30,
    });
  });
  it("retains insertion order and percentage coordinates across flow/freeform mode switches", () => {
    const { p, a } = fixture();
    const initial = { x: 11, y: 22, width: 40, height: 30 };
    const abs = applyCommand(p, {
      type: "MODE",
      ids: [a],
      mode: "absolute",
      placements: { [a]: initial },
    }).project;
    const flow = applyCommand(abs, {
      type: "MODE",
      ids: [a],
      mode: "flow",
    }).project;
    const again = applyCommand(flow, {
      type: "MODE",
      ids: [a],
      mode: "absolute",
    }).project;
    expect(again.page.elements[a].geometry).toMatchObject(initial);
    expect(flow.page.rootElementIds).toEqual(p.page.rootElementIds);
  });
  it("aligns/distributes compatible absolute siblings and blocks mixed contexts", () => {
    let { p, a, b } = fixture();
    const third = add(p, "container");
    p = third.project;
    const c = third.selection[0];
    for (const [id, x] of [
      [a, 0],
      [b, 30],
      [c, 80],
    ])
      p = applyCommand(p, {
        type: "MODE",
        ids: [id],
        mode: "absolute",
        placements: { [id]: { x, y: x, width: 10, height: 10 } },
      }).project;
    const result = applyCommand(p, {
      type: "ARRANGE",
      ids: [a, b, c],
      operation: "distributeX",
    }).project;
    expect(result.page.elements[b].geometry.x).toBe(40);
    expect(
      applyCommand(result, {
        type: "ARRANGE",
        ids: [a, b, c],
        operation: "top",
      }).project.page.elements[c].geometry.y,
    ).toBe(0);
    expect(() =>
      applyCommand(fixture().p, {
        type: "ARRANGE",
        ids: [a, b],
        operation: "left",
      }),
    ).toThrow();
  });
  it("migrates stored M1 projects to the new schema without altering existing content or IDs", () => {
    const current = createProject({ name: "M1", templateId: "portfolio" });
    const legacy = structuredClone(current);
    legacy.schemaVersion = 1;
    Object.values(legacy.page.elements).forEach((e) => {
      delete e.layout;
      delete e.geometry;
    });
    const original = JSON.stringify(legacy);
    const upgraded = migrateProject(legacy);
    expect(upgraded.schemaVersion).toBe(2);
    expect(upgraded.projectId).toBe(legacy.projectId);
    expect(upgraded.page).toEqual(current.page);
    expect(JSON.stringify(legacy)).toBe(original);
  });
});
