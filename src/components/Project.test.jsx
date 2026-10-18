/* @vitest-environment jsdom */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cancelIdleMock, fetchMock } = vi.hoisted(() => ({
  cancelIdleMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("../client.js", () => ({
  default: {
    fetch: fetchMock,
  },
}));

vi.mock("../utils/idleCallback", () => ({
  cancelIdle: cancelIdleMock,
  runWhenIdle: (callback) => {
    callback();
    return "idle-handle";
  },
}));

import Project from "./Project";

const renderProject = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/project"]}>
        <Project />
      </MemoryRouter>
    </HelmetProvider>
  );

describe("Project", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    cancelIdleMock.mockReset();
    document.title = "";
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the page shell and SEO metadata visible while projects are loading", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderProject();

    expect(
      screen.getByRole("heading", {
        name: /my projects/i,
      })
    ).not.toBeNull();
    expect(screen.getByText(/loading project entries/i)).not.toBeNull();

    await waitFor(() => {
      expect(document.title).toBe("Projects | Berin Karjala");
    });
  });

  it("shows the fetch error while retaining the bundled Page Builder project", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new Error("Sanity unavailable"));

    renderProject();

    expect(
      await screen.findByText(/could not load the latest project content from sanity/i)
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "View project: HTML Page Builder" }).getAttribute("href")).toBe("/projects/page-builder");
    expect(screen.queryByText(/showing fallback content/i)).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("uses CMS Page Builder content without creating a duplicate gallery card", async () => {
    fetchMock.mockResolvedValueOnce([{ name: "My Page Builder", link: "https://berinkarjala.netlify.app/projects/page-builder/", description: "CMS description" }, { name: "Sudoku Solver", link: "/projects/SudokuSolver" }]);
    renderProject();
    expect(await screen.findByRole("link", { name: "View project: My Page Builder" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "View project: HTML Page Builder" })).toBeNull();
    expect(screen.getByRole("link", { name: "View project: Sudoku Solver" })).not.toBeNull();
  });

  it("shows the updated Sudoku preview alongside the bundled Page Builder card", async () => {
    fetchMock.mockResolvedValueOnce([
      {
        name: "Sudoku Solver",
        link: "/projects/SudokuSolver",
        thumbnail: { asset: { url: "/old-placeholder.png" } },
      },
    ]);

    renderProject();

    const sudoku = await screen.findByRole("link", { name: "View project: Sudoku Solver" });
    expect(sudoku.querySelector("img").getAttribute("src")).toContain("sudoku-solver-preview.svg");
    expect(screen.getByRole("link", { name: "View project: HTML Page Builder" }).getAttribute("href"))
      .toBe("/projects/page-builder");
  });
});
