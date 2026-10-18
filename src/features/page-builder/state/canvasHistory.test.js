import { describe, expect, it } from "vitest";
import { createProject } from "../domain/project";
import { builderReducer, initialState } from "./builderReducer";

const open = () =>
  builderReducer(initialState, {
    type: "OPEN",
    project: createProject({ name: "History" }),
    readOnly: false,
  });
const add = (state) =>
  builderReducer(state, {
    type: "COMMAND",
    command: { type: "ADD", component: "heading", parentId: null },
    now: 100,
  });
describe("session history and UI separation", () => {
  it("undoes one gesture/command atomically, preserves current storage revision, and clears redo after a new edit", () => {
    let s = add(open());
    const id = s.editor.selection[0];
    s = builderReducer(s, {
      type: "SAVED",
      project: { ...s.editor.project, revision: 8 },
    });
    s = builderReducer(s, { type: "UNDO" });
    expect(s.editor.project.page.rootElementIds).toEqual([]);
    expect(s.editor.project.revision).toBe(8);
    s = builderReducer(s, { type: "REDO" });
    expect(s.editor.project.page.rootElementIds).toEqual([id]);
    s = builderReducer(s, { type: "UNDO" });
    s = add(s);
    expect(s.editor.future).toEqual([]);
  });
  it("coalesces typing but not separate structural actions, limits history to 50 and never persists it", () => {
    let s = add(open());
    const id = s.editor.selection[0];
    for (const [now, name] of [
      [1000, "A"],
      [1200, "AB"],
      [1400, "ABC"],
    ])
      s = builderReducer(s, {
        type: "COMMAND",
        command: { type: "PATCH", ids: [id], patch: { name } },
        historyKey: `name:${id}`,
        now,
      });
    expect(s.editor.past).toHaveLength(2);
    s = builderReducer(s, { type: "UNDO" });
    expect(s.editor.project.page.elements[id].name).toBe("Heading");
    for (let i = 0; i < 55; i++) s = add(s);
    expect(s.editor.past).toHaveLength(50);
    expect(s.editor.project.past).toBeUndefined();
    s = builderReducer(s, {
      type: "OPEN",
      project: s.editor.project,
      readOnly: false,
    });
    expect(s.editor.past).toEqual([]);
  });
  it("selection does not dirty content or history; rejected transformations keep healthy state intact", () => {
    let s = add(open());
    const id = s.editor.selection[0];
    s = builderReducer(s, { type: "SAVED", project: s.editor.project });
    s = builderReducer(s, { type: "SELECT", ids: [id] });
    expect(s.editor.dirty).toBe(false);
    expect(s.editor.past).toHaveLength(1);
    const original = JSON.stringify(s.editor.project);
    s = builderReducer(s, {
      type: "COMMAND",
      command: { type: "MOVE", ids: [id], parentId: id },
    });
    expect(JSON.stringify(s.editor.project)).toBe(original);
    expect(s.editor.commandError).toMatch(/Cannot move/);
    s = builderReducer(s, { type: "READ_ONLY", message: "Owner changed" });
    const blocked = add(s);
    expect(blocked.editor.project).toBe(s.editor.project);
  });
});
