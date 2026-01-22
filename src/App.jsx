import { Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import NavBar from "./components/NavBar";

const Home = lazy(() => import("./components/Home"));
const About = lazy(() => import("./components/About"));
const Project = lazy(() => import("./components/Project"));
const Minesweeper = lazy(() => import("./components/projects/Minesweeper"));
const SudokuSolver = lazy(() => import("./components/projects/SudokuSolver"));
const NotFound = lazy(() => import("./components/NotFound"));

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <NavBar />
        <Suspense
          fallback={
            <main className="forest-bg text-emerald-50 min-h-screen flex items-center justify-center">
              <p className="text-sm uppercase tracking-widest text-emerald-200">
                Loading...
              </p>
            </main>
          }
        >
          <Switch>
            <Route component={Home} path="/" exact />
            <Route component={About} path="/about" />
            <Route component={Project} path="/project" />
            <Route component={Minesweeper} path="/projects/Minesweeper" />
            <Route component={SudokuSolver} path="/projects/SudokuSolver" />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
