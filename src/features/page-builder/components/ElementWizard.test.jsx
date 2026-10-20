/* @vitest-environment jsdom */
import { useEffect } from "react";
import {
  act,
  cleanup,
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuilderProvider, { useBuilder } from "../state/BuilderProvider";
import { createProject } from "../domain/project";
import { applyCommand } from "../domain/structure";
import { createRepository } from "../domain/storage";
import Editor from "./Editor";
import { COMPONENTS } from "../domain/catalog";
import { safeWizardPreview } from "./ElementWizard";
configure({ getElementError: (message) => new Error(message.split("\n")[0]) });

let projectId, targetId, latest, api;
function Session() {
  const builder = useBuilder();
  api = builder;
  latest = builder.state;
  useEffect(() => {
    builder.open(projectId);
  }, []);
  return builder.state.editor ? <Editor /> : null;
}
function start(type = "image", linked = false) {
  let project = createProject({ name: "Wizard integration" }),
    parentId;
  if (type === "listItem") {
    const list = applyCommand(project, { type: "ADD", component: "list" });
    project = list.project;
    parentId = list.selection[0];
  }
  let result = applyCommand(project, {
    type: "ADD",
    component: type,
    parentId,
  });
  targetId = result.selection[0];
  if (linked)
    result = applyCommand(result.project, {
      type: "MASTER_CREATE",
      ids: [targetId],
      name: "Shared card",
    });
  projectId = result.project.projectId;
  createRepository(localStorage).create(result.project);
  render(
    <BuilderProvider>
      <div className="pb-root">
        <Session />
      </div>
    </BuilderProvider>,
  );
  return structuredClone(result.project);
}
const wand = () =>
  screen.getByRole("button", { name: "Configure an element", exact: true });
function open(type = "image") {
  fireEvent.click(wand());
  fireEvent.click(screen.getByTestId(`canvas-${type}`));
  const name = COMPONENTS.find((item) => item.type === type).name;
  return screen.getByRole("dialog", {
    name: new RegExp(`Configure ${name}`, "i"),
  });
}
function edit(dialog, label, value) {
  const input = within(dialog).getByLabelText(label, { exact: true });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}
const next = (dialog) =>
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Next: apply step" }),
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("element configuration wizard", () => {
  it.each(COMPONENTS.map(({ type }) => type))(
    "offers a complete no-op configuration for %s without changing existing content",
    (type) => {
      const original = start(type);
      const dialog = open(type);
      let button;
      for (let count = 0; count < 5; count++) {
        button = within(dialog).queryByRole("button", {
          name: "Next: apply step",
        });
        if (!button) break;
        fireEvent.click(button);
      }
      expect(
        within(dialog).getByRole("button", { name: "Finish", exact: true }),
      ).toBeTruthy();
      expect(latest.editor.project.page).toEqual(original.page);
      expect(latest.editor.past).toHaveLength(0);
    },
  );
  it("arms without opening for a selected target, then opens exactly one named wizard", () => {
    start();
    fireEvent.click(screen.getByTestId("canvas-image"));
    fireEvent.click(wand());
    expect(
      screen.queryByRole("dialog", { name: /Configure image/i }),
    ).toBeNull();
    expect(screen.getByText("Choose an element to configure.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("canvas-image"));
    expect(
      screen.getAllByRole("dialog", { name: /Configure image/i }),
    ).toHaveLength(1);
    expect(latest.editor.past).toHaveLength(0);
  });

  it("applies completed steps immediately, leaves pending inputs local, and undoes one step at a time", () => {
    const original = start();
    const dialog = open();
    edit(dialog, "Image description", "Mountain trail");
    expect(latest.editor.project.page.elements[targetId].props.alt).toBe(
      original.page.elements[targetId].props.alt,
    );
    next(dialog);
    expect(latest.editor.project.page.elements[targetId].props.alt).toBe(
      "Mountain trail",
    );
    expect(latest.editor.past).toHaveLength(1);
    edit(dialog, "Width", "75%");
    edit(dialog, "Padding", "2rem");
    expect(
      latest.editor.project.page.elements[targetId].styles.overrides.width,
    ).toBeUndefined();
    next(dialog);
    expect(
      latest.editor.project.page.elements[targetId].styles.overrides,
    ).toMatchObject({ width: "75%", padding: "2rem" });
    expect(latest.editor.past).toHaveLength(2);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close wizard" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo", exact: true }));
    expect(latest.editor.project.page.elements[targetId].props.alt).toBe(
      "Mountain trail",
    );
    expect(latest.editor.project.page.elements[targetId].styles).toEqual(
      original.page.elements[targetId].styles,
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo", exact: true }));
    expect(latest.editor.project.page).toEqual(original.page);
  });

  it("closes with completed changes retained and unfinished entries discarded", () => {
    start();
    const dialog = open();
    edit(dialog, "Image description", "Applied description");
    next(dialog);
    edit(dialog, "Width", "42%");
    fireEvent.keyDown(within(dialog).getByLabelText("Width", { exact: true }), {
      key: "Escape",
    });
    expect(
      screen.queryByRole("dialog", { name: /Configure image/i }),
    ).toBeNull();
    expect(latest.editor.project.page.elements[targetId].props.alt).toBe(
      "Applied description",
    );
    expect(
      latest.editor.project.page.elements[targetId].styles.overrides.width,
    ).toBeUndefined();
    expect(latest.editor.past).toHaveLength(1);
  });

  it("rejects unsafe content without advancing or committing other fields", () => {
    const original = start();
    const dialog = open();
    edit(dialog, "Image URL", "javascript:alert(1)");
    edit(dialog, "Image description", "Keep in draft");
    next(dialog);
    expect(within(dialog).getByRole("alert").textContent).toMatch(
      /unsafe|url/i,
    );
    expect(within(dialog).getByLabelText("Image description").value).toBe(
      "Keep in draft",
    );
    expect(latest.editor.project.page).toEqual(original.page);
    expect(latest.editor.past).toHaveLength(0);
  });

  it("keeps Advanced optional and reveals invalid Advanced fields without losing them", async () => {
    start();
    const dialog = open();
    next(dialog);
    const advanced = within(dialog)
      .getByText("Advanced layout")
      .closest("details");
    expect(advanced.open).toBe(false);
    fireEvent.click(within(advanced).getByText("Advanced layout"));
    edit(dialog, "Max width", "not-a-css-length");
    advanced.open = false;
    next(dialog);
    await waitFor(() => expect(advanced.open).toBe(true));
    expect(within(dialog).getByRole("alert")).toBeTruthy();
    expect(within(dialog).getByLabelText("Max width").value).toBe(
      "not-a-css-length",
    );
    expect(latest.editor.past).toHaveLength(0);
  });

  it("targets a hidden element through Layers with Enter, rather than opening on focus movement", () => {
    start();
    fireEvent.click(
      screen.getByRole("button", { name: "Layers", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Hide Image", exact: true }),
    );
    fireEvent.click(wand());
    const layer = screen.getByRole("treeitem", { name: "Image", exact: true });
    layer.focus();
    fireEvent.keyDown(layer, { key: "ArrowDown" });
    expect(
      screen.queryByRole("dialog", { name: /Configure image/i }),
    ).toBeNull();
    fireEvent.keyDown(layer, { key: "Enter" });
    expect(
      screen.getByRole("dialog", { name: /Configure image/i }),
    ).toBeTruthy();
  });

  it("reduces linked-copy steps to local overrides and preserves the shared master", () => {
    const original = start("card", true);
    const dialog = open("card");
    expect(within(dialog).getByText(/local overrides only/i)).toBeTruthy();
    expect(within(dialog).queryByLabelText("Element name")).toBeNull();
    edit(dialog, "Width", "24rem");
    next(dialog);
    expect(
      latest.editor.project.page.elements[targetId].styles.overrides.width,
    ).toBe("24rem");
    expect(latest.editor.project.masters).toEqual(original.masters);
    expect(latest.editor.project.page.elements[targetId].instance).toEqual(
      original.page.elements[targetId].instance,
    );
  });

  it("switches phone Settings/Preview without applying or resetting the draft", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      })),
    );
    start();
    const dialog = open();
    edit(dialog, "Image description", "Pending description");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Preview", exact: true }),
    );
    expect(
      within(dialog)
        .getByTitle("Element configuration preview")
        .getAttribute("sandbox"),
    ).toBe("");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Settings", exact: true }),
    );
    expect(within(dialog).getByLabelText("Image description").value).toBe(
      "Pending description",
    );
    expect(latest.editor.project.page.elements[targetId].props.alt).not.toBe(
      "Pending description",
    );
    expect(latest.editor.past).toHaveLength(0);
  });

  it.each(["form", "table", "gallery"])(
    "keeps %s collection edits local and preserves identity on completion",
    (type) => {
      const original = start(type);
      const dialog = open(type);
      const labels = {
        form: "Field 1 label",
        table: "Cell 1, 1",
        gallery: "Gallery image 1 caption",
      };
      edit(dialog, labels[type], "Updated in wizard");
      expect(latest.editor.project.page).toEqual(original.page);
      next(dialog);
      const element = latest.editor.project.page.elements[targetId];
      expect(element.id).toBe(targetId);
      expect(latest.editor.past).toHaveLength(1);
      if (type === "form") {
        expect(element.props.fields[0].id).toBe(
          original.page.elements[targetId].props.fields[0].id,
        );
        expect(element.props.fields[0].label).toBe("Updated in wizard");
      }
      if (type === "table")
        expect(element.props.rows[0][0]).toBe("Updated in wizard");
      if (type === "gallery") {
        expect(element.props.images[0].id).toBe(
          original.page.elements[targetId].props.images[0].id,
        );
        expect(element.props.images[0].caption).toBe("Updated in wizard");
      }
    },
  );

  it("preserves drafts when Back is used and adds no history for unchanged steps or Finish", () => {
    start();
    const dialog = open();
    next(dialog);
    edit(dialog, "Width", "62%");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Back", exact: true }),
    );
    next(dialog);
    expect(within(dialog).getByLabelText("Width", { exact: true }).value).toBe(
      "62%",
    );
    next(dialog);
    next(dialog);
    next(dialog);
    expect(latest.editor.past).toHaveLength(1);
    expect(
      within(dialog).getByText("These changes are already applied"),
    ).toBeTruthy();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Finish", exact: true }),
    );
    expect(latest.editor.past).toHaveLength(1);
  });

  it("retains pending inputs after an external target update and requires an explicit reload", () => {
    start();
    const dialog = open();
    edit(dialog, "Image description", "Unfinished input");
    act(() =>
      api.sendCommand({
        type: "PATCH",
        ids: [targetId],
        patch: { name: "Changed elsewhere" },
      }),
    );
    expect(within(dialog).getByRole("alert").textContent).toMatch(
      /outside the wizard/i,
    );
    expect(within(dialog).getByLabelText("Image description").value).toBe(
      "Unfinished input",
    );
    expect(
      within(dialog).getByRole("button", { name: "Next: apply step" }).disabled,
    ).toBe(true);
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Reload current settings/ }),
    );
    expect(within(dialog).getByLabelText("Image description").value).not.toBe(
      "Unfinished input",
    );
    expect(latest.editor.past).toHaveLength(1);
  });

  it("rechecks editing ownership at completion and retains the unfinished draft", () => {
    const original = start();
    const dialog = open();
    edit(dialog, "Image description", "Pending input");
    const ownership = vi.spyOn(api.repository, "owns").mockReturnValue(false);
    next(dialog);
    expect(latest.editor.readOnly).toBe(true);
    expect(latest.editor.project.page).toEqual(original.page);
    expect(latest.editor.past).toHaveLength(0);
    expect(within(dialog).getByLabelText("Image description").value).toBe(
      "Pending input",
    );
    ownership.mockRestore();
  });

  it("rejects an invalid color without silently discarding it or committing other appearance fields", () => {
    const original = start();
    const dialog = open();
    next(dialog);
    next(dialog);
    edit(dialog, "Color", "not-a-color");
    edit(dialog, "Font size", "2rem");
    next(dialog);
    expect(within(dialog).getByRole("alert")).toBeTruthy();
    expect(within(dialog).getByLabelText("Color", { exact: true }).value).toBe(
      "not-a-color",
    );
    expect(latest.editor.project.page).toEqual(original.page);
  });

  it("keeps the picker armed on empty canvas and rejects a locked target without editing", () => {
    start();
    act(() =>
      api.sendCommand({
        type: "PATCH",
        ids: [targetId],
        patch: { locked: true },
      }),
    );
    const original = structuredClone(latest.editor.project);
    fireEvent.click(wand());
    fireEvent.click(screen.getByTestId("canvas-scroll"));
    expect(wand().getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("canvas-image"));
    expect(screen.getByRole("alert").textContent).toMatch(/unlock/i);
    expect(latest.editor.project).toEqual(original);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(wand().getAttribute("aria-pressed")).toBe("false");
  });

  it("returns focus from the opaque preview even when the host window does not emit blur", async () => {
    start();
    const dialog = open();
    const frame = within(dialog).getByTitle("Element configuration preview");
    frame.focus();
    expect(document.activeElement).toBe(frame);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole("group", { name: "Read-only page preview" }),
      ),
    );
  });

  it("lets Done dismiss an abandoned text-formatting error before completing the valid document", () => {
    start("heading");
    const dialog = open("heading");
    fireEvent.click(within(dialog).getByText("Advanced text formatting"));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Bold", exact: true }),
    );
    expect(within(dialog).getByRole("alert").textContent).toMatch(
      /select text/i,
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Done editing text" }),
    );
    next(dialog);
    expect(within(dialog).getByText(/Step 2 of/)).toBeTruthy();
    expect(latest.editor.past).toHaveLength(0);
  });

  it("reports a failed save without losing an applied step or reporting false success", () => {
    const original = start();
    const dialog = open();
    edit(dialog, "Image description", "Applied but unsaved");
    next(dialog);
    const save = vi.spyOn(api.repository, "save").mockImplementation(() => {
      throw new Error("Storage quota exceeded");
    });
    act(() => api.saveNow());
    expect(
      within(dialog).getByText(/Applied in memory · save failed/),
    ).toBeTruthy();
    expect(latest.editor.project.page.elements[targetId].props.alt).toBe(
      "Applied but unsaved",
    );
    expect(
      JSON.parse(localStorage.getItem(`page-builder:project:${projectId}`))
        .page,
    ).toEqual(original.page);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close wizard" }),
    );
    expect(latest.editor.past).toHaveLength(1);
    expect(latest.editor.status).toBe("failed");
    save.mockRestore();
  });

  it("retains the unfinished draft after target deletion and closes safely", () => {
    start();
    const dialog = open();
    edit(dialog, "Image description", "Keep for recovery");
    act(() => api.sendCommand({ type: "DELETE", ids: [targetId] }));
    expect(within(dialog).getByRole("alert").textContent).toMatch(
      /no longer exists/i,
    );
    expect(within(dialog).getByLabelText("Image description").value).toBe(
      "Keep for recovery",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close wizard" }),
    );
    expect(document.activeElement).toBe(wand());
  });
});

it("keeps all preview links, media, scripts and submissions inert", () => {
  let project = createProject({ name: "Preview security" });
  for (const type of ["link", "form", "video", "audio", "embed"]) {
    const result = applyCommand(project, { type: "ADD", component: type });
    project = result.project;
    if (["video", "audio"].includes(type))
      project = applyCommand(project, {
        type: "PATCH",
        ids: result.selection,
        patch: { props: { autoplay: true, muted: true } },
      }).project;
  }
  const html = new DOMParser().parseFromString(
    safeWizardPreview(project),
    "text/html",
  );
  expect(
    html.querySelectorAll(
      "a[href], form[action], video[autoplay], audio[autoplay], script, iframe",
    ),
  ).toHaveLength(0);
  expect(
    [...html.querySelectorAll("input,button,textarea,select")].every(
      (input) => input.disabled,
    ),
  ).toBe(true);
  expect(
    html.querySelector('meta[http-equiv="Content-Security-Policy"]').content,
  ).toContain("script-src 'none'");
});
