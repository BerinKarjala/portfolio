import {
  isValidGrid,
  solveSudoku,
  toNumberGrid,
  toUiGrid,
} from "./solver";
import { describe, expect, it } from "vitest";

describe("sudoku solver", () => {
  it("solves a known valid puzzle", () => {
    const puzzleUi = [
      ["5", "3", "", "", "7", "", "", "", ""],
      ["6", "", "", "1", "9", "5", "", "", ""],
      ["", "9", "8", "", "", "", "", "6", ""],
      ["8", "", "", "", "6", "", "", "", "3"],
      ["4", "", "", "8", "", "3", "", "", "1"],
      ["7", "", "", "", "2", "", "", "", "6"],
      ["", "6", "", "", "", "", "2", "8", ""],
      ["", "", "", "4", "1", "9", "", "", "5"],
      ["", "", "", "", "8", "", "", "7", "9"],
    ];

    const solutionUi = [
      ["5", "3", "4", "6", "7", "8", "9", "1", "2"],
      ["6", "7", "2", "1", "9", "5", "3", "4", "8"],
      ["1", "9", "8", "3", "4", "2", "5", "6", "7"],
      ["8", "5", "9", "7", "6", "1", "4", "2", "3"],
      ["4", "2", "6", "8", "5", "3", "7", "9", "1"],
      ["7", "1", "3", "9", "2", "4", "8", "5", "6"],
      ["9", "6", "1", "5", "3", "7", "2", "8", "4"],
      ["2", "8", "7", "4", "1", "9", "6", "3", "5"],
      ["3", "4", "5", "2", "8", "6", "1", "7", "9"],
    ];

    const numberGrid = toNumberGrid(puzzleUi);
    const solved = solveSudoku(numberGrid);

    expect(solved).not.toBeNull();
    expect(toUiGrid(solved)).toEqual(solutionUi);
  });

  it("detects an invalid grid with duplicate values", () => {
    const invalidGrid = [
      [5, 3, 0, 0, 7, 0, 0, 0, 5],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ];

    expect(isValidGrid(invalidGrid)).toBe(false);
  });

  it("returns null for an unsolvable puzzle", () => {
    const unsolvableGrid = [
      [5, 1, 6, 8, 4, 9, 7, 3, 2],
      [3, 0, 7, 6, 0, 5, 0, 0, 0],
      [8, 0, 9, 7, 0, 0, 0, 6, 5],
      [1, 3, 5, 0, 6, 0, 9, 0, 7],
      [4, 7, 2, 5, 9, 1, 0, 0, 6],
      [9, 6, 8, 3, 7, 0, 0, 5, 0],
      [2, 5, 3, 1, 8, 6, 0, 7, 4],
      [6, 8, 4, 2, 0, 7, 5, 0, 0],
      [7, 9, 1, 0, 5, 0, 6, 0, 8],
    ];

    expect(isValidGrid(unsolvableGrid)).toBe(true);
    expect(solveSudoku(unsolvableGrid)).toBeNull();
  });
});
