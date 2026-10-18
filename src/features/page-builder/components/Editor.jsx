import { useEffect, useRef, useState } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { downloadText, fileName } from "../browser/files";
import PagePreview from "./PagePreview";

export default function Editor() {
  const { state, repository, back, saveNow, takeOver, editMetadata, report } =
    useBuilder();
  const { project, readOnly, dirty, status, error } = state.editor;
  const [workspace, setWorkspace] = useState(() =>
    repository.workspace(project.projectId),
  );
  const scrollRef = useRef(null);
  const headingRef = useRef(null);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const { metadata } = project.page;

  useEffect(() => {
    headingRef.current?.focus();
  }, [project.projectId, readOnly]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = workspaceRef.current.scrollTop;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        repository.saveWorkspace(project.projectId, workspace);
      } catch (error) {
        report(error);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [workspace, project.projectId, repository, report]);
  useEffect(() => {
    const flushWorkspace = () => {
      try {
        repository.saveWorkspace(project.projectId, workspaceRef.current);
      } catch {
        /* Content saving has its own explicit failure state. */
      }
    };
    window.addEventListener("pagehide", flushWorkspace);
    return () => {
      window.removeEventListener("pagehide", flushWorkspace);
      flushWorkspace();
    };
  }, [project.projectId, repository]);
  const statusLabel = readOnly
    ? dirty
      ? "Read-only · unsaved changes"
      : "Read-only"
    : status === "failed"
      ? "Save failed · unsaved changes"
      : status === "unsaved"
        ? "Unsaved changes"
        : status === "saving"
          ? "Saving…"
          : "Saved in this browser";
  function exportDraft() {
    // Even an unfinished/invalid metadata edit must remain downloadable for recovery.
    try {
      downloadText(
        JSON.stringify(
          { kind: "page-builder-project", formatVersion: 1, project },
          null,
          2,
        ),
        fileName(project.name, dirty ? "-unsaved" : ""),
      );
    } catch (error) {
      report(error);
    }
  }
  return (
    <div className="pb-editor">
      <div className="pb-editor-toolbar">
        <button type="button" aria-label="Back to projects" onClick={back}>
          ← Back to projects
        </button>
        <h2 ref={headingRef} tabIndex={-1}>
          {project.name}
        </h2>
        <span
          role="status"
          aria-live="polite"
          className={`pb-save-state ${dirty ? "pb-warning" : ""}`}
        >
          {statusLabel}
        </span>
        <button type="button" onClick={exportDraft}>
          {dirty ? "Download unsaved JSON" : "Download project JSON"}
        </button>
        {dirty && !readOnly && (
          <button type="button" className="pb-primary" onClick={saveNow}>
            Retry save now
          </button>
        )}
      </div>
      {readOnly && (
        <div className="pb-banner pb-warning" role="alert">
          <p>
            {error ||
              "This project is open in another tab. Taking over starts editing immediately; unsaved changes in the other tab may be lost."}
          </p>
          <button type="button" onClick={takeOver}>
            Take over editing
          </button>
        </div>
      )}
      {!readOnly && error && (
        <p role="alert" className="pb-banner pb-warning">
          {error}
        </p>
      )}
      <div className="pb-editor-body">
        <aside className="pb-inspector">
          <p className="pb-eyebrow">PAGE SETTINGS</p>
          <h3>Make it yours</h3>
          <p className="pb-muted">
            Set the essentials for your single-page website.
          </p>
          <fieldset disabled={readOnly}>
            <label>
              Page title
              <input
                value={metadata.title}
                maxLength={200}
                onChange={(event) =>
                  editMetadata({ title: event.target.value })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={metadata.description}
                maxLength={1000}
                rows={4}
                onChange={(event) =>
                  editMetadata({ description: event.target.value })
                }
              />
            </label>
            <label>
              Page language
              <input
                value={metadata.lang}
                maxLength={40}
                onChange={(event) => editMetadata({ lang: event.target.value })}
              />
            </label>
            <label>
              Favicon URL
              <input
                type="url"
                placeholder="https://example.com/icon.png"
                value={metadata.faviconUrl}
                maxLength={2048}
                onChange={(event) =>
                  editMetadata({ faviconUrl: event.target.value })
                }
              />
            </label>
            <label className="pb-checkbox">
              <input
                type="checkbox"
                checked={metadata.indexable}
                onChange={(event) =>
                  editMetadata({ indexable: event.target.checked })
                }
              />
              Allow search engine indexing
            </label>
          </fieldset>
          <p className="pb-stage-note">
            Foundation milestone: project settings and browser saving are
            active. Canvas editing is coming in Milestone 2.
          </p>
        </aside>
        <section className="pb-canvas-area" aria-label="Starter layout">
          <div className="pb-canvas-toolbar">
            <span className="pb-muted">Starter layout</span>
            <label>
              Layout width
              <select
                value={workspace.viewport}
                onChange={(event) =>
                  setWorkspace((value) => ({
                    ...value,
                    viewport: Number(event.target.value),
                  }))
                }
              >
                <option value={390}>Mobile · 390px</option>
                <option value={768}>Tablet · 768px</option>
                <option value={1280}>Desktop · 1280px</option>
              </select>
            </label>
          </div>
          <div
            className="pb-canvas-scroll"
            ref={scrollRef}
            onScroll={(event) => {
              const scrollTop = event.currentTarget.scrollTop;
              setWorkspace((value) => ({ ...value, scrollTop }));
            }}
          >
            <div
              className="pb-canvas-page"
              style={{ width: workspace.viewport }}
            >
              <PagePreview project={project} />
            </div>
          </div>
          <p className="pb-canvas-caption">
            Read-only starter layout · Links stay inactive here.
          </p>
        </section>
      </div>
    </div>
  );
}
