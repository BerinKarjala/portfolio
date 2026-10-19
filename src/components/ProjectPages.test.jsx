/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Minesweeper from "./projects/Minesweeper";
import SudokuSolver from "./projects/SudokuSolver";
import PageBuilderProject from "../features/page-builder/PageBuilderProject";

afterEach(cleanup);

describe("project pages", () => {
  it.each([
    [Minesweeper, "Minesweeper", "Click to reset the board"],
    [SudokuSolver, "Solve Sudoku puzzles with clarity.", "Solve"],
    [PageBuilderProject, "A space to build your next idea.", "Open Page Builder full screen"],
  ])("keeps %s usable without source previews", (Project, heading, action) => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter><Project /></MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByRole("heading", { name: heading })).not.toBeNull();
    expect(screen.getByRole("button", { name: action })).not.toBeNull();
    expect(container.querySelector("pre, code, iframe")).toBeNull();
    expect(screen.queryByText("Show code")).toBeNull();
  });
});
