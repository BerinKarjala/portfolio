import { describe, expect, it } from "vitest";
import { createProject, documentText } from "./project";
import { applyCommand } from "./structure";
import { builderReducer, initialState } from "../state/builderReducer";

function fixture(type = "image") {
  const result = applyCommand(createProject({ name: "Wizard" }), {
    type: "ADD",
    component: type,
  });
  return { project: result.project, id: result.selection[0] };
}
const configure = (project, id, step, changes) => ({
  type: "CONFIGURE_ELEMENT",
  ids: [id],
  projectId: project.projectId,
  baseline: structuredClone(project.page.elements[id]),
  step,
  changes,
});

describe("wizard step transactions (WIZ-05, WIZ-06, WIZ-14 to WIZ-16)", () => {
  it("applies all fields together without changing identities, children or unrelated content", () => {
    const { project, id } = fixture();
    const before = structuredClone(project);
    const result = applyCommand(
      project,
      configure(project, id, "content", {
        props: {
          src: "https://example.com/updated.jpg",
          alt: "Mountain trail",
        },
        accessibility: { decorative: false },
      }),
    );
    expect(result.project.page.elements[id]).toMatchObject({
      id,
      children: [],
      props: { src: "https://example.com/updated.jpg", alt: "Mountain trail" },
    });
    expect(project).toEqual(before);
    expect(result.project.page.metadata).toEqual(project.page.metadata);
    expect(result.project.masters).toEqual(project.masters);
  });

  it("rejects an invalid whole step without applying its other fields", () => {
    const { project, id } = fixture();
    const before = structuredClone(project);
    expect(() =>
      applyCommand(
        project,
        configure(project, id, "content", {
          props: { alt: "Valid description", src: "javascript:alert(1)" },
        }),
      ),
    ).toThrow(/unsafe|url/i);
    expect(project).toEqual(before);
  });

  it("rejects fields owned by another step and structural or lock changes", () => {
    const { project, id } = fixture();
    for (const changes of [
      { props: { alt: "Wrong step" } },
      { parentId: null },
      { locked: true },
      { instance: null },
    ])
      expect(() =>
        applyCommand(project, configure(project, id, "layout", changes)),
      ).toThrow(/step|unsupported|allowed/i);
  });

  it("ignores autosave bookkeeping for staleness but rejects a changed or missing target", () => {
    const { project, id } = fixture();
    const command = configure(project, id, "layout", {
      styles: { overrides: { width: "75%" } },
    });
    expect(
      applyCommand({ ...project, revision: 7 }, command).project.page.elements[
        id
      ].styles.overrides.width,
    ).toBe("75%");
    const changed = applyCommand(project, {
      type: "PATCH",
      ids: [id],
      patch: { name: "Changed elsewhere" },
    }).project;
    expect(() => applyCommand(changed, command)).toThrow(/changed|stale/i);
    const deleted = applyCommand(project, {
      type: "DELETE",
      ids: [id],
    }).project;
    expect(() => applyCommand(deleted, command)).toThrow(/missing|exist/i);
    expect(() =>
      applyCommand(project, { ...command, projectId: "another-project" }),
    ).toThrow(/project/i);
  });

  it("protects an inherited lock and a locked descendant", () => {
    let { project, id } = fixture("container");
    const child = applyCommand(project, {
      type: "ADD",
      component: "heading",
      parentId: id,
    });
    project = applyCommand(child.project, {
      type: "PATCH",
      ids: child.selection,
      patch: { locked: true },
    }).project;
    expect(() =>
      applyCommand(
        project,
        configure(project, id, "layout", {
          styles: { overrides: { padding: "2rem" } },
        }),
      ),
    ).toThrow(/lock/i);
  });

  it("changes only allowed local overrides on a linked copy and rejects mixed local/shared changes", () => {
    let { project, id } = fixture("card");
    project = applyCommand(project, {
      type: "MASTER_CREATE",
      ids: [id],
      name: "Card",
    }).project;
    const masterId = project.page.elements[id].instance.masterId;
    const sibling = applyCommand(project, { type: "MASTER_INSERT", masterId });
    project = sibling.project;
    const before = structuredClone(project);
    const sized = applyCommand(
      project,
      configure(project, id, "layout", {
        styles: { overrides: { width: "24rem", maxWidth: "100%" } },
      }),
    ).project;
    expect(sized.page.elements[id].styles.overrides.width).toBe("24rem");
    expect(sized.masters).toEqual(before.masters);
    expect(sized.page.elements[sibling.selection[0]]).toEqual(
      before.page.elements[sibling.selection[0]],
    );
    expect(sized.page.elements[id].instance).toEqual(
      before.page.elements[id].instance,
    );
    expect(() =>
      applyCommand(
        project,
        configure(project, id, "layout", {
          styles: { overrides: { width: "24rem", padding: "3rem" } },
        }),
      ),
    ).toThrow(/linked|override|master/i);
    expect(project).toEqual(before);
  });

  it("creates no new project when completing an unchanged step", () => {
    const { project, id } = fixture();
    const result = applyCommand(
      project,
      configure(project, id, "content", {
        props: { ...project.page.elements[id].props },
      }),
    );
    expect(result.project).toBe(project);
  });
});

describe("wizard history boundaries (WIZ-10, WIZ-20)", () => {
  it("keeps fast completed steps separate even if supplied the same coalescing key", () => {
    const { project, id } = fixture("heading");
    let state = builderReducer(initialState, {
      type: "OPEN",
      project,
      selection: [id],
      readOnly: false,
    });
    const first = configure(state.editor.project, id, "content", {
      props: { document: documentText("Updated heading") },
    });
    state = builderReducer(state, {
      type: "COMMAND",
      command: first,
      historyKey: "wizard",
      now: 100,
    });
    expect(state.editor.commandError).toBe("");
    const afterFirst = state.editor.project;
    state = builderReducer(state, {
      type: "COMMAND",
      command: configure(afterFirst, id, "appearance", {
        styles: { overrides: { color: "#123456", fontWeight: 600 } },
      }),
      historyKey: "wizard",
      now: 101,
    });
    expect(state.editor.past).toHaveLength(2);
    state = builderReducer(state, { type: "UNDO" });
    expect(state.editor.project.page).toEqual(afterFirst.page);
    state = builderReducer(state, { type: "UNDO" });
    expect(state.editor.project.page).toEqual(project.page);
    state = builderReducer(state, { type: "REDO" });
    state = builderReducer(state, { type: "REDO" });
    expect(state.editor.project.page.elements[id].styles.overrides.color).toBe(
      "#123456",
    );
  });

  it("rejects wizard commands while master editing is active", () => {
    const { project, id } = fixture();
    let state = builderReducer(initialState, {
      type: "OPEN",
      project,
      selection: [id],
      readOnly: false,
    });
    state = {
      ...state,
      editor: {
        ...state.editor,
        masterEdit: { rootId: id, masterId: "master" },
      },
    };
    state = builderReducer(state, {
      type: "COMMAND",
      command: configure(project, id, "content", { props: { alt: "Blocked" } }),
    });
    expect(state.editor.project).toBe(project);
    expect(state.editor.commandError).toMatch(/master/i);
    expect(state.editor.past).toHaveLength(0);
  });
});
