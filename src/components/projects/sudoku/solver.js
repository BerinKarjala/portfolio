// Sudoku solver helpers.
// This module is intentionally framework-free so it can be tested in isolation.

// Accept any raw value and return a single digit "1".."9" or "".
export function sanitizeCellValue(rawValue) {
  const text = String(rawValue);
  const match = text.match(/[1-9]/);
  return match ? match[0] : "";
}

// Convert UI grid values ("", "1".."9") into numeric values (0..9).
export function toNumberGrid(uiGrid) {
  return uiGrid.map((row) =>
    row.map((cell) => {
      const cleaned = sanitizeCellValue(cell);
      return cleaned ? Number(cleaned) : 0;
    })
  );
}

// Convert numeric grid values (0..9) back into UI values.
export function toUiGrid(numberGrid) {
  return numberGrid.map((row) =>
    row.map((value) => (value >= 1 && value <= 9 ? String(value) : ""))
  );
}

// Check if placing val at (row, col) violates Sudoku rules.
export function isValidPlacement(grid, row, col, val) {
  for (let i = 0; i < 9; i += 1) {
    if (i !== col && grid[row][i] === val) return false;
    if (i !== row && grid[i][col] === val) return false;
  }

  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  for (let r = boxRowStart; r < boxRowStart + 3; r += 1) {
    for (let c = boxColStart; c < boxColStart + 3; c += 1) {
      if ((r !== row || c !== col) && grid[r][c] === val) return false;
    }
  }

  return true;
}

// Validate that the current grid has no conflicting hints.
export function isValidGrid(grid) {
  for (let r = 0; r < 9; r += 1) {
    const seen = new Set();
    for (let c = 0; c < 9; c += 1) {
      const value = grid[r][c];
      if (value === 0) continue;
      if (seen.has(value)) return false;
      seen.add(value);
    }
  }

  for (let c = 0; c < 9; c += 1) {
    const seen = new Set();
    for (let r = 0; r < 9; r += 1) {
      const value = grid[r][c];
      if (value === 0) continue;
      if (seen.has(value)) return false;
      seen.add(value);
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const seen = new Set();
      for (let r = boxRow * 3; r < boxRow * 3 + 3; r += 1) {
        for (let c = boxCol * 3; c < boxCol * 3 + 3; c += 1) {
          const value = grid[r][c];
          if (value === 0) continue;
          if (seen.has(value)) return false;
          seen.add(value);
        }
      }
    }
  }

  return true;
}

// Find the next empty cell. Returns { row, col } or null if full.
export function findNextEmptyCell(grid) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (grid[r][c] === 0) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// Solve a Sudoku grid using backtracking. Returns solved grid or null.
export function solveSudoku(inputGrid) {
  const grid = inputGrid.map((row) => row.slice());

  if (!isValidGrid(grid)) {
    return null;
  }

  function backtrack() {
    const empty = findNextEmptyCell(grid);
    if (!empty) return true;

    for (let val = 1; val <= 9; val += 1) {
      if (isValidPlacement(grid, empty.row, empty.col, val)) {
        grid[empty.row][empty.col] = val;
        if (backtrack()) return true;
        grid[empty.row][empty.col] = 0;
      }
    }

    return false;
  }

  const solved = backtrack();
  return solved ? grid : null;
}
