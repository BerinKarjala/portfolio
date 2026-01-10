import { BrowserRouter, Route, Switch } from "react-router-dom";
import Home from "./components/Home";
import About from "./components/About";
import Project from "./components/Project";
import NavBar from "./components/NavBar";
import NotFound from "./components/NotFound";
import Minesweeper from "./components/projects/Minesweeper";
import SudokuSolver from "./components/projects/SudokuSolver";

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Switch>
        <Route component={Home} path="/" exact />
        <Route component={About} path="/about" />
        <Route component={Project} path="/project" />
        <Route component={Minesweeper} path="/projects/Minesweeper" />
        <Route component={SudokuSolver} path="/projects/SudokuSolver" />
        <Route component={NotFound} />
      </Switch>
    </BrowserRouter>
  );
}

export default App;
