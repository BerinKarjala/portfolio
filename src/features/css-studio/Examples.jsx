import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TEMPLATES } from "../page-builder/domain/templates";
import { createProject } from "../page-builder/domain/project";
import {
  compileProject,
  previewDocument,
} from "../page-builder/exporters/compiler";
import { exportCss } from "./theme";
import { selectedBackground } from "./backgrounds";
export default function Examples({
  preferences,
  failed,
  generatedImages,
  onClose,
}) {
  const [template, setTemplate] = useState("blank");
  const [inlineImage, setInlineImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const selected = selectedBackground(preferences, failed, generatedImages);
  const selectedGenerated =
    selected?.kind === "generated" ? generatedImages[selected.id] : null;
  useEffect(() => {
    setInlineImage(null);
    setImageError(false);
    if (!selectedGenerated) return;
    const reader = new FileReader();
    let active = true;
    reader.onload = () => {
      if (active)
        setInlineImage({ ...selectedGenerated, displayUrl: reader.result });
    };
    reader.onerror = () => {
      if (active) setImageError(true);
    };
    reader.readAsDataURL(selectedGenerated.blob);
    return () => {
      active = false;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [selectedGenerated]);
  const previewImages = useMemo(
    () =>
      inlineImage && inlineImage.id === selected?.id
        ? { [inlineImage.id]: inlineImage }
        : {},
    [inlineImage, selected?.id],
  );

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
      exportCss(preferences, { failed, generatedImages: previewImages }) +
      `body {background-image:var(--studio-image);background-size:cover;background-position:center;} .pb-page {background:transparent !important;} .pb-node { background-color:var(--studio-background) !important; color:var(--studio-text) !important; font-family:var(--studio-font) !important; } a {color:var(--studio-link) !important;} .pb-button,button {background:var(--studio-accent) !important;color:var(--studio-button-text) !important;border-radius:var(--studio-radius) !important;}`;
    return previewDocument({
      ...compiled,
      css: compiled.css + "\n" + themed,
    }).replace(
      "img-src https:;",
      `img-src https: data: ${window.location.origin};`,
    );
  }, [compiled, preferences, failed, previewImages]);
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
      {compiled.errors.length || imageError ? (
        <p role="alert">This example could not be previewed.</p>
      ) : selectedGenerated && inlineImage?.id !== selectedGenerated.id ? (
        <p role="status">Preparing the selected background…</p>
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
