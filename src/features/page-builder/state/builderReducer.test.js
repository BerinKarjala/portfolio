import { describe, expect, it } from "vitest";
import { createProject } from "../domain/project";
import { builderReducer, initialState } from "./builderReducer";

describe("builder state", () => {
  it("keeps project edits in memory while a failed save or takeover pauses writing", () => {
    const project = createProject({ name: "First" });
    let state = builderReducer(initialState, {
      type: "OPEN",
      project,
      readOnly: false,
    });
    state = builderReducer(state, {
      type: "EDIT_METADATA",
      patch: { title: "Unsaved title" },
    });
    state = builderReducer(state, {
      type: "SAVE_FAILED",
      message: "Quota exceeded",
    });
    expect(state.editor.project.page.metadata.title).toBe("Unsaved title");
    expect(state.editor.dirty).toBe(true);
    state = builderReducer(state, {
      type: "READ_ONLY",
      message: "Another tab",
    });
    const unchanged = builderReducer(state, {
      type: "EDIT_METADATA",
      patch: { title: "Blocked" },
    });
    expect(unchanged.editor.project.page.metadata.title).toBe("Unsaved title");
    expect(unchanged.editor.dirty).toBe(true);
  });

  it("clears dirty state only on a successful save and resets editor state on switch", () => {
    const project = createProject({ name: "A" });
    let state = builderReducer(initialState, {
      type: "OPEN",
      project,
      readOnly: false,
    });
    state = builderReducer(state, {
      type: "EDIT_METADATA",
      patch: { title: "Updated" },
    });
    state = builderReducer(state, {
      type: "SAVED",
      project: { ...state.editor.project, revision: 1 },
    });
    expect(state.editor.dirty).toBe(false);
    expect(state.editor.status).toBe("saved");
    state = builderReducer(state, {
      type: "OPEN",
      project: createProject({ name: "B" }),
      readOnly: true,
    });
    expect(state.editor.project.name).toBe("B");
    expect(state.editor.dirty).toBe(false);
  });
});
