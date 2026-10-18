/* @vitest-environment jsdom */
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuilderProvider, { useBuilder } from "../state/BuilderProvider";
import { createProject } from "../domain/project";
import { createRepository } from "../domain/storage";
import Editor from "./Editor";

let id;
function Session() {
  const { state, open } = useBuilder();
  useEffect(() => {
    open(id);
  }, []);
  return state.editor ? <Editor /> : null;
}
function start() {
  render(
    <BuilderProvider>
      <div className="pb-root">
        <Session />
      </div>
    </BuilderProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  const p = createProject({ name: "Canvas" });
  createRepository(localStorage).create(p);
  id = p.projectId;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("canvas controls and non-pointer alternatives", () => {
  it("inserts into the selected container, auto-selects content, and undoes/redoes one structural command", () => {
    start();
    fireEvent.click(
      screen.getByRole("button", { name: "Add Container", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Heading", exact: true }),
    );
    expect(screen.getByLabelText("Element name").value).toBe("Heading");
    expect(screen.getByLabelText("Text content").value).toBe("Your heading");
    fireEvent.click(screen.getByRole("button", { name: "Undo", exact: true }));
    expect(screen.queryByTestId("canvas-heading")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Redo", exact: true }));
    expect(screen.getByTestId("canvas-heading")).not.toBeNull();
  });
  it("supports Layers selection, inherited locks, and context-aware keyboard copy/paste", () => {
    start();
    fireEvent.click(
      screen.getByRole("button", { name: "Add Container", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Heading", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Layers", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Lock Container", exact: true }),
    );
    expect(screen.getByLabelText("Text content").matches(":disabled")).toBe(
      true,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Unlock Container", exact: true }),
    );
    screen.getByLabelText("Text content").focus();
    fireEvent.keyDown(screen.getByLabelText("Text content"), {
      key: "z",
      ctrlKey: true,
    });
    expect(screen.getByTestId("canvas-heading")).not.toBeNull();
    document.activeElement.blur();
    fireEvent.keyDown(document.body, { key: "c", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "v", ctrlKey: true });
    expect(screen.getAllByTestId("canvas-heading")).toHaveLength(2);
  });
});

it("commits the released canvas-width coordinate even without its final move event and rolls back cancellation", () => {
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      constructor(type, options = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
      }
    },
  );
  start();
  const handle = screen.getByRole("button", {
    name: "Resize canvas width",
    exact: true,
  });
  handle.setPointerCapture = () => {};
  handle.releasePointerCapture = () => {};
  const field = screen.getByLabelText("Custom canvas width", { exact: true });
  const before = Number(field.value),
    zoom = Number(screen.getByLabelText("Zoom", { exact: true }).value) / 100;
  fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
  fireEvent.pointerMove(handle, { clientX: 120, pointerId: 1 });
  expect(Number(field.value)).toBe(Math.round(before + 20 / zoom));
  fireEvent.pointerUp(handle, { clientX: 130, pointerId: 1 });
  expect(Number(field.value)).toBe(Math.round(before + 30 / zoom));
  const committed = Number(field.value);
  fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 2 });
  fireEvent.pointerMove(handle, { clientX: 160, pointerId: 2 });
  fireEvent.pointerCancel(handle, { clientX: 160, pointerId: 2 });
  expect(Number(field.value)).toBe(committed);
  expect(
    screen.getByRole("button", { name: "Undo", exact: true }).disabled,
  ).toBe(true);
});
