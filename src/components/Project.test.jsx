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

  it("retains the edited links of known CMS projects without duplicate fallback cards", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "c0a1c1ee-3b33-4b80-b423-12f0ab0c8b6f", name: "Edited Sudoku", link: "/new-sudoku" },
      { _id: "project-html-page-builder", name: "Edited Builder", link: "/new-builder" },
    ]);
    renderProject();
    const sudoku = await screen.findByRole("link", { name: "View project: Edited Sudoku" });
    const builder = screen.getByRole("link", { name: "View project: Edited Builder" });
    expect(sudoku.getAttribute("href")).toBe("/new-sudoku");
    expect(builder.getAttribute("href")).toBe("/new-builder");
    expect(screen.getAllByRole("link", { name: "View project: Edited Sudoku" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "View project: Edited Builder" })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "View project: Sudoku Solver" })).toBeNull();
    expect(screen.queryByRole("link", { name: "View project: HTML Page Builder" })).toBeNull();
  });

  it("shows projects with absent, empty, whitespace or unsafe links as non-clickable cards", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "no-link", name: "No link project", description: "No link description" },
      { _id: "empty-link", name: "Empty link project", description: "Empty link description", link: "" },
      { _id: "space-link", name: "Whitespace link project", description: "Whitespace link description", link: "   " },
      { _id: "unsafe-link", name: "Unsafe link project", description: "Unsafe link description", link: "javascript:alert(1)" },
    ]);
    renderProject();
    await screen.findByRole("heading", { name: "No link project" });
    for (const [name, description] of [["No link project", "No link description"], ["Empty link project", "Empty link description"], ["Whitespace link project", "Whitespace link description"], ["Unsafe link project", "Unsafe link description"]]) {
      const heading = screen.getByRole("heading", { name });
      expect(screen.getByText(description)).not.toBeNull();
      expect(heading.closest("a[href]")).toBeNull();
      expect(screen.queryByRole("link", { name: `View project: ${name}` })).toBeNull();
    }
  });

  it("shows each CSS Studio record once and both launch buttons work", async () => {
    fetchMock.mockResolvedValueOnce([
      { _id: "studio-one", kind: "cssStudio", name: "First CMS Studio", description: "First studio description" },
      { _id: "studio-two", kind: "cssStudio", name: "Second CMS Studio", description: "Second studio description" },
    ]);
    renderProject();
    await screen.findByRole("heading", { name: "First CMS Studio" });
    expect(screen.getAllByRole("heading", { name: "First CMS Studio" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Second CMS Studio" })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "CSS Theme Studio" })).toBeNull();
    const launchers = screen.getAllByRole("button", { name: "Open Theme Studio" });
    expect(launchers).toHaveLength(2);
    for (let index = 0; index < 2; index += 1) {
      fireEvent.click(screen.getAllByRole("button", { name: "Open Theme Studio" })[index]);
      expect(screen.getByRole("button", { name: "Close tools" })).not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Close tools" }));
    }
  });

  it("keeps the Page Builder in the same tab when its link includes a query and fragment", async () => {
    fetchMock.mockResolvedValueOnce([{
      _id: "project-html-page-builder",
      name: "HTML Page Builder",
      link: "/projects/page-builder?view=compact#editor",
    }]);
    renderProject();
    await waitFor(() => expect(screen.getByRole("link", { name: "View project: HTML Page Builder" }).getAttribute("href"))
      .toBe("/projects/page-builder?view=compact#editor"));
    const builder = screen.getByRole("link", { name: "View project: HTML Page Builder" });
    expect(builder.hasAttribute("target")).toBe(false);
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
