import React, { useMemo, useState } from "react";
import {
  isValidGrid,
  solveSudoku,
  toNumberGrid,
  toUiGrid,
} from "./sudoku/solver";
import Seo, { SITE_NAME, SITE_URL } from "../Seo";

const PAGE_DESCRIPTION =
  "Solve Sudoku puzzles in the browser with clear inputs, validation, and a readable solver.";

export default function SudokuSolver() {
  // Create an empty 9x9 grid once, then reuse it for reset.
  const emptyGrid = useMemo(
    () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => "")),
    []
  );
  const [grid, setGrid] = useState(emptyGrid);
  const [message, setMessage] = useState("");
  const [isSolved, setIsSolved] = useState(false);
  const [givenCells, setGivenCells] = useState(emptyGrid.map((row) => row.map(() => false)));

  // Keep only a single valid digit (1-9). Everything else becomes blank.
  const sanitizeCellValue = (rawValue) => {
    const digits = String(rawValue).replace(/[^1-9]/g, "");
    return digits ? digits[0] : "";
  };

  // Update a single cell with sanitized input.
  const updateCell = (rowIndex, colIndex, rawValue) => {
    const nextValue = sanitizeCellValue(rawValue);
    setGrid((prevGrid) => {
      const nextGrid = prevGrid.map((row) => row.slice());
      nextGrid[rowIndex][colIndex] = nextValue;
      return nextGrid;
    });
    setIsSolved(false);
    setMessage("");
    setGivenCells(emptyGrid.map((row) => row.map(() => false)));
  };

  // Handle typing in a cell.
  const handleChange = (rowIndex, colIndex) => (event) => {
    updateCell(rowIndex, colIndex, event.target.value);
  };

  // Handle paste by taking only the first valid digit.
  const handlePaste = (rowIndex, colIndex) => (event) => {
    event.preventDefault();
    const pasted = event.clipboardData?.getData("text") ?? "";
    updateCell(rowIndex, colIndex, pasted);
  };

  // Clear the grid and reset messaging.
  const handleReset = () => {
    setGrid(emptyGrid);
    setMessage("");
    setIsSolved(false);
    setGivenCells(emptyGrid.map((row) => row.map(() => false)));
  };

  // Validate the puzzle and attempt to solve it using backtracking.
  const handleSolve = () => {
    const numberGrid = toNumberGrid(grid);
    const nextGivenCells = grid.map((row) => row.map((value) => Boolean(value)));

    if (!isValidGrid(numberGrid)) {
      setMessage("Invalid puzzle: conflicting hints.");
      setIsSolved(false);
      return;
    }

    const solved = solveSudoku(numberGrid);

    if (!solved) {
      setMessage("No solution found.");
      setIsSolved(false);
      return;
    }

    setGrid(toUiGrid(solved));
    setMessage("Solved!");
    setIsSolved(true);
    setGivenCells(nextGivenCells);
  };

  const pageUrl = `${SITE_URL}/projects/SudokuSolver`;
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Sudoku Solver",
    url: pageUrl,
    description: PAGE_DESCRIPTION,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sudoku Solver",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description: PAGE_DESCRIPTION,
    url: pageUrl,
    author: {
      "@type": "Person",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
  return (
    <>
      <Seo
        title="Sudoku Solver Project | Berin Karjala"
        description={PAGE_DESCRIPTION}
        path="/projects/SudokuSolver"
        jsonLd={[webPageSchema, appSchema]}
      />
      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full lg:w-1/2">
            <div className="rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-6 shadow-2xl backdrop-filter backdrop-blur-sm">
              <p className="text-xs uppercase tracking-widest text-green-200">
                Sudoku Solver
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-green-50">
                Solve Sudoku puzzles with clarity.
              </h1>
              <p className="mt-4 text-sm sm:text-base text-green-100 leading-relaxed">
                Enter digits 1 through 9. Invalid input is ignored automatically.
              </p>
              <div
                className="mt-6 grid w-full max-w-md mx-auto gap-0 overflow-hidden border-2"
                style={{
                  gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
                  gridAutoRows: "1fr",
                  aspectRatio: "1 / 1",
                  borderColor: "#33cc33",
                }}
              >
                {grid.map((row, rowIndex) =>
                  row.map((value, colIndex) => {
                    const addRightBorder = colIndex === 2 || colIndex === 5;
                    const addBottomBorder = rowIndex === 2 || rowIndex === 5;
                    const isGiven = givenCells[rowIndex]?.[colIndex];
                    const showSolved = isSolved && value && !isGiven;
                    return (
                      <input
                        key={`${rowIndex}-${colIndex}`}
                        value={value}
                        onChange={handleChange(rowIndex, colIndex)}
                        onPaste={handlePaste(rowIndex, colIndex)}
                        aria-label={`Row ${rowIndex + 1} Column ${colIndex + 1}`}
                        inputMode="numeric"
                        pattern="[1-9]"
                        maxLength={1}
                        className={`h-full w-full border border-green-700 border-opacity-60 bg-green-900 bg-opacity-40 text-center text-base focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 focus:ring-offset-green-900 ${
                          showSolved ? "font-normal" : "font-bold text-green-100"
                        }`}
                        style={{
                          borderRightWidth: addRightBorder ? 4 : 1,
                          borderBottomWidth: addBottomBorder ? 4 : 1,
                          borderRightColor: addRightBorder ? "#33cc33" : undefined,
                          borderBottomColor: addBottomBorder ? "#33cc33" : undefined,
                          color: showSolved ? "#33cc33" : undefined,
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-6 shadow-2xl backdrop-filter backdrop-blur-sm">
                <h2 className="text-xs uppercase tracking-widest text-green-200">
                  Controls
                </h2>
                <p className="mt-3 text-sm text-green-100 leading-relaxed">
                  Solve will be enabled once the solver is wired. Reset clears the board.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="resetbtn"
                    onClick={handleSolve}
                  >
                    Solve
                  </button>
                  <button type="button" className="resetbtn" onClick={handleReset}>
                    Reset
                  </button>
                </div>
                <p className="mt-4 text-sm text-green-100 min-h-[1.25rem]" aria-live="polite">
                  {message}
                </p>
              </div>
              <div className="rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-4 shadow-2xl backdrop-filter backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-widest text-green-200">
                    Sudoku Solver Source
                  </h2>
                </div>
                <div className="mt-3 hidden lg:block">
                  <iframe
                    title="Sudoku Solver Source"
                    src="/code/sudoku-solver-source.html"
                    className="h-96 w-full rounded-lg border border-green-700 border-opacity-40 bg-green-900"
                  ></iframe>
                </div>
                <details className="mt-3 lg:hidden">
                  <summary className="cursor-pointer text-xs text-green-100 underline">
                    Show code
                  </summary>
                  <iframe
                    title="Sudoku Solver Source"
                    src="/code/sudoku-solver-source.html"
                    className="mt-3 h-80 w-full rounded-lg border border-green-700 border-opacity-40 bg-green-900"
                  ></iframe>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
