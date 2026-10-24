/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import BuilderProvider, { useBuilder } from "./BuilderProvider";
import { createProject } from "../domain/project";
import { createRepository, PROJECT_PREFIX } from "../domain/storage";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function setup() {
  const project = createProject({ name: "Save coordination" });
  createRepository(localStorage).create(project);
  const results = [];
  function Controls() {
    const { state, open, dispatch, saveNow } = useBuilder();
    return (
      <>
        <button onClick={() => open(project.projectId)}>Open</button>
        <button onClick={() => dispatch({
          type: "EDIT_METADATA", patch: { title: "Edited" },
        })}>Edit</button>
        <button onClick={() => {
          results.push(saveNow());
          window.dispatchEvent(new Event("focus"));
          results.push(saveNow());
        }}>Save twice</button>
        <output>{JSON.stringify(state.editor)}</output>
      </>
    );
  }
  render(<BuilderProvider><Controls /></BuilderProvider>);
  fireEvent.click(screen.getByText("Open"));
  fireEvent.click(screen.getByText("Edit"));
  return {
    project,
    results,
    editor: () => JSON.parse(screen.getByRole("status").textContent),
  };
}

it("coordinates consecutive saves before React renders the persisted revision", () => {
  const { project, results, editor } = setup();
  fireEvent.click(screen.getByText("Save twice"));
  expect(results).toEqual([true, true]);
  expect(editor().readOnly).toBe(false);
  expect(editor().dirty).toBe(false);
  const stored = JSON.parse(localStorage.getItem(PROJECT_PREFIX + project.projectId));
  expect(stored.revision).toBe(1);
  expect(stored.page.metadata.title).toBe("Edited");
});

it("still rejects an actual external revision change without overwriting it", () => {
  const { project, results, editor } = setup();
  const external = { ...project, revision: project.revision + 1 };
  localStorage.setItem(PROJECT_PREFIX + project.projectId, JSON.stringify(external));
  fireEvent.click(screen.getByText("Save twice"));
  expect(results).toEqual([false, false]);
  expect(editor().readOnly).toBe(true);
  expect(editor().dirty).toBe(true);
  expect(JSON.parse(localStorage.getItem(PROJECT_PREFIX + project.projectId))).toEqual(external);
});
