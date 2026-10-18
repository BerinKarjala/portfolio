import { useState } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { TEMPLATES } from "../domain/templates";
import { Modal } from "./Dialog";

export default function TemplateReset() {
  const { state, resetTemplate } = useBuilder();
  const [open, setOpen] = useState(false);
  const [backup, setBackup] = useState(true);
  const [error, setError] = useState("");
  const template = TEMPLATES.find(
    (t) => t.id === state.editor.project.originTemplateId,
  );
  return (
    <>
      <button
        type="button"
        disabled={state.editor.readOnly}
        title={`Restore the original ${template.name} template`}
        onClick={() => {
          setError("");
          setBackup(true);
          setOpen(true);
        }}
      >
        Reset to original template
      </button>
      {open && (
        <Modal
          title="Reset to original template"
          onClose={() => setOpen(false)}
        >
          <p>
            Replace this website’s content, metadata, shared components, presets
            and styling with the original {template.name} template? The project
            name and identity stay the same. Undo is available in this session.
          </p>
          <label className="pb-checkbox">
            <input
              type="checkbox"
              checked={backup}
              onChange={(event) => setBackup(event.target.checked)}
            />
            Create an independent copy of my current work first
          </label>
          <p>
            The copy includes unsaved edits. If it cannot be saved, the reset
            stops. You can also download project JSON before resetting.
          </p>
          {error && (
            <p role="alert" className="pb-warning">
              {error}
            </p>
          )}
          <div className="pb-modal-actions">
            <button type="button" onClick={() => setOpen(false)}>
              Cancel reset
            </button>
            <button
              type="button"
              className="pb-danger"
              onClick={() => {
                try {
                  resetTemplate({ backup });
                  setOpen(false);
                } catch (error) {
                  setError(error.message);
                }
              }}
            >
              Confirm template reset
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
