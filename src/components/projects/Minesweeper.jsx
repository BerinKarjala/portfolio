import React, { Component } from "react";
import Seo, { SITE_NAME, SITE_URL } from "../Seo";

const DEBUG_VALIDATE_COUNTS = false;
const PAGE_DESCRIPTION =
  "Play a classic Minesweeper board. Find the mines, place flags, and clear the board.";
const FLAG_SYMBOL = "\u{1F6A9}";
const BOMB_SYMBOL = "\u{1F4A3}";

class Minsweeper extends Component {
  constructor(props) {
    super(props);
    this.width = 10;
    this.bombAmount = 20;
    this.squares = [];
    this.flags = 0;
    this.isGameOver = false;
    this.gridRef = React.createRef();
    this.flagsLeftRef = React.createRef();
    this.resultRef = React.createRef();
  }

  componentDidMount() {
    // Initialize sizing and a fresh game, then keep the board responsive on resize.
    this.updateCellSize();
    this.resetGame();
    window.addEventListener("resize", this.updateCellSize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateCellSize);
  }

  // Prevent React rerenders from wiping the manually managed grid.
  shouldComponentUpdate() {
    return false;
  }

  updateCellSize = () => {
    // Compute a cell size that guarantees the full grid fits the viewport.
    const grid = this.gridRef.current;
    if (!grid) return;

    const viewportWidth = window.innerWidth || 0;
    const containerWidth = grid.parentElement?.clientWidth || viewportWidth - 32;
    const maxBoardWidth = Math.min(520, Math.max(0, containerWidth));
    const gridBorder = viewportWidth < 480 ? 6 : 10;
    const gridGap = viewportWidth < 480 ? 2 : 3;
    const usable = Math.max(
      0,
      maxBoardWidth - gridBorder * 2 - gridGap * (this.width - 1)
    );
    const rawCellSize = Math.floor(usable / this.width);
    const cellSize = Math.max(18, Math.min(40, rawCellSize));
    const gridSize =
      cellSize * this.width + gridGap * (this.width - 1) + gridBorder * 2;

    grid.style.setProperty("--cell-size", `${cellSize}px`);
    grid.style.setProperty("--cell-gap", `${gridGap}px`);
    grid.style.setProperty("--grid-cols", String(this.width));
    grid.style.setProperty("--grid-border", `${gridBorder}px`);
    grid.style.width = `${gridSize}px`;
    grid.style.height = `${gridSize}px`;
  };

  resetGame = () => {
    // Clear the board and re-create a fresh, randomized game state.
    const grid = this.gridRef.current;
    if (!grid) return;

    grid.innerHTML = "";
    this.squares = [];
    this.flags = 0;
    this.isGameOver = false;

    if (this.resultRef.current) {
      this.resultRef.current.textContent = "";
    }
    if (this.flagsLeftRef.current) {
      this.flagsLeftRef.current.textContent = String(this.bombAmount);
    }

    // Build and shuffle the mine layout before wiring events and counts.
    const bombsArray = Array(this.bombAmount).fill("bomb");
    const emptyArray = Array(this.width * this.width - this.bombAmount).fill(
      "valid"
    );
    const gameArray = emptyArray.concat(bombsArray).sort(() => Math.random() - 0.5);

    for (let i = 0; i < this.width * this.width; i++) {
      const square = document.createElement("div");
      square.setAttribute("id", i);
      square.classList.add(gameArray[i]);
      grid.appendChild(square);
      this.squares.push(square);

      square.addEventListener("click", () => {
        this.handleClick(square);
      });

      square.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.addFlag(square);
      });
    }

    // Compute adjacent-mine counts after mines are placed.
    for (let i = 0; i < this.squares.length; i++) {
      if (this.squares[i].classList.contains("bomb")) {
        continue;
      }
      const total = this.countAdjacentMines(i);
      this.squares[i].setAttribute("data", total);
    }

    this.validateCounts();
  };

  getNeighbors = (index) => {
    // Enumerate all valid neighbor indices (8-directional).
    const row = Math.floor(index / this.width);
    const col = index % this.width;
    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (
          nextRow < 0 ||
          nextRow >= this.width ||
          nextCol < 0 ||
          nextCol >= this.width
        ) {
          continue;
        }
        neighbors.push(nextRow * this.width + nextCol);
      }
    }
    return neighbors;
  };

  countAdjacentMines = (index) => {
    // Count mines in surrounding cells using the shared neighbor helper.
    return this.getNeighbors(index).reduce((total, neighborIndex) => {
      return total + (this.squares[neighborIndex]?.classList.contains("bomb") ? 1 : 0);
    }, 0);
  };

  validateCounts = () => {
    // Optional dev-only sanity check for mine counts.
    if (!DEBUG_VALIDATE_COUNTS) return;
    for (let i = 0; i < this.squares.length; i++) {
      const square = this.squares[i];
      if (square.classList.contains("bomb")) continue;
      const expected = this.countAdjacentMines(i);
      const actual = Number(square.getAttribute("data"));
      if (expected !== actual) {
        console.warn("Minesweeper count mismatch", { index: i, expected, actual });
        break;
      }
    }
  };

  addFlag = (square) => {
    // Toggle flag placement with right click.
    if (this.isGameOver) return;
    if (square.classList.contains("checked")) return;

    if (!square.classList.contains("flag") && this.flags < this.bombAmount) {
      square.classList.add("flag");
      square.textContent = FLAG_SYMBOL;
      this.flags += 1;
      if (this.flagsLeftRef.current) {
        this.flagsLeftRef.current.textContent = String(this.bombAmount - this.flags);
      }
      this.checkForWin();
      return;
    }

    if (square.classList.contains("flag")) {
      square.classList.remove("flag");
      square.textContent = "";
      this.flags -= 1;
      if (this.flagsLeftRef.current) {
        this.flagsLeftRef.current.textContent = String(this.bombAmount - this.flags);
      }
    }
  };

  handleClick = (square) => {
    // Handle a cell reveal; flood-fill neighbors when count is zero.
    const currentId = Number(square.id);
    if (this.isGameOver) return;
    if (square.classList.contains("checked") || square.classList.contains("flag")) {
      return;
    }

    if (square.classList.contains("bomb")) {
      this.gameOver();
      return;
    }

    const total = Number(square.getAttribute("data"));
    if (total > 0) {
      square.classList.add("checked");
      if (total === 1) square.classList.add("one");
      if (total === 2) square.classList.add("two");
      if (total === 3) square.classList.add("three");
      if (total === 4) square.classList.add("four");
      square.textContent = String(total);
      return;
    }

    this.checkSquare(currentId);
    square.classList.add("checked");
  };

  checkSquare = (currentId) => {
    // Reveal neighboring cells (delayed to avoid deep recursion).
    const neighbors = this.getNeighbors(currentId);
    window.setTimeout(() => {
      neighbors.forEach((neighborIndex) => {
        const newSquare = this.squares[neighborIndex];
        if (newSquare) {
          this.handleClick(newSquare);
        }
      });
    }, 10);
  };

  gameOver = () => {
    // Reveal all mines and freeze further interaction.
    if (this.resultRef.current) {
      this.resultRef.current.textContent = "BOOM! Game Over!";
    }
    this.isGameOver = true;

    this.squares.forEach((square) => {
      if (square.classList.contains("bomb")) {
        square.textContent = BOMB_SYMBOL;
      }
    });
  };

  checkForWin = () => {
    // Win when all bombs are correctly flagged.
    let matches = 0;

    for (let i = 0; i < this.squares.length; i++) {
      if (
        this.squares[i].classList.contains("flag") &&
        this.squares[i].classList.contains("bomb")
      ) {
        matches += 1;
      }
      if (matches === this.bombAmount) {
        if (this.resultRef.current) {
          this.resultRef.current.textContent = "You win!";
        }
        this.isGameOver = true;
      }
    }
  };

  render() {
    const pageUrl = SITE_URL + "/projects/Minesweeper";
    const webPageSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Minesweeper",
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
      name: "Minesweeper",
      applicationCategory: "Game",
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
          title="Minesweeper Project | Berin Karjala"
          description={PAGE_DESCRIPTION}
          path="/projects/Minesweeper"
          jsonLd={[webPageSchema, appSchema]}
        />
        <section className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-4 sm:p-6 shadow-2xl backdrop-filter backdrop-blur-sm">
            <p className="text-xs uppercase tracking-widest text-green-200">
              Minesweeper
            </p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-green-50">
              Minesweeper
            </h1>
            <p className="mt-4 text-sm sm:text-base text-green-100 leading-relaxed">
              Clear the board without uncovering a mine.
            </p>
            <div className="mt-6 w-full max-w-md mx-auto">
              <div
                ref={this.gridRef}
                className="gridX"
                aria-label="Minesweeper board"
              ></div>
            </div>
            <div className="mt-6 rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-4 sm:p-6 shadow-2xl backdrop-filter backdrop-blur-sm">
              <h2 className="text-xs uppercase tracking-widest text-green-200">
                Controls
              </h2>
              <p className="mt-3 text-sm text-green-100 leading-relaxed">
                Right click on a tile to add a flag to the board.
              </p>
              <div className="mt-3 text-sm text-green-100" aria-live="polite">
                Flags left: {FLAG_SYMBOL}
                <span ref={this.flagsLeftRef} className="ml-1"></span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="resetbtn" onClick={this.resetGame}>
                  Click to reset the board
                </button>
              </div>
              <div ref={this.resultRef} id="result" role="status" className="mt-4 text-sm text-green-100 min-h-[1.25rem]"></div>
            </div>
          </div>
        </section>
      </>
    );
  }
}

export default Minsweeper;
