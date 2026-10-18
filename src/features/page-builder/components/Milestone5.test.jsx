/* @vitest-environment jsdom */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuilderProvider, { useBuilder } from "../state/BuilderProvider";
import QuickGuide from "./QuickGuide";
import TemplateReset from "./TemplateReset";
import { createProject } from "../domain/project";
import { createRepository, PROJECT_PREFIX } from "../domain/storage";

function Harness({ id }) {
  const { state, open, dispatch } = useBuilder();
  return (
    <>
      <QuickGuide />
      <button onClick={() => open(id)}>Open fixture</button>
      {state.editor && (
        <>
          <TemplateReset />
          <button onClick={() => dispatch({ type: "UNDO" })}>Undo</button>
          <output>{state.editor.project.page.metadata.title}</output>
        </>
      )}
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("M5 help and reset boundaries", () => {
  it("offers an optional guide, persists completion and restarts without overwriting dashboard settings", () => {
    const repo = createRepository(localStorage);
    repo.savePreferences({ view: "list", sort: "name" });
    render(
      <BuilderProvider>
        <Harness />
      </BuilderProvider>,
    );
    fireEvent.click(screen.getByText("Start quick guide"));
    const dialog = screen.getByRole("dialog", {
      name: "Page Builder quick guide",
    });
    for (let i = 0; i < 4; i++)
      fireEvent.click(within(dialog).getByText("Next step"));
    fireEvent.click(within(dialog).getByText("Finish guide"));
    expect(screen.queryByText("Start quick guide")).toBeNull();
    expect(repo.preferences()).toMatchObject({
      guideCompleted: true,
      view: "list",
      sort: "name",
    });
    repo.savePreferences({ view: "grid", sort: "updated" });
    expect(repo.preferences().guideCompleted).toBe(true);
    fireEvent.click(screen.getByText("Quick guide"));
    expect(screen.getByText("Step 1 of 5")).not.toBeNull();
  });
  it("aborts reset on backup quota failure, preserves saved bytes, then supports independent copy and undo", () => {
    const repo = createRepository(localStorage);
    const p = createProject({ name: "Work", templateId: "portfolio" });
    p.page.metadata.title = "Edited content";
    repo.create(p);
    const raw = repo.raw(PROJECT_PREFIX + p.projectId);
    render(
      <BuilderProvider>
        <Harness id={p.projectId} />
      </BuilderProvider>,
    );
    fireEvent.click(screen.getByText("Open fixture"));
    fireEvent.click(
      screen.getByRole("button", { name: "Reset to original template" }),
    );
    const write = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Full", "QuotaExceededError");
      });
    fireEvent.click(screen.getByText("Confirm template reset"));
    expect(screen.getByRole("alert").textContent).toMatch(
      /storage|quota|save/i,
    );
    expect(screen.getByText("Edited content")).not.toBeNull();
    expect(repo.raw(PROJECT_PREFIX + p.projectId)).toBe(raw);
    write.mockRestore();
    fireEvent.click(screen.getByText("Confirm template reset"));
    expect(screen.getByText("Work", { selector: "output" })).not.toBeNull();
    const copy = repo.list().projects.find((x) => x.projectId !== p.projectId);
    expect(copy.page.metadata.title).toBe("Edited content");
    expect(
      Object.keys(copy.page.elements).some((id) => p.page.elements[id]),
    ).toBe(false);
    fireEvent.click(screen.getByText("Undo", { selector: "button" }));
    expect(screen.getByText("Edited content")).not.toBeNull();
  });
  it("allows a reset without a copy and rejects ownership changes before a later confirmation", () => {
    const repo = createRepository(localStorage);
    const p = createProject({ name: "Stable identity" });
    p.page.metadata.title = "Edited";
    repo.create(p);
    render(
      <BuilderProvider>
        <Harness id={p.projectId} />
      </BuilderProvider>,
    );
    fireEvent.click(screen.getByText("Open fixture"));
    fireEvent.click(
      screen.getByRole("button", { name: "Reset to original template" }),
    );
    fireEvent.click(
      screen.getByLabelText(
        "Create an independent copy of my current work first",
      ),
    );
    fireEvent.click(screen.getByText("Confirm template reset"));
    expect(repo.list().projects).toHaveLength(1);
    expect(
      screen.getByText("Stable identity", { selector: "output" }),
    ).not.toBeNull();
    fireEvent.click(screen.getByText("Undo", { selector: "button" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Reset to original template" }),
    );
    repo.acquire(p.projectId, "another-owner", true);
    fireEvent.click(screen.getByText("Confirm template reset"));
    expect(screen.getByRole("alert").textContent).toMatch(/owner changed/);
    expect(repo.list().projects).toHaveLength(1);
    expect(screen.getByText("Edited", { selector: "output" })).not.toBeNull();
  });
});
