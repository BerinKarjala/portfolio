import { useState } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { protectedSubtree } from "../domain/structure";
import { isContainer } from "../domain/catalog";

export default function ReusableControls({ library = false }) {
  const { state, sendCommand, dispatch, repository, report } = useBuilder();
  const { project, selection, readOnly, masterEdit } = state.editor;
  const e = project.page.elements[selection[0]];
  const [name, setName] = useState("My component"),
    [sourceId, setSourceId] = useState(""),
    [source, setSource] = useState(null),
    [copyId, setCopyId] = useState("");
  const blocked = readOnly || (!!e && protectedSubtree(project, e.id));
  const parentId = e
    ? isContainer(e) && !e.instance
      ? e.id
      : e.parentId
    : null;
  return (
    <section className="pb-reusable-controls" aria-label="Reusable components">
      <h4>Reusable components</h4>
      {masterEdit && (
        <p className="pb-warning">
          Editing shared master content. Changes update every linked instance.
          <button
            type="button"
            onClick={() => dispatch({ type: "MASTER_MODE", id: null })}
          >
            Exit master editing
          </button>
        </p>
      )}
      {e?.instance && !masterEdit && (
        <>
          <p>
            Linked to{" "}
            <strong>{project.masters[e.instance.masterId].name}</strong>.
            Placement and size are local.
          </p>
          <button
            type="button"
            disabled={blocked}
            onClick={() => dispatch({ type: "MASTER_MODE", id: e.id })}
          >
            Edit master
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => sendCommand({ type: "MASTER_DETACH", ids: [e.id] })}
          >
            Detach component
          </button>
        </>
      )}
      {!e?.instance && selection.length === 1 && (
        <fieldset disabled={blocked}>
          <label>
            Component name
            <input
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() =>
              sendCommand({
                type: "MASTER_CREATE",
                ids: selection,
                name: name.trim(),
              })
            }
          >
            Make reusable component
          </button>
        </fieldset>
      )}
      {library && (
        <>
          <p className="pb-muted">
            Linked components share content and styles within this project.
            Copies from another project are independent.
          </p>
          {Object.values(project.masters).map((m) => (
            <article key={m.id} className="pb-component-record">
              <strong>{m.name}</strong>
              <div className="pb-inline-actions">
                <button
                  type="button"
                  disabled={readOnly || !!masterEdit}
                  onClick={() =>
                    sendCommand({
                      type: "MASTER_INSERT",
                      masterId: m.id,
                      parentId,
                    })
                  }
                >
                  Insert {m.name}
                </button>
                <button
                  type="button"
                  disabled={readOnly || !!masterEdit}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Remove this master and detach all instances while keeping their appearance?",
                      )
                    )
                      sendCommand({
                        type: "MASTER_REMOVE",
                        masterId: m.id,
                        confirmed: true,
                      });
                  }}
                >
                  Remove master {m.name}
                </button>
              </div>
            </article>
          ))}
          {!Object.keys(project.masters).length && (
            <p>
              No reusable components yet. Select a component and make it
              reusable.
            </p>
          )}
          <label>
            Copy from project
            <select
              aria-label="Copy from project"
              value={sourceId}
              onChange={(event) => {
                setSourceId(event.target.value);
                setCopyId("");
                try {
                  setSource(
                    event.target.value
                      ? repository.load(event.target.value)
                      : null,
                  );
                } catch (error) {
                  report(error);
                  setSource(null);
                }
              }}
            >
              <option value="">Choose another saved project</option>
              {state.projects
                .filter(
                  (p) =>
                    p.projectId !== project.projectId && p.status === "active",
                )
                .map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          {source && (
            <>
              <label>
                Master to copy
                <select
                  aria-label="Master to copy"
                  value={copyId}
                  onChange={(event) => setCopyId(event.target.value)}
                >
                  <option value="">Choose a component</option>
                  {Object.values(source.masters).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={readOnly || !copyId || !!masterEdit}
                onClick={() =>
                  sendCommand({ type: "MASTER_COPY", source, masterId: copyId })
                }
              >
                Copy independent master
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
