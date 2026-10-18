import { useEffect, useMemo, useRef, useState } from "react";
import { createBackup, inspectBackup } from "../domain/backups";
import { TEMPLATES } from "../domain/templates";
import { downloadText, fileName, readJSONFile } from "../browser/files";
import { useBuilder } from "../state/BuilderProvider";
import { Modal } from "./Dialog";
import { Thumbnail } from "./PagePreview";
import { createProject } from "../domain/project";
import { compileProject } from "../exporters/compiler";
import SandboxPreview from "./SandboxPreview";

export default function Dashboard() {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const {
    state,
    repository,
    report,
    notice,
    publish,
    open,
    create,
    mutate,
    duplicate,
    remove,
    restore,
  } = useBuilder();
  const [preferences, setPreferences] = useState(() =>
    repository.preferences(),
  );
  const [query, setQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [trash, setTrash] = useState(false);
  const [includeTrash, setIncludeTrash] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("blank");
  const [preview, setPreview] = useState(null);
  const [restoreSelection, setRestoreSelection] = useState(new Set());
  const [modalError, setModalError] = useState("");
  const [allowPartial, setAllowPartial] = useState(false);
  const [restoreReport, setRestoreReport] = useState(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const templatePreview = useMemo(
    () =>
      showTemplatePreview && modal?.type === "create"
        ? compileProject(
            createProject({
              name: TEMPLATES.find((t) => t.id === template).name,
              templateId: template,
            }),
          )
        : null,
    [showTemplatePreview, template, modal?.type],
  );
  const projects = useMemo(
    () =>
      state.projects
        .filter(
          (p) =>
            (p.status === "trashed") === trash &&
            (!onlyFavorites || p.favorite) &&
            (!templateFilter || p.originTemplateId === templateFilter) &&
            p.name.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          preferences.sort === "name"
            ? a.name.localeCompare(b.name)
            : b[
                preferences.sort === "created" ? "createdAt" : "updatedAt"
              ].localeCompare(
                a[preferences.sort === "created" ? "createdAt" : "updatedAt"],
              ),
        ),
    [
      state.projects,
      trash,
      onlyFavorites,
      templateFilter,
      query,
      preferences.sort,
    ],
  );
  const activeCount = state.projects.filter(
    (p) => p.status === "active",
  ).length;
  const attempt = (fn) => {
    try {
      return fn();
    } catch (error) {
      report(error);
      return undefined;
    }
  };
  const closeModal = () => {
    setModal(null);
    setModalError("");
  };
  function changePreferences(patch) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    attempt(() => repository.savePreferences({ view: next.view, sort: next.sort }));
  }
  function showModal(value) {
    setModalError("");
    setShowTemplatePreview(false);
    setModal(value);
    setName(value.project?.name || "");
  }
  function exportProjects(items, single = false) {
    attempt(() => {
      downloadText(
        createBackup(items, { includeTrash: single || includeTrash, single }),
        single ? fileName(items[0].name) : "page-builder-collection.json",
      );
      notice("JSON download prepared. Keep backups outside this browser.");
    });
  }
  async function importFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const result = inspectBackup(
        await readJSONFile(file),
        repository.list().projects,
      );
      setPreview(result);
      setAllowPartial(false);
      setRestoreReport(null);
      setRestoreSelection(
        new Set(
          result.entries
            .filter((entry) => !entry.error)
            .map((entry) => entry.index),
        ),
      );
      setModalError("");
    } catch (error) {
      report(error);
    }
  }
  function submitName(event) {
    event.preventDefault();
    try {
      if (modal.type === "create") create(name, template);
      else mutate(modal.project.projectId, { name: name.trim() });
      closeModal();
    } catch (error) {
      setModalError(error.message);
    }
  }
  function toggleSelection(id) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function switchTrash(value) {
    setTrash(value);
    setSelected(new Set());
  }
  return (
    <div className="pb-dashboard">
      <div className="pb-dashboard-heading">
        <div>
          <p className="pb-eyebrow">YOUR CREATIVE SPACE</p>
          <h2 ref={headingRef} tabIndex={-1}>
            Your projects
          </h2>
          <p>
            A home for your next idea. Saved in this browser, ready when you
            are.
          </p>
        </div>
        <button
          type="button"
          className="pb-primary"
          onClick={() => {
            setTemplate("blank");
            showModal({ type: "create" });
          }}
        >
          ＋ New project
        </button>
      </div>
      <div className="pb-tabs" aria-label="Project collection">
        <button
          type="button"
          aria-pressed={!trash}
          onClick={() => switchTrash(false)}
        >
          Active projects ({activeCount})
        </button>
        <button
          type="button"
          aria-pressed={trash}
          onClick={() => switchTrash(true)}
        >
          Trash ({state.projects.length - activeCount})
        </button>
      </div>
      <div className="pb-filters">
        <label className="pb-search">
          Search projects
          <input
            type="search"
            placeholder="Search by project name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Template
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
          >
            <option value="">All templates</option>
            {TEMPLATES.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select
            value={preferences.sort}
            onChange={(e) => changePreferences({ sort: e.target.value })}
          >
            <option value="updated">Last edited</option>
            <option value="created">Date created</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="pb-checkbox">
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
          />
          Favorites only
        </label>
        <div className="pb-view" aria-label="Project view">
          <button
            type="button"
            aria-pressed={preferences.view === "grid"}
            onClick={() => changePreferences({ view: "grid" })}
          >
            Grid
          </button>
          <button
            type="button"
            aria-pressed={preferences.view === "list"}
            onClick={() => changePreferences({ view: "list" })}
          >
            List
          </button>
        </div>
      </div>
      <div className="pb-backup-toolbar">
        <label className="pb-file-button">
          Import JSON
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Import project or collection JSON"
            onChange={importFile}
          />
        </label>
        <button
          type="button"
          onClick={() => exportProjects(state.projects)}
          disabled={
            !state.projects.some((p) => includeTrash || p.status === "active")
          }
        >
          Back up all projects
        </button>
        <button
          type="button"
          onClick={() =>
            exportProjects(
              state.projects.filter((p) => selected.has(p.projectId)),
            )
          }
          disabled={
            !state.projects.some(
              (p) =>
                selected.has(p.projectId) &&
                (includeTrash || p.status === "active"),
            )
          }
        >
          Back up selected
        </button>
        <label className="pb-checkbox">
          <input
            type="checkbox"
            checked={includeTrash}
            onChange={(e) => setIncludeTrash(e.target.checked)}
          />
          Include Trash in backup
        </label>
      </div>
      {trash && (
        <p className="pb-muted">
          Trash is retained until you explicitly delete it. Trashed projects
          still use browser storage.
        </p>
      )}
      <div className={`pb-projects pb-projects-${preferences.view}`}>
        {projects.map((project) => (
          <article key={project.projectId} className="pb-card">
            <div className="pb-card-preview">
              <Thumbnail project={project} />
              <label className="pb-card-select">
                <input
                  type="checkbox"
                  aria-label={`Select ${project.name}`}
                  checked={selected.has(project.projectId)}
                  onChange={() => toggleSelection(project.projectId)}
                />
              </label>
              <button
                type="button"
                className="pb-favorite"
                aria-pressed={project.favorite}
                aria-label={`${project.favorite ? "Unfavorite" : "Favorite"} ${project.name}`}
                onClick={() =>
                  attempt(() =>
                    mutate(project.projectId, { favorite: !project.favorite }),
                  )
                }
              >
                {project.favorite ? "★" : "☆"}
              </button>
            </div>
            <div className="pb-card-body">
              <p className="pb-eyebrow">
                {TEMPLATES.find((t) => t.id === project.originTemplateId)?.name}
              </p>
              <h3>{project.name}</h3>
              <p className="pb-muted">
                Edited{" "}
                <time dateTime={project.updatedAt}>
                  {new Date(project.updatedAt).toLocaleString()}
                </time>
              </p>
              <div className="pb-card-actions">
                {project.status === "active" ? (
                  <>
                    <button
                      type="button"
                      className="pb-primary"
                      aria-label={`Open ${project.name}`}
                      onClick={() => open(project.projectId)}
                    >
                      Open project ↗
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${project.name}`}
                      onClick={() => showModal({ type: "rename", project })}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      aria-label={`Duplicate ${project.name}`}
                      onClick={() =>
                        attempt(() => duplicate(project.projectId))
                      }
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${project.name} to Trash`}
                      onClick={() =>
                        attempt(() =>
                          mutate(project.projectId, { status: "trashed" }),
                        )
                      }
                    >
                      Trash
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={`Restore ${project.name}`}
                      onClick={() =>
                        attempt(() =>
                          mutate(project.projectId, { status: "active" }),
                        )
                      }
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="pb-danger"
                      aria-label={`Permanently delete ${project.name}`}
                      onClick={() => showModal({ type: "delete", project })}
                    >
                      Delete permanently
                    </button>
                  </>
                )}
                <button
                  type="button"
                  aria-label={`Export ${project.name} JSON`}
                  onClick={() => exportProjects([project], true)}
                >
                  JSON ↓
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!projects.length && (
        <div className="pb-empty">
          <span aria-hidden="true">◫</span>
          <h3>
            {query || templateFilter || onlyFavorites
              ? "No matching projects"
              : trash
                ? "Your Trash is empty"
                : "Make something your own."}
          </h3>
          <p>
            {trash
              ? "Deleted projects will appear here until you remove them permanently."
              : "Start with a blank page or choose a starter template."}
          </p>
          {!trash && (
            <button
              type="button"
              onClick={() => {
                setTemplate("blank");
                showModal({ type: "create" });
              }}
            >
              Create your first project
            </button>
          )}
        </div>
      )}
      {!!state.damaged.length && (
        <section className="pb-recovery">
          <h3>Stored data needs attention</h3>
          <p>
            These records were isolated. Download the original data or import a
            JSON backup; healthy projects remain available.
          </p>
          {state.damaged.map((record) => (
            <div key={record.key} className="pb-damaged-record">
              <code>{record.key}</code>
              <p>{record.message}</p>
              <button
                type="button"
                onClick={() =>
                  attempt(() =>
                    downloadText(
                      repository.raw(record.key) || "",
                      "page-builder-stored-data.json",
                    ),
                  )
                }
              >
                Download stored data
              </button>
              <button
                type="button"
                className="pb-danger"
                onClick={() =>
                  attempt(() =>
                    showModal({
                      type: "damaged",
                      record,
                      raw: repository.raw(record.key),
                    }),
                  )
                }
              >
                Delete damaged record
              </button>
            </div>
          ))}
        </section>
      )}
      <footer className="pb-storage-note">
        <p>
          Local projects only · About {(state.bytes / 1024).toFixed(1)} KiB of
          project data, including Trash.
        </p>
        <p>
          Clearing site data removes your projects. Download regular JSON
          backups.
        </p>
        {state.bytes > 3 * 1024 * 1024 && (
          <p className="pb-warning">
            Project data exceeds the conservative 3 MiB warning threshold.
            Browser quotas vary; export a backup and free space before making
            large changes.
          </p>
        )}
      </footer>

      {modal && (
        <Modal
          title={
            modal.type === "create"
              ? "Create a project"
              : modal.type === "rename"
                ? "Rename project"
                : modal.type === "delete"
                  ? "Delete project permanently?"
                  : "Delete damaged record?"
          }
          onClose={closeModal}
        >
          {["create", "rename"].includes(modal.type) ? (
            <form onSubmit={submitName}>
              <label>
                Project name
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My next idea"
                />
              </label>
              {modal.type === "create" && (
                <fieldset>
                  <legend>Choose a starting point</legend>
                  <div className="pb-template-grid">
                    {TEMPLATES.map((item) => (
                      <label
                        key={item.id}
                        className={`pb-template ${template === item.id ? "pb-template-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={item.id}
                          checked={template === item.id}
                          onChange={() => setTemplate(item.id)}
                        />
                        <span
                          className="pb-template-art"
                          style={{ backgroundColor: item.accent }}
                          aria-hidden="true"
                        >
                          <i />
                          <i />
                          <i />
                        </span>
                        <strong>{item.name}</strong>
                        <span>{item.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {modal.type === "create" && (
                <div className="pb-template-preview">
                  <button
                    type="button"
                    aria-expanded={showTemplatePreview}
                    onClick={() => setShowTemplatePreview((v) => !v)}
                  >
                    {showTemplatePreview
                      ? "Hide template preview"
                      : "Preview selected template"}
                  </button>
                  {templatePreview && (
                    <SandboxPreview
                      compiled={templatePreview}
                      title="Template preview"
                    />
                  )}
                </div>
              )}
              {modalError && (
                <p role="alert" className="pb-warning">
                  {modalError}
                </p>
              )}
              <div className="pb-modal-actions">
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pb-primary"
                  disabled={!name.trim()}
                >
                  {modal.type === "create" ? "Create project" : "Save name"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p>
                This removes the stored record from this browser. This action
                cannot be undone. Download a JSON copy first if you need it.
              </p>
              {modalError && (
                <p role="alert" className="pb-warning">
                  {modalError}
                </p>
              )}
              <div className="pb-modal-actions">
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pb-danger"
                  onClick={() => {
                    try {
                      if (modal.type === "delete")
                        remove(modal.project.projectId);
                      else {
                        repository.discardDamaged(modal.record.key, modal.raw);
                        publish();
                      }
                      closeModal();
                    } catch (error) {
                      setModalError(error.message);
                    }
                  }}
                >
                  Delete permanently
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {restoreReport && (
        <Modal
          title="Restore report"
          onClose={() => {
            setRestoreReport(null);
            setModalError("");
          }}
        >
          {modalError && (
            <p role="alert" className="pb-warning">
              {modalError}
            </p>
          )}
          <p>Existing saved projects were preserved.</p>
          <ul>
            {restoreReport.map((row, i) => (
              <li key={i}>
                <strong>
                  {row.name} · {row.status}
                </strong>
                <p>{row.message}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              downloadText(
                JSON.stringify(
                  {
                    kind: "page-builder-restore-report",
                    entries: restoreReport,
                  },
                  null,
                  2,
                ),
                "page-builder-restore-report.json",
              );
            }}
          >
            Download restore report
          </button>
        </Modal>
      )}
      {preview && (
        <Modal title="Review JSON restore" onClose={() => setPreview(null)}>
          <p>
            Choose the projects to restore as independent copies. Existing
            projects are preserved. Matching names receive a number.
          </p>
          <div className="pb-restore-list">
            {preview.entries.map((entry) => (
              <label className="pb-restore-entry" key={entry.index}>
                <input
                  type="checkbox"
                  disabled={!!entry.error}
                  checked={restoreSelection.has(entry.index)}
                  onChange={() =>
                    setRestoreSelection((current) => {
                      const next = new Set(current);
                      next.has(entry.index)
                        ? next.delete(entry.index)
                        : next.add(entry.index);
                      return next;
                    })
                  }
                />
                <span>
                  <strong>
                    {entry.project?.name || `Invalid record ${entry.index + 1}`}
                  </strong>
                  <span>
                    {entry.error ||
                      `${entry.comparison}${entry.project.status === "trashed" ? " · In Trash" : ""}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {!preview.entries.length && <p>No projects in this backup.</p>}
          <label className="pb-checkbox">
            <input
              type="checkbox"
              checked={allowPartial}
              onChange={(e) => setAllowPartial(e.target.checked)}
            />
            Keep successful copies if some restores fail
          </label>
          <p>
            By default, a failed batch rolls back newly added copies where
            possible. Existing projects are always preserved.
          </p>
          {modalError && (
            <p role="alert" className="pb-warning">
              {modalError}
            </p>
          )}
          <div className="pb-modal-actions">
            <button type="button" onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="pb-primary"
              disabled={!restoreSelection.size}
              onClick={() => {
                try {
                  const result = restore(
                    preview.entries.filter((entry) =>
                      restoreSelection.has(entry.index),
                    ),
                    { allowPartial },
                  );
                  setRestoreReport(result.report);
                  setPreview(null);
                } catch (error) {
                  setModalError(error.message);
                  if (error.report) {
                    setRestoreReport(error.report);
                    setPreview(null);
                  }
                  publish();
                }
              }}
            >
              Restore {restoreSelection.size}{" "}
              {restoreSelection.size === 1 ? "copy" : "copies"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
