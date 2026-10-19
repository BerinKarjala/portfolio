import { lazy, Suspense, useEffect, useRef, useState } from "react";
import TeachingNotes from "./components/TeachingNotes";
import Seo from "../../components/Seo";
import "./page-builder.css";
import "./canvas.css";
const BuilderWorkspace = lazy(() => import("./BuilderWorkspace"));

export default function PageBuilderProject() {
  const [isOpen, setIsOpen] = useState(false);
  const launcher = useRef(null);
  const hasLaunched = useRef(false);
  useEffect(() => {
    if (!isOpen && hasLaunched.current) launcher.current?.focus();
  }, [isOpen]);
  return (
    <>
      <Seo
        title="HTML Page Builder Project | Berin Karjala"
        description="A visual, browser-local HTML page builder built with React. Create websites and launch the workspace."
        path="/projects/page-builder"
      />
      <main className="mx-auto w-full max-w-3xl px-4 py-6" inert={isOpen}>
        <div className="w-full">
          <div className="w-full">
            <section className="rounded-2xl border border-green-700 border-opacity-40 bg-green-900 bg-opacity-60 p-4 sm:p-6 shadow-2xl backdrop-filter backdrop-blur-sm">
              <p className="text-xs uppercase tracking-widest text-green-200">
                HTML Page Builder
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-green-50">
                A space to build your next idea.
              </h1>
              <p className="mt-4 text-sm sm:text-base text-green-100 leading-relaxed">
                Create and manage your own single-page websites in your browser.
                Click the preview to open Page Builder full screen.
              </p>
              <button
                ref={launcher}
                type="button"
                className="pb-launcher mt-6"
                onClick={() => {
                  hasLaunched.current = true;
                  setIsOpen(true);
                }}
                aria-label="Open Page Builder full screen"
              >
                <img
                  src="/page-builder-preview.svg"
                  alt="Illustration of the Page Builder workspace with a component panel, page canvas, and style inspector"
                  width="1200"
                  height="900"
                />
                <span>
                  Open Page Builder <span aria-hidden="true">↗</span>
                </span>
              </button>
              <p className="mt-4 text-xs leading-relaxed text-green-100">
                Arrange, nest, and resize elements on a visual canvas. Save
                projects locally, preview responsive layouts, and download
                standalone HTML/CSS or editable JSON backups.
              </p>
              <TeachingNotes />
            </section>
          </div>
        </div>
      </main>
      {isOpen && (
        <Suspense
          fallback={
            <p className="pb-loading" role="status">
              Opening Page Builder…
            </p>
          }
        >
          <BuilderWorkspace onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
