import { useEffect, useMemo, useRef, useState } from "react";
import Dialog from "./Dialog";
import ElementWizardFields from "./ElementWizardFields";
import { CommitFieldEscapeContext } from "./CommitField";
import { useBuilder } from "../state/BuilderProvider";
import { COMPONENTS } from "../domain/catalog";
import { applyCommand, pathName, protectedSubtree } from "../domain/structure";
import {
  mergeWizardChanges,
  mergeWizardPatch,
  wizardSteps,
} from "../domain/elementWizard";
import { compileProject, previewDocument } from "../exporters/compiler";
import "./element-wizard.css";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const freshDrafts = (element) =>
  Object.fromEntries(
    wizardSteps(element).map(({ id }) => [
      id,
      { baseline: structuredClone(element), changes: {} },
    ]),
  );
const title = (value) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const friendly = {
  alt: "Image description",
  src: "Source URL",
  href: "Link destination",
  document: "Text and formatting",
  fields: "Form field definitions",
  rows: "Table data",
  images: "Gallery images",
};

function changedFields(changes) {
  return Object.entries(changes).flatMap(([key, value]) => {
    if (key === "styles")
      return [
        ...Object.keys(value.overrides || {}).map(title),
        ...Object.keys(value.states || {}).map(
          (state) => `${state} appearance`,
        ),
      ];
    if (
      [
        "props",
        "layout",
        "geometry",
        "visibility",
        "effects",
        "accessibility",
      ].includes(key)
    )
      return Object.keys(value).map((field) => friendly[field] || title(field));
    return [title(key)];
  });
}

export function safeWizardPreview(project) {
  const compiled = compileProject(project);
  if (compiled.errors.length || !compiled.document)
    throw new Error(
      compiled.errors[0]?.message || "This project cannot be previewed yet.",
    );
  // Keep the existing compiler's CSP and empty sandbox. Scrolling is allowed;
  // links, submissions, embeds, and automatic playback remain inactive.
  function inert(node) {
    if (!node || typeof node !== "object") return;
    if (node.tag === "iframe") {
      const label = `${node.attrs.title || "External embed"} · preview disabled`;
      node.tag = "div";
      node.attrs = {
        class: node.attrs.class,
        role: "img",
        "aria-label": label,
      };
      node.children = [label];
    }
    if (node.tag === "a") delete node.attrs.href;
    if (["video", "audio"].includes(node.tag)) delete node.attrs.autoplay;
    if (["input", "button", "textarea", "select"].includes(node.tag))
      node.attrs.disabled = true;
    (node.children || []).forEach(inert);
  }
  inert(compiled.document);
  return previewDocument(compiled);
}

function Preview({ source, designWidth, visible }) {
  const ref = useRef(null);
  const frameRef = useRef(null);
  const [available, setAvailable] = useState(320);
  useEffect(() => {
    if (!visible) return;
    let frame;
    const retainDialogFocus = () => {
      // Opaque frames cannot forward keys. Window blur is not emitted reliably
      // by every engine, so watch focus only while this preview is visible.
      if (document.activeElement === frameRef.current)
        ref.current?.focus({ preventScroll: true });
      frame = requestAnimationFrame(retainDialogFocus);
    };
    frame = requestAnimationFrame(retainDialogFocus);
    return () => cancelAnimationFrame(frame);
  }, [visible]);
  useEffect(() => {
    const measure = () => {
      if (ref.current?.clientWidth) setAvailable(ref.current.clientWidth);
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const width = Math.max(240, designWidth),
    scale = Math.min(1, available / width);
  return (
    <div
      ref={ref}
      className="pb-wizard-preview-frame"
      tabIndex={-1}
      role="group"
      aria-label="Read-only page preview"
    >
      <p className="pb-muted">
        {width}px design viewport · scaled to fit · scroll inside to explore
      </p>
      <div className="pb-wizard-preview-stage">
        <div style={{ width: width * scale, height: 640 * scale }}>
          <iframe
            ref={frameRef}
            title="Element configuration preview"
            sandbox=""
            referrerPolicy="no-referrer"
            tabIndex={-1}
            srcDoc={source}
            style={{
              width,
              height: 640,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ElementWizard({
  targetId,
  designWidth,
  measure,
  onClose,
  restoreFocus,
}) {
  const { state, configureElement } = useBuilder();
  const { project, readOnly, masterEdit, status } = state.editor;
  const initial = useRef(structuredClone(project.page.elements[targetId]));
  const projectId = useRef(project.projectId);
  const expected = useRef(initial.current);
  const [drafts, setDrafts] = useState(() => freshDrafts(initial.current));
  const [index, setIndex] = useState(0),
    [epoch, setEpoch] = useState(0);
  const [error, setError] = useState(""),
    [applied, setApplied] = useState([]);
  const [view, setView] = useState("settings");
  const [narrow, setNarrow] = useState(
    () => window.matchMedia?.("(max-width: 63rem)").matches ?? true,
  );
  const root = useRef(null),
    stepHeading = useRef(null),
    nextButton = useRef(null);
  const textHistory = useRef({ past: [], future: [] });
  const lastPreview = useRef("");
  const visited = useRef(new Set());
  const applying = useRef(false);
  const current = project.page.elements[targetId];
  const steps = wizardSteps(initial.current),
    step = steps[index];
  const draft = drafts[step.id];
  visited.current.add(step.id);
  const element = mergeWizardChanges(draft.baseline, draft.changes);
  const componentName =
    COMPONENTS.find((c) => c.type === initial.current.type)?.name ||
    initial.current.type;
  const blocked =
    project.projectId !== projectId.current
      ? "This wizard belongs to another project."
      : !current
        ? "This element no longer exists. Your unfinished inputs are still shown."
        : readOnly
          ? "This project is read-only. Your unfinished inputs are still shown."
          : masterEdit
            ? "Exit master editing before configuring a local copy."
            : protectedSubtree(project, targetId)
              ? "A locked element or descendant prevents configuration."
              : !same(current, expected.current)
                ? "This element changed outside the wizard. Reload current settings before applying."
                : "";

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 63rem)");
    if (!media) return;
    const change = () => setNarrow(media.matches);
    media.addEventListener?.("change", change);
    return () => media.removeEventListener?.("change", change);
  }, []);
  useEffect(() => {
    applying.current = false;
    stepHeading.current?.focus({ preventScroll: true });
  }, [index, epoch]);
  useEffect(() => {
    const focused = document.activeElement;
    if (!root.current?.contains(focused) || focused.closest("[hidden]")) {
      const control = narrow
        ? root.current?.querySelector(`[data-wizard-view='${view}']`)
        : stepHeading.current;
      control?.focus({ preventScroll: true });
    }
  }, [narrow, view, readOnly]);

  function update(patch) {
    setError("");
    root.current
      ?.querySelectorAll("[aria-invalid='true']")
      .forEach((node) => node.removeAttribute("aria-invalid"));
    if (patch.props?.document) {
      textHistory.current.past.push(element.props.document);
      textHistory.current.future = [];
    }
    setDrafts((all) => ({
      ...all,
      [step.id]: {
        ...all[step.id],
        changes: mergeWizardPatch(all[step.id].changes, patch),
      },
    }));
  }
  function textUndo(direction) {
    const history = textHistory.current,
      undo = direction === "UNDO";
    const from = undo ? history.past : history.future,
      to = undo ? history.future : history.past;
    if (!from.length) return;
    const document = from.pop();
    to.push(element.props.document);
    setDrafts((all) => ({
      ...all,
      content: {
        ...all.content,
        changes: mergeWizardPatch(all.content.changes, { props: { document } }),
      },
    }));
  }
  const command = {
    type: "CONFIGURE_ELEMENT",
    ids: [targetId],
    projectId: projectId.current,
    baseline: draft.baseline,
    step: step.id,
    changes: draft.changes,
    placements:
      measure && current && !blocked ? measure([targetId]) : undefined,
  };
  const preview = useMemo(() => {
    try {
      const prospective =
        step.id === "review" || blocked
          ? project
          : applyCommand(project, command).project;
      return { source: safeWizardPreview(prospective), error: "" };
    } catch (problem) {
      return { source: "", error: problem.message };
    }
  }, [project, drafts, index, blocked]);
  if (preview.source) lastPreview.current = preview.source;

  function revealError(message) {
    setError(message);
    setView("settings");
    requestAnimationFrame(() => {
      const section = root.current?.querySelector(
        `[data-wizard-step='${step.id}']`,
      );
      const normalized = message.replace(/[^a-z]/gi, "").toLowerCase();
      const invalidStyle = message.match(/style:\s*(\w+)/i)?.[1]?.toLowerCase();
      const input = [
        ...(section?.querySelectorAll(
          "input,select,textarea,[contenteditable='true']",
        ) || []),
      ].find((node) => {
        const name =
          node.getAttribute("aria-label") ||
          node.labels?.[0]?.textContent ||
          "";
        const label = name.replace(/[^a-z]/gi, "").toLowerCase();
        return (
          label &&
          (invalidStyle ? label === invalidStyle : normalized.includes(label))
        );
      });
      section?.querySelectorAll("details").forEach((details) => {
        details.open = true;
      });
      if (input) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
      } else root.current?.querySelector("[role='alert']")?.focus();
    });
  }
  function complete() {
    if (applying.current) return;
    if (blocked) {
      revealError(blocked);
      return;
    }
    const localError = root.current?.querySelector(
      `[data-wizard-step='${step.id}'] [role='alert']`,
    );
    if (localError) {
      revealError(localError.textContent);
      return;
    }
    const result = configureElement(command);
    if (result.error) {
      revealError(result.error);
      return;
    }
    applying.current = true;
    const accepted = result.project.page.elements[targetId];
    if (!same(accepted, current))
      setApplied((entries) => [
        ...entries,
        { label: step.label, fields: changedFields(draft.changes) },
      ]);
    expected.current = accepted;
    setDrafts((all) =>
      Object.fromEntries(
        Object.entries(all).map(([id, item]) => [
          id,
          {
            baseline: structuredClone(accepted),
            changes: id === step.id ? {} : item.changes,
          },
        ]),
      ),
    );
    textHistory.current = { past: [], future: [] };
    setError("");
    setView("settings");
    setIndex((value) => value + 1);
  }
  function reload() {
    if (!current) return;
    initial.current = structuredClone(current);
    expected.current = current;
    setDrafts(freshDrafts(current));
    setApplied([]);
    setError("");
    setIndex(0);
    setView("settings");
    textHistory.current = { past: [], future: [] };
    visited.current = new Set();
    setEpoch((value) => value + 1);
  }
  function switchView(value) {
    setView(value);
    requestAnimationFrame(() =>
      root.current?.querySelector(`[data-wizard-view='${value}']`)?.focus(),
    );
  }
  const saveText =
    status === "saved"
      ? "Saved in this browser"
      : status === "saving"
        ? "Saving applied changes…"
        : status === "failed"
          ? "Applied in memory · save failed"
          : "Applied in memory · not saved yet";
  return (
    <CommitFieldEscapeContext.Provider value={false}>
      <Dialog
        labelledBy="pb-element-wizard-title"
        onDismiss={onClose}
        className="pb-element-wizard-dialog"
        restoreFocus={restoreFocus}
      >
        <div ref={root} className="pb-element-wizard">
          <header className="pb-wizard-heading" role="presentation">
            <div>
              <h2 id="pb-element-wizard-title">Configure {componentName}</h2>
              <p className="pb-muted">
                {current ? pathName(project, targetId) : initial.current.name}
              </p>
            </div>
            <button type="button" aria-label="Close wizard" onClick={onClose}>
              Close
            </button>
          </header>
          <div className="pb-wizard-progress">
            <h3 ref={stepHeading} tabIndex={-1}>
              Step {index + 1} of {steps.length}: {step.label}
            </h3>
            <ol aria-label="Configuration progress">
              {steps.map((item, position) => (
                <li
                  key={item.id}
                  aria-current={position === index ? "step" : undefined}
                >
                  <span aria-hidden="true">{position < index ? "✓ " : ""}</span>
                  {item.label}
                </li>
              ))}
            </ol>
          </div>
          {initial.current.instance && (
            <p className="pb-wizard-linked">
              Linked copy: local overrides only. Shared content and appearance
              are read-only.
            </p>
          )}
          {(error || blocked) && (
            <div role="alert" tabIndex={-1} className="pb-warning">
              {error || blocked}
              {current &&
                !readOnly &&
                !masterEdit &&
                !same(current, expected.current) && (
                  <button type="button" onClick={reload}>
                    Reload current settings (discard unfinished inputs)
                  </button>
                )}
            </div>
          )}
          {narrow && (
            <div className="pb-wizard-view-switch" aria-label="Wizard view">
              <button
                type="button"
                data-wizard-view="settings"
                aria-pressed={view === "settings"}
                onClick={() => switchView("settings")}
              >
                Settings
              </button>
              <button
                type="button"
                data-wizard-view="preview"
                aria-pressed={view === "preview"}
                onClick={() => switchView("preview")}
              >
                Preview
              </button>
            </div>
          )}
          <div className="pb-wizard-columns">
            <section
              className="pb-wizard-fields"
              hidden={narrow && view !== "settings"}
              aria-label="Element settings"
            >
              {steps
                .filter(
                  (item) =>
                    item.id !== "review" && visited.current.has(item.id),
                )
                .map((item) => {
                  const itemDraft = drafts[item.id];
                  return (
                    <section
                      key={`${epoch}:${item.id}`}
                      data-wizard-step={item.id}
                      hidden={step.id !== item.id}
                    >
                      <fieldset disabled={!!blocked}>
                        <ElementWizardFields
                          element={mergeWizardChanges(
                            itemDraft.baseline,
                            itemDraft.changes,
                          )}
                          step={item.id}
                          project={project}
                          changes={itemDraft.changes}
                          disabled={!!blocked}
                          update={item.id === step.id ? update : () => {}}
                          placement={command.placements?.[targetId]}
                          onTextHistory={textUndo}
                          onTextDone={() => nextButton.current?.focus()}
                        />
                      </fieldset>
                    </section>
                  );
                })}
              {step.id === "review" && (
                <section aria-label="Applied changes">
                  <h3>These changes are already applied</h3>
                  {applied.length ? (
                    <ol className="pb-wizard-change-list">
                      {applied.map((entry, position) => (
                        <li key={position}>
                          <strong>{entry.label}</strong>
                          <p>{entry.fields.join(", ")}</p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>No changes were needed in the completed steps.</p>
                  )}
                  <p>
                    Finish closes the wizard. Undo reverses one changed step at
                    a time.
                  </p>
                </section>
              )}
            </section>
            <section
              className="pb-wizard-preview"
              hidden={narrow && view !== "preview"}
              aria-label="Contextual preview"
            >
              <h3>Contextual preview</h3>
              <p>
                {step.id === "review"
                  ? "Current applied values"
                  : "Preview includes unfinished changes"}
              </p>
              {preview.error && (
                <p className="pb-warning">
                  Preview not updated: {preview.error} Showing the last valid
                  preview when available.
                </p>
              )}
              {lastPreview.current ? (
                <Preview
                  source={lastPreview.current}
                  designWidth={designWidth}
                  visible={!narrow || view === "preview"}
                />
              ) : (
                <p>
                  A preview will appear when these settings can be rendered.
                </p>
              )}
              {narrow && (
                <button type="button" onClick={() => switchView("settings")}>
                  Return to settings
                </button>
              )}
            </section>
          </div>
          <footer className="pb-wizard-footer" role="presentation">
            <p className="pb-wizard-save" aria-live="polite">
              Applied project: {saveText}
            </p>
            <p className="pb-muted">
              Completed steps are already applied. Close discards unfinished
              inputs only.
            </p>
            <div className="pb-inline-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  setIndex(index - 1);
                  setError("");
                  setView("settings");
                }}
              >
                Back
              </button>
              {step.id === "review" ? (
                <button type="button" className="pb-primary" onClick={onClose}>
                  Finish
                </button>
              ) : (
                (!narrow || view === "settings") && (
                  <button
                    ref={nextButton}
                    type="button"
                    className="pb-primary"
                    disabled={!!blocked}
                    onClick={complete}
                  >
                    Next: apply step
                  </button>
                )
              )}
            </div>
          </footer>
        </div>
      </Dialog>
    </CommitFieldEscapeContext.Provider>
  );
}
