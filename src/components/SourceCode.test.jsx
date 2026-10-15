/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import SourceCode from "./SourceCode";
import Minesweeper from "./projects/Minesweeper";
import SudokuSolver from "./projects/SudokuSolver";

afterEach(cleanup);

describe("project source display", () => {
  it.each([
    [Minesweeper, "Minesweeper Source", "class Minsweeper extends Component"],
    [SudokuSolver, "Sudoku Solver Source", "export function solveSudoku"],
  ])("renders bundled source on the %s page without a frame", (Project, title, source) => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter><Project /></MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByRole("heading", { name: title })).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    const listings = [...container.querySelectorAll("code")];
    expect(listings.some((node) => node.textContent.includes(source))).toBe(true);
    expect(screen.getByText("Show code").closest("details")).not.toBeNull();
  });

  it("displays HTML-like source literally without creating executable markup", () => {
    const source = '<script>alert(1)</script><img src=x onerror="alert(1)">';
    const { container } = render(
      <SourceCode title="Source" files={[{ name: "example.js", source }]} />
    );
    expect(container.querySelector("code").textContent).toBe(source);
    expect(container.querySelector("script, img, iframe")).toBeNull();
  });
});
