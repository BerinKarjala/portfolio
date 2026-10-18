import { useEffect, useMemo, useRef, useState } from "react";
import { compileProject, prepareExport } from "../exporters/compiler";
import { diagnosticSummary } from "../exporters/preflight";
import { packageZip } from "../exporters/zip";
import { downloadBlob, downloadText } from "../browser/files";
import SandboxPreview from "./SandboxPreview";
import CodeViewer from "./CodeViewer";

const NO_FAILURES = [];
export default function ExportWorkspace({
  project,
  observedFailures = NO_FAILURES,
  onLocate,
}) {
  const [snapshot, setSnapshot] = useState(project),
    [view, setView] = useState("preview"),
    [acknowledged, setAcknowledged] = useState(false),
    [status, setStatus] = useState("");
  const title = useRef(null);
  useEffect(() => {
    title.current?.focus();
  }, []);
  useEffect(() => {
    setAcknowledged(false);
    const timer = setTimeout(() => setSnapshot(project), 200);
    return () => clearTimeout(timer);
  }, [project, observedFailures]);
  const compiled = useMemo(
    () => compileProject(snapshot, { observedFailures }),
    [snapshot, observedFailures],
  );
  const updating = snapshot !== project,
    blocked =
      updating ||
      !!compiled.errors.length ||
      (compiled.warnings.length > 0 && !acknowledged);
  function download(mode) {
    try {
      // Always rerun preflight on the live project, even if preview compilation was debounced.
      const ready = prepareExport(project, {
        acknowledgeWarnings: acknowledged,
        observedFailures,
      });
      if (mode === "zip")
        downloadBlob(
          new Blob([packageZip(ready.files)], { type: "application/zip" }),
          ready.filename,
        );
      else
        downloadText(
          ready.files[mode],
          mode,
          mode.endsWith(".html")
            ? "text/html;charset=utf-8"
            : "text/css;charset=utf-8",
        );
      setStatus("Download prepared. Keep index.html and styles.css together.");
    } catch (error) {
      setStatus(error.message);
    }
  }
  return (
    <section className="pb-export-workspace" aria-label="Preview and export">
      <h2 ref={title} tabIndex={-1}>
        Preview and export
      </h2>
      <p>
        Download a standalone webpage with native HTML and CSS. Your project
        JSON remains the editable backup.
      </p>
      <div className="pb-export-grid">
        <div className="pb-export-main">
          <div className="pb-inspector-tabs" aria-label="Output views">
            {[
              ["preview", "Preview"],
              ["html", "HTML"],
              ["css", "CSS"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {updating && <p role="status">Updating preview…</p>}
          {compiled.errors.length ? (
            <p role="alert" className="pb-banner pb-warning">
              Fix critical errors to generate a preview or download.
            </p>
          ) : view === "preview" ? (
            <SandboxPreview compiled={compiled} />
          ) : (
            <CodeViewer key={view} text={compiled[view]} language={view} />
          )}
        </div>
        <aside className="pb-export-review" aria-label="Export review">
          <h3>Preflight</h3>
          <p>
            {compiled.errors.length} critical errors ·{" "}
            {compiled.warnings.length} warnings
          </p>
          <ul className="pb-diagnostics">
            {[...compiled.errors, ...compiled.warnings].map((d, i) => (
              <li key={d.code + ":" + i}>
                <strong>
                  {compiled.errors.includes(d) ? "Critical" : "Warning"} ·{" "}
                  {d.code.replaceAll("-", " ")}
                </strong>
                <p>{d.message}</p>
                {d.elementId && (
                  <button type="button" onClick={() => onLocate(d.elementId)}>
                    Show affected element
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!compiled.errors.length && !compiled.warnings.length && (
            <p>
              No issues found by basic preflight. Review accessibility and
              appearance before publishing.
            </p>
          )}
          {!!compiled.warnings.length && (
            <label className="pb-checkbox">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I reviewed the warnings and want to export.
            </label>
          )}
          <button
            type="button"
            className="pb-primary"
            disabled={blocked}
            onClick={() => download("zip")}
          >
            Download website ZIP
          </button>
          <details>
            <summary>Individual files</summary>
            <p>Save both files in the same folder.</p>
            <button
              type="button"
              disabled={blocked}
              onClick={() => download("index.html")}
            >
              Download index.html
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={() => download("styles.css")}
            >
              Download styles.css
            </button>
          </details>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  diagnosticSummary(compiled),
                );
                setStatus("Sanitized diagnostics copied.");
              } catch {
                setStatus(
                  "Clipboard unavailable. Download diagnostics instead.",
                );
              }
            }}
          >
            Copy diagnostics
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                diagnosticSummary(compiled),
                "page-builder-diagnostics.json",
              )
            }
          >
            Download diagnostics
          </button>
          <p role="status" aria-live="polite">
            {status}
          </p>
        </aside>
      </div>
    </section>
  );
}
