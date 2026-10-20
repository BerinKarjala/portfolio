import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TEMPLATES } from "../page-builder/domain/templates";
import { createProject } from "../page-builder/domain/project";
import {
  compileProject,
  previewDocument,
} from "../page-builder/exporters/compiler";
import { exportCss } from "./theme";
export default function Examples({ preferences, onClose }) {
  const [template, setTemplate] = useState("blank");
  const dialog = useRef(null);
  const id = useId();
  const compiled = useMemo(
    () =>
      compileProject(
        createProject({ name: "Theme Studio example", templateId: template }),
      ),
    [template],
  );
  const source = useMemo(() => {
    const themed =
      exportCss(preferences) +
      `body,.pb-page,.pb-node { background-color:var(--studio-background) !important; color:var(--studio-text) !important; font-family:var(--studio-font) !important; } a {color:var(--studio-link) !important;} .pb-button,button {background:var(--studio-accent) !important;color:var(--studio-button-text) !important;border-radius:var(--studio-radius) !important;}`;
    return previewDocument({ ...compiled, css: compiled.css + "\n" + themed });
  }, [compiled, preferences]);
  useEffect(() => {
    const previous = document.activeElement;
    if (dialog.current.showModal) dialog.current.showModal();
    else dialog.current.setAttribute("open", "");
    dialog.current.querySelector("button")?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="studio-examples"
      aria-labelledby={id}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        if (e.key === "Tab") {
          const nodes = [
            ...dialog.current.querySelectorAll("button,select,iframe"),
          ];
          const first = nodes[0],
            last = nodes.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <header>
        <h2 id={id}>Themed Page Builder examples</h2>
        <button onClick={onClose}>Close examples</button>
      </header>
      <label>
        Example template
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Real Page Builder starters, with your active theme. External navigation
        and submissions are blocked.
      </p>
      {compiled.errors.length ? (
        <p role="alert">This example could not be previewed.</p>
      ) : (
        <iframe
          title="Themed Page Builder example"
          sandbox=""
          srcDoc={source}
        />
      )}
    </dialog>,
    document.body,
  );
}
