/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import sudokuPreview from "../assets/sudoku-solver-preview.svg";
import minesweeperPreview from "../assets/minesweeper-preview.svg";
import { StudioProvider } from "../features/css-studio/Studio";

const renderProject = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/project"]}>
        <StudioProvider><Project /></StudioProvider>
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
    expect(screen.getByRole("link", { name: "View project: Sudoku Solver" }).getAttribute("href")).toBe("/projects/SudokuSolver");
    expect(screen.getByRole("link", { name: "View project: Minesweeper" }).getAttribute("href")).toBe("/projects/Minesweeper");
    expect(screen.getByRole("button", { name: "Open Theme Studio" })).not.toBeNull();
    expect(screen.queryByText(/showing fallback content/i)).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("shows each CMS project once with its edited content and keeps the Studio launcher working", async () => {
    const projects = [
      { _id: "css-studio", kind: "cssStudio", name: "Custom Theme Studio", description: "CMS theme description", thumbnail: { asset: { url: "/cms-theme.png" }, alt: "CMS theme image" } },
      { _id: "page-builder", name: "Custom Page Builder", link: "/projects/page-builder", description: "CMS builder description", thumbnail: { asset: { url: "/cms-builder.png" }, alt: "CMS builder image" } },
      { _id: "sudoku", name: "Custom Sudoku", link: "/projects/SudokuSolver", description: "CMS sudoku description", thumbnail: { asset: { url: "/cms-sudoku.png" }, alt: "CMS sudoku image" } },
      { _id: "mines", name: "Custom Minesweeper", link: "/projects/Minesweeper", description: "CMS mines description", thumbnail: { asset: { url: "/cms-mines.png" }, alt: "CMS mines image" } },
    ];
    fetchMock.mockResolvedValueOnce(projects);
    renderProject();
    await screen.findByRole("heading", { name: "Custom Theme Studio" });
    for (const project of projects) {
      expect(screen.getAllByRole("heading", { name: project.name })).toHaveLength(1);
      expect(screen.getByText(project.description)).not.toBeNull();
      expect(screen.getByAltText(project.thumbnail.alt).getAttribute("src")).toBe(project.thumbnail.asset.url);
    }
    expect(screen.queryByRole("heading", { name: "CSS Theme Studio" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Sudoku Solver" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Minesweeper" })).toBeNull();
    expect(screen.queryByRole("link", { name: "View project: HTML Page Builder" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open Theme Studio" }));
    expect(screen.getByRole("button", { name: "Close tools" })).not.toBeNull();
  });

  it("uses bundled game images when CMS thumbnails are missing", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "sudoku", name: "Sudoku Solver", link: "/projects/SudokuSolver" },
      { _id: "mines", name: "Minesweeper", link: "/projects/Minesweeper" },
    ]);
    renderProject();
    const sudoku = await screen.findByRole("link", { name: "View project: Sudoku Solver" });
    const mines = screen.getByRole("link", { name: "View project: Minesweeper" });
    expect(sudoku.querySelector("img").getAttribute("src")).toBe(sudokuPreview);
    expect(mines.querySelector("img").getAttribute("src")).toBe(minesweeperPreview);
  });

  it("uses CMS Page Builder content without creating a duplicate gallery card", async () => {
    fetchMock.mockResolvedValueOnce([{ name: "My Page Builder", link: "https://berinkarjala.netlify.app/projects/page-builder/", description: "CMS description" }, { name: "Sudoku Solver", link: "/projects/SudokuSolver" }]);
    renderProject();
    expect(await screen.findByRole("link", { name: "View project: My Page Builder" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "View project: HTML Page Builder" })).toBeNull();
    expect(screen.getByRole("link", { name: "View project: Sudoku Solver" })).not.toBeNull();
  });

  it.each([
    ["projects/custom", "/projects/custom"],
    ["./projects/custom", "/projects/custom"],
    ["../projects/custom?view=1#part", "/projects/custom?view=1#part"],
    ["/projects/custom?view=1#part", "/projects/custom?view=1#part"],
    ["https://example.com/project?view=1#part", "https://example.com/project?view=1#part"],
  ])("renders the CMS link %s as %s", async (link, expectedHref) => {
    fetchMock.mockResolvedValueOnce([{ name: "Custom Project", link }]);

    renderProject();

    const project = await screen.findByRole("link", { name: "View project: Custom Project" });
    expect(project.getAttribute("href")).toBe(expectedHref);
  });

  it("keeps the bundled Sudoku preview for a path-relative CMS link", async () => {
    fetchMock.mockResolvedValueOnce([{
      name: "Sudoku Solver",
      link: "projects/SudokuSolver",
    }]);
    renderProject();
    const sudoku = await screen.findByRole("link", { name: "View project: Sudoku Solver" });
    expect(sudoku.getAttribute("href")).toBe("/projects/SudokuSolver");
    expect(sudoku.querySelector("img").getAttribute("src")).toBe(sudokuPreview);
  });

  it("shows the updated Sudoku preview alongside the bundled Page Builder card", async () => {
    fetchMock.mockResolvedValueOnce([
      {
        name: "Sudoku Solver",
        link: "/projects/SudokuSolver",
      },
    ]);

    renderProject();

    const sudoku = await screen.findByRole("link", { name: "View project: Sudoku Solver" });
    expect(sudoku.querySelector("img").getAttribute("src")).toBe(sudokuPreview);
    expect(screen.getByRole("link", { name: "View project: HTML Page Builder" }).getAttribute("href"))
      .toBe("/projects/page-builder");
  });
});
