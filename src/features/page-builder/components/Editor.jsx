import { useEffect, useRef, useState } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { downloadText, fileName } from "../browser/files";
import TemplateReset from "./TemplateReset";
import CanvasEditor from "./CanvasEditor";
import ExportWorkspace from "./ExportWorkspace";

export default function Editor() {
  const {
    state,
    repository,
    back,
    saveNow,
    takeOver,
    select,
    dispatch,
    report,
  } = useBuilder();
  const { project, readOnly, dirty, status, error } = state.editor;
  const [workspace, setWorkspace] = useState(() =>
    repository.workspace(project.projectId),
  );
  const [mode, setMode] = useState("edit");
  const [observedFailures, setObservedFailures] = useState([]);
  const previewButton = useRef(null);
  const scrollRef = useRef(null);
  const headingRef = useRef(null);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = {
    ...workspace,
    selectedIds: state.editor.selection,
    selectedId: state.editor.selection[0] || null,
  };

  useEffect(() => {
    if (!document.querySelector(".pb-element-wizard-dialog[open]")) headingRef.current?.focus();
  }, [project.projectId, readOnly]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = workspaceRef.current.scrollTop;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        repository.saveWorkspace(project.projectId, workspaceRef.current);
      } catch (error) {
        report(error);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [
    workspace,
    state.editor.selection,
    project.projectId,
    repository,
    report,
  ]);
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
    <div
      className="pb-editor"
      onErrorCapture={(event) => {
        const target = event.target;
        const elementId =
          target.closest?.("[data-element-id]")?.dataset.elementId;
        const url = target.currentSrc || target.src;
        if (elementId && url)
          setObservedFailures((current) =>
            current.some((f) => f.elementId === elementId && f.url === url)
              ? current
              : [...current, { elementId, url }],
          );
      }}
    >
      <div className="pb-editor-toolbar">
        <button type="button" aria-label="Back to projects" onClick={back}>
          ← Back to projects
        </button>
        <h2 ref={headingRef} tabIndex={-1}>
          {project.name}
        </h2>
        <span
          role="status"
          aria-label="Save status"
          aria-live="polite"
          className={`pb-save-state ${dirty ? "pb-warning" : ""}`}
        >
          {statusLabel}
        </span>
        <button
          ref={previewButton}
          type="button"
          className="pb-primary"
          onClick={() => {
            dispatch({ type: "RICH_MODE", id: null });
            setMode(mode === "edit" ? "export" : "edit");
          }}
        >
          {mode === "edit" ? "Preview and export" : "Back to editor"}
        </button>
        <button type="button" onClick={exportDraft}>
          {dirty ? "Download unsaved JSON" : "Download project JSON"}
        </button>
        <TemplateReset />
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
      {state.editor.commandError && (
        <p role="alert" className="pb-banner pb-warning">
          {state.editor.commandError}
        </p>
      )}
      {mode === "edit" ? (
        <CanvasEditor {...{ workspace, setWorkspace, scrollRef }} />
      ) : (
        <ExportWorkspace
          project={project}
          observedFailures={observedFailures}
          onLocate={(id) => {
            select([id]);
            const expanded = new Set(workspace.expandedIds);
            let at = project.page.elements[id];
            while (at?.parentId) {
              expanded.add(at.parentId);
              at = project.page.elements[at.parentId];
            }
            setWorkspace((current) => ({
              ...current,
              leftOpen: true,
              leftTab: "layers",
              rightOpen: true,
              mobilePanel: window.matchMedia?.("(max-width: 760px)").matches
                ? "right"
                : null,
              expandedIds: [...expanded],
            }));
            setMode("edit");
            requestAnimationFrame(() => {
              const element = document.querySelector(
                `[data-element-id="${id}"]`,
              );
              element?.scrollIntoView({ block: "center", inline: "nearest" });
              element?.focus({ preventScroll: true });
            });
          }}
        />
      )}
    </div>
  );
}
