import { useId, useState } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { Modal } from "./Dialog";

const steps = [
  [
    "Start with a project",
    "Choose New project and pick Blank or one of six templates. Preview a template before creating it. Projects stay in this browser; download JSON backups to keep a portable copy.",
  ],
  [
    "Add and arrange",
    "Use Library to insert components, or drag a move handle with a mouse, a touch long press, or Space and arrow keys. Layers lets you find, select, rename and reorder nested elements. Use Escape to cancel a move.",
  ],
  [
    "Make it yours",
    "Select an element to open Inspector. Edit content, layout, typography, colors and accessibility. Double-click text to enter inline editing; Escape exits. Desktop, Tablet and Mobile share styles; breakpoint visibility can differ.",
  ],
  [
    "Preview and export",
    "Open Preview and export to inspect the actual compiled page at different widths. Correct critical errors, review warnings, then download a ZIP containing index.html and styles.css. Preview blocks navigation and form submission.",
  ],
  [
    "Keep and recover your work",
    "Browser autosave protects ordinary edits. Undo keeps 50 actions for this session. Download project JSON or a collection backup before clearing browser data. Reset to original template offers an independent backup copy first. Restart this guide any time from Quick guide.",
  ],
];

export default function QuickGuide() {
  const { repository, state, report } = useBuilder();
  const [preferences, setPreferences] = useState(() =>
    repository.preferences(),
  );
  const [step, setStep] = useState(null);
  const [tip, setTip] = useState(false);
  const tipId = useId();
  function remember(patch) {
    try {
      repository.savePreferences(patch);
      setPreferences(repository.preferences());
    } catch (error) {
      report(error);
    }
  }
  return (
    <>
      <span
        className="pb-help-tip"
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
      >
        <button
          type="button"
          aria-describedby={tip ? tipId : undefined}
          onFocus={() => setTip(true)}
          onBlur={() => setTip(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && tip) {
              event.preventDefault();
              event.stopPropagation();
              setTip(false);
            }
          }}
          onClick={() => {
            setTip(false);
            setStep(0);
          }}
        >
          Quick guide
        </button>
        {tip && (
          <span id={tipId} role="tooltip">
            Learn the workspace, backups and export. Restart any time.
          </span>
        )}
      </span>
      {!state.editor &&
        !preferences.guideCompleted &&
        !preferences.guideDismissed && (
          <aside
            className="pb-guide-offer"
            aria-label="Welcome to Page Builder"
          >
            <p>
              New here? Take the optional five-step guide, or start exploring.
            </p>
            <button type="button" onClick={() => setStep(0)}>
              Start quick guide
            </button>
            <button
              type="button"
              onClick={() => remember({ guideDismissed: true })}
            >
              Dismiss quick guide
            </button>
          </aside>
        )}
      {step !== null && (
        <Modal title="Page Builder quick guide" onClose={() => setStep(null)}>
          <div aria-live="polite" aria-atomic="true" className="pb-guide-step">
            <p className="pb-eyebrow">
              Step {step + 1} of {steps.length}
            </p>
            <h3>{steps[step][0]}</h3>
            <p>{steps[step][1]}</p>
          </div>
          <div className="pb-modal-actions">
            <button type="button" onClick={() => setStep(null)}>
              Skip for now
            </button>
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Previous step
            </button>
            <button
              type="button"
              className="pb-primary"
              onClick={() => {
                if (step < steps.length - 1) setStep(step + 1);
                else {
                  remember({ guideCompleted: true });
                  setStep(null);
                }
              }}
            >
              {step === steps.length - 1 ? "Finish guide" : "Next step"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
