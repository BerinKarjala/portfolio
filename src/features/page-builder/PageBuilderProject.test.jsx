/* @vitest-environment jsdom */
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PageBuilderProject from "./PageBuilderProject";
import { createProject } from "./domain/project";
import { createRepository, PROJECT_PREFIX } from "./domain/storage";
import { createBackup } from "./domain/backups";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <PageBuilderProject />
      </MemoryRouter>
    </HelmetProvider>,
  );
async function launch() {
  const launcher = screen.getByRole("button", { name: /open page builder/i });
  launcher.focus();
  fireEvent.click(launcher);
  // The first launch also compiles/loads the lazy workspace in the test runtime.
  return screen.findByRole(
    "dialog",
    { name: "Page Builder" },
    { timeout: 5000 },
  );
}
async function create(name = "My website") {
  fireEvent.click(screen.getByRole("button", { name: /new project/i }));
  const form = await screen.findByRole("dialog", { name: "Create a project" });
  fireEvent.change(within(form).getByLabelText("Project name"), {
    target: { value: name },
  });
  fireEvent.click(within(form).getByRole("button", { name: "Create project" }));
  await screen.findByRole("heading", { name });
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("portfolio launcher and dashboard (AC-01, AC-09, AC-13)", () => {
  it("uses the standard source panel, launches full screen, and restores launcher focus", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Page Builder Source" }),
    ).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    const workspace = await launch();
    expect(
      within(workspace).getByRole("heading", { name: "Your projects" }),
    ).not.toBeNull();
    fireEvent.click(
      within(workspace).getByRole("button", { name: "Close Page Builder" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /open page builder/i }),
    );
  });

  it("creates, autosaves, and reopens a project with isolated local persistence", async () => {
    renderPage();
    await launch();
    await create();
    const title = screen.getByLabelText("Page title");
    fireEvent.change(title, { target: { value: "My saved page" } });
    expect(
      screen.getByRole("status", { name: "Save status" }).textContent,
    ).toMatch(/unsaved/i);
    await waitFor(
      () =>
        expect(
          screen.getByRole("status", { name: "Save status" }).textContent,
        ).toMatch(/^saved/i),
      { timeout: 2500 },
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Open My website" }));
    expect(screen.getByLabelText("Page title").value).toBe("My saved page");
    const stored = createRepository(localStorage).list().projects;
    expect(stored).toHaveLength(1);
    expect(stored[0].revision).toBe(1);
  });

  it("renames, duplicates, favorites, searches, trashes, and restores projects", async () => {
    renderPage();
    await launch();
    await create("Original");
    fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename Original" }));
    const rename = screen.getByRole("dialog", { name: "Rename project" });
    fireEvent.change(within(rename).getByLabelText("Project name"), {
      target: { value: "Renamed" },
    });
    fireEvent.click(within(rename).getByRole("button", { name: "Save name" }));
    fireEvent.click(screen.getByRole("button", { name: "Favorite Renamed" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Renamed" }));
    expect(
      screen.getByRole("button", { name: "Open Renamed copy" }),
    ).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Search projects"), {
      target: { value: "copy" },
    });
    expect(screen.queryByRole("button", { name: "Open Renamed" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Search projects"), {
      target: { value: "" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Move Renamed to Trash" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Trash \(/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restore Renamed" }));
    fireEvent.click(screen.getByRole("button", { name: /^Active projects/ }));
    expect(screen.getByRole("button", { name: "Open Renamed" })).not.toBeNull();
  });

  it("keeps unreadable records visible for recovery without replacing them", async () => {
    localStorage.setItem(`${PROJECT_PREFIX}damaged`, "{bad");
    renderPage();
    await launch();
    expect(
      screen.getByRole("heading", { name: "Stored data needs attention" }),
    ).not.toBeNull();
    expect(localStorage.getItem(`${PROJECT_PREFIX}damaged`)).toBe("{bad");
  });

  it("opens a second tab read-only and requires an explicit takeover", async () => {
    const repo = createRepository(localStorage);
    const p = repo.create(createProject({ name: "Busy" }));
    repo.acquire(p.projectId, "another-tab");
    renderPage();
    const workspace = await launch();
    fireEvent.click(screen.getByRole("button", { name: "Open Busy" }));
    expect(screen.getByLabelText("Page title").matches(":disabled")).toBe(true);
    expect(
      within(workspace).getByText(/unsaved changes in the other tab/i),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Take over editing" }));
    expect(screen.getByLabelText("Page title").matches(":disabled")).toBe(
      false,
    );
  });

  it("preserves unsaved content and warns before leaving when storage rejects a save", async () => {
    renderPage();
    const workspace = await launch();
    await create("Resilient");
    const repo = createRepository(localStorage);
    const saved = repo.list().projects[0];
    const original = Storage.prototype.setItem;
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (key, value) {
        if (key.startsWith(PROJECT_PREFIX))
          throw new DOMException("Full", "QuotaExceededError");
        return original.call(this, key, value);
      });
    fireEvent.change(screen.getByLabelText("Page title"), {
      target: { value: "Still in memory" },
    });
    await waitFor(
      () =>
        expect(
          screen.getByRole("status", { name: "Save status" }).textContent,
        ).toMatch(/save failed/i),
      { timeout: 2500 },
    );
    expect(repo.load(saved.projectId)).toEqual(saved);
    expect(screen.getByLabelText("Page title").value).toBe("Still in memory");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(
      within(workspace).getByRole("button", { name: "Back to projects" }),
    );
    expect(screen.getByLabelText("Page title").value).toBe("Still in memory");
    spy.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Retry save now" }));
    expect(repo.load(saved.projectId).page.metadata.title).toBe(
      "Still in memory",
    );
  });

  it("previews mixed collection imports and restores selected valid copies only", async () => {
    const original = createProject({ name: "Existing" });
    createRepository(localStorage).create(original);
    const valid = createProject({ name: "Imported" });
    const invalid = { ...valid, schemaVersion: 99 };
    const backup = JSON.parse(createBackup([valid]));
    backup.projects.push(invalid);
    renderPage();
    await launch();
    fireEvent.change(
      screen.getByLabelText("Import project or collection JSON"),
      {
        target: {
          files: [
            new File([JSON.stringify(backup)], "backup.json", {
              type: "application/json",
            }),
          ],
        },
      },
    );
    const review = await screen.findByRole("dialog", {
      name: "Review JSON restore",
    });
    expect(createRepository(localStorage).list().projects).toHaveLength(1);
    expect(
      within(review).getByRole("checkbox", { name: /invalid record 2/i })
        .disabled,
    ).toBe(true);
    fireEvent.click(
      within(review).getByRole("button", { name: "Restore 1 copy" }),
    );
    const projects = createRepository(localStorage).list().projects;
    expect(projects).toHaveLength(2);
    expect(projects.find((p) => p.projectId === original.projectId)).toEqual(
      original,
    );
    expect(projects.find((p) => p.name === "Imported").projectId).not.toBe(
      valid.projectId,
    );
  });

  it("restores the saved layout width without marking content dirty", async () => {
    renderPage();
    await launch();
    await create("Workspace");
    fireEvent.change(screen.getByLabelText("Layout width"), {
      target: { value: "390" },
    });
    expect(
      screen.getByRole("status", { name: "Save status" }).textContent,
    ).toMatch(/^saved/i);
    fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Workspace" }));
    expect(screen.getByLabelText("Layout width").value).toBe("390");
  });
});
