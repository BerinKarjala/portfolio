import { Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/project" element={<Project />} />
            <Route path="/projects/Minesweeper" element={<Minesweeper />} />
            <Route path="/projects/SudokuSolver" element={<SudokuSolver />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
