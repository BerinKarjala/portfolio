import { useEffect, useState } from "react";
import BuilderProvider, { useBuilder } from "./state/BuilderProvider";
import Dialog from "./components/Dialog";
import Dashboard from "./components/Dashboard";
import QuickGuide from "./components/QuickGuide";
import Editor from "./components/Editor";
import ErrorBoundary from "./components/ErrorBoundary";
import { downloadText } from "./browser/files";
import { PROJECT_PREFIX } from "./domain/storage";

function Workspace({ onClose }) {
  const { state, canLeave, dispatch, repository, report } = useBuilder();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  function close() {
    if (canLeave()) onClose();
  }
  function recover() {
    try {
      const data = [
        ...state.projects.map((p) => `${PROJECT_PREFIX}${p.projectId}`),
        ...state.damaged.map((p) => p.key),
      ].map((key) => ({ key, raw: repository.raw(key) }));
      downloadText(
        JSON.stringify(
          { kind: "page-builder-stored-data-recovery", records: data },
          null,
          2,
        ),
        "page-builder-stored-data-recovery.json",
      );
    } catch (error) {
      report(error);
    }
  }
  return (
    <Dialog labelledBy="pb-workspace-title" onDismiss={close} fullScreen>
      <header className="pb-header">
        <div className="pb-brand">
          <span aria-hidden="true">◫</span>
          <h1 id="pb-workspace-title">Page Builder</h1>
          <span className="pb-local-badge">BROWSER LOCAL</span>
        </div>
        <QuickGuide />
        <button type="button" onClick={close} aria-label="Close Page Builder">
          Close ✕
        </button>
      </header>
      {!online && (
        <p className="pb-banner">
          You're offline. This open session can continue using browser storage.
          Download JSON backups; reopening offline is not guaranteed.
        </p>
      )}
      {state.error && (
        <p className="pb-banner pb-warning" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="pb-banner" aria-live="polite">
          {state.notice}
        </p>
      )}
      <ErrorBoundary
        key={state.editor?.project.projectId || "dashboard"}
        onError={() =>
          dispatch({
            type: "READ_ONLY",
            message:
              "Workspace error: autosave paused. Download stored data before restarting.",
          })
        }
        onClose={close}
        recovery={
          <>
            <button type="button" onClick={recover}>
              Download stored data
            </button>
            {state.editor?.dirty && (
              <button
                type="button"
                onClick={() => {
                  try {
                    downloadText(
                      JSON.stringify(
                        {
                          kind: "page-builder-project",
                          formatVersion: 1,
                          project: state.editor.project,
                        },
                        null,
                        2,
                      ),
                      "page-builder-unsaved.json",
                    );
                  } catch (error) {
                    report(error);
                  }
                }}
              >
                Download unsaved JSON
              </button>
            )}
          </>
        }
      >
        {state.editor ? (
          <Editor key={state.editor.project.projectId} />
        ) : (
          <Dashboard />
        )}
      </ErrorBoundary>
    </Dialog>
  );
}

export default function BuilderWorkspace({ onClose }) {
  return (
    <BuilderProvider>
      <Workspace onClose={onClose} />
    </BuilderProvider>
  );
}
