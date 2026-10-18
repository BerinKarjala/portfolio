import { describe, expect, it } from "vitest";
import { createProject, validateProject } from "./project";
import { resetToOrigin } from "./reset";
import { TEMPLATES } from "./templates";
import { builderReducer, initialState } from "../state/builderReducer";

describe("original-template reset (Q082, AC-01, AC-09)", () => {
  it("replaces all design/content with fresh template data while retaining project identity", () => {
    const original = createProject({
      name: "My work",
      templateId: "portfolio",
    });
    original.favorite = true;
    original.revision = 8;
    original.globalStyles.color = "#ff0000";
    original.page.metadata.title = "Edited";
    const bytes = JSON.stringify(original);
    const reset = resetToOrigin(original);
    validateProject(reset);
    for (const key of [
      "projectId",
      "name",
      "createdAt",
      "revision",
      "originTemplateId",
      "favorite",
      "status",
    ])
      expect(reset[key]).toEqual(original[key]);
    expect(reset.page.metadata.title).toBe("My work");
    expect(reset.globalStyles.color).not.toBe("#ff0000");
    expect(
      Object.keys(reset.page.elements).some((id) => original.page.elements[id]),
    ).toBe(false);
    expect(JSON.stringify(original)).toBe(bytes);
    expect(Object.isFrozen(TEMPLATES[1].sections)).toBe(true);
  });
  it("is one undoable action including metadata and preserves read-only state", () => {
    const p = createProject({ templateId: "blank" });
    p.page.metadata.title = "Keep me";
    let s = builderReducer(initialState, { type: "OPEN", project: p });
    s = builderReducer(s, { type: "RESET_TEMPLATE" });
    expect(s.editor.past).toHaveLength(1);
    expect(s.editor.dirty).toBe(true);
    s = builderReducer(s, { type: "UNDO" });
    expect(s.editor.project).toEqual(p);
    s = builderReducer(s, { type: "REDO" });
    expect(s.editor.project.page.metadata.title).toBe(p.name);
    const locked = { ...s, editor: { ...s.editor, readOnly: true } };
    expect(builderReducer(locked, { type: "RESET_TEMPLATE" })).toBe(locked);
  });
});
