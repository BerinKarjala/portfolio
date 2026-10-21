import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { createProject, duplicateProject, newId } from "../domain/project";
import { restoreBackupDetailed, uniqueName } from "../domain/backups";
import {
  browserStorage,
  createRepository,
  OWNER_PREFIX,
  PROJECT_PREFIX,
  StorageConflictError,
} from "../domain/storage";
import { builderReducer, initialState } from "./builderReducer";
import { resetToOrigin } from "../domain/reset";
import { localInstanceCommand } from "../domain/masters";
import { applyCommand } from "../domain/structure";

const BuilderContext = createContext(null);
export function useBuilder() {
  return useContext(BuilderContext);
}

export default function BuilderProvider({ children }) {
  const [repository] = useState(() => createRepository(browserStorage()));
  const [token] = useState(newId);
  const [state, dispatch] = useReducer(builderReducer, initialState, (base) => {
    try {
      return { ...base, ...repository.list() };
    } catch (error) {
      return { ...base, error: error.message };
    }
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const channel = useRef(null);

  const refresh = useCallback(() => {
    try {
      dispatch({ type: "REFRESH", collection: repository.list() });
    } catch (error) {
      dispatch({ type: "ERROR", message: error.message });
    }
  }, [repository]);
  const publish = useCallback(() => {
    refresh();
    try {
      channel.current?.postMessage({ type: "changed" });
    } catch {
      /* Storage events still coordinate tabs. */
    }
  }, [refresh]);
  const report = useCallback(
    (error) =>
      dispatch({ type: "ERROR", message: error.message || String(error) }),
    [],
  );
  const notice = useCallback(
    (message) => dispatch({ type: "NOTICE", message }),
    [],
  );

  const saveNow = useCallback(() => {
    const editor = stateRef.current.editor;
    if (!editor?.dirty) return true;
    if (editor.readOnly) return false;
    try {
      dispatch({ type: "SAVING" });
      const saved = repository.save(editor.project, {
        expectedRevision: editor.project.revision,
        token,
      });
      dispatch({ type: "SAVED", project: saved });
      publish();
      return true;
    } catch (error) {
      dispatch({
        type:
          error instanceof StorageConflictError ? "READ_ONLY" : "SAVE_FAILED",
        message: error.message,
      });
      return false;
    }
  }, [publish, repository, token]);

  const projectId = state.editor?.project.projectId;
  // One content edit schedules one save. Failures require another edit or explicit retry.
  useEffect(() => {
    if (!state.editor?.dirty || state.editor.readOnly) return;
    const timer = setTimeout(saveNow, 1000);
    return () => clearTimeout(timer);
  }, [
    state.editor?.project,
    state.editor?.dirty,
    state.editor?.readOnly,
    saveNow,
  ]);

  useEffect(() => {
    if (!state.editor?.dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.editor?.dirty]);

  useEffect(() => {
    function sync() {
      refresh();
      const editor = stateRef.current.editor;
      if (!editor) return;
      try {
        const latest = repository.load(editor.project.projectId);
        if (
          !repository.owns(editor.project.projectId, token) ||
          latest.revision !== editor.project.revision
        ) {
          dispatch({
            type: "READ_ONLY",
            message:
              "Editing ownership or the saved revision changed in another tab. Your in-memory work is preserved. Download unsaved JSON before reloading or taking over.",
          });
        }
      } catch (error) {
        dispatch({ type: "READ_ONLY", message: error.message });
      }
    }
    const storageEvent = (event) => {
      if (
        event.key === null ||
        event.key?.startsWith(PROJECT_PREFIX) ||
        event.key?.startsWith(OWNER_PREFIX)
      )
        sync();
    };
    if (typeof window.BroadcastChannel === "function") {
      try {
        channel.current = new window.BroadcastChannel("page-builder");
        channel.current.onmessage = sync;
      } catch {
        /* Storage events remain available. */
      }
    }
    window.addEventListener("storage", storageEvent);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", storageEvent);
      window.removeEventListener("focus", sync);
      channel.current?.close();
      channel.current = null;
    };
  }, [refresh, repository, token]);

  useEffect(() => {
    if (!projectId) return;
    const heartbeat = setInterval(() => {
      if (stateRef.current.editor?.readOnly) return;
      try {
        if (!repository.renew(projectId, token))
          dispatch({
            type: "READ_ONLY",
            message:
              "Your editing lease expired or another tab took over. Download unsaved JSON, then take over to continue.",
          });
      } catch (error) {
        dispatch({ type: "READ_ONLY", message: error.message });
      }
    }, 15000);
    return () => {
      clearInterval(heartbeat);
      try {
        repository.release(projectId, token);
      } catch {
        /* A lease also expires after 45 seconds. */
      }
    };
  }, [projectId, repository, token]);

  // Closing a tab releases ownership when possible; crashes fall back to lease expiry.
  useEffect(() => {
    const leave = () => {
      saveNow();
      const id = stateRef.current.editor?.project.projectId;
      if (id) {
        try {
          repository.release(id, token);
        } catch {
          /* Expiry is the fallback. */
        }
      }
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [repository, saveNow, token]);

  function open(id) {
    try {
      const project = repository.load(id);
      if (project.status !== "active")
        throw new Error("Restore the project from Trash before opening it.");
      const editable = repository.acquire(id, token);
      dispatch({
        type: "OPEN",
        project,
        readOnly: !editable,
        selection: repository.workspace(id).selectedIds,
      });
      try {
        channel.current?.postMessage({ type: "changed" });
      } catch {
        /* Storage events remain available. */
      }
    } catch (error) {
      report(error);
    }
  }
  function canLeave() {
    if (saveNow()) return true;
    return window.confirm(
      "This project has unsaved changes. Download its unsaved JSON before leaving. Leave and discard these in-memory changes?",
    );
  }
  function back() {
    if (canLeave()) {
      dispatch({ type: "CLOSE" });
      publish();
    }
  }
  function create(name, templateId) {
    const project = createProject({
      name: uniqueName(name.trim(), stateRef.current.projects),
      templateId,
    });
    repository.create(project);
    publish();
    open(project.projectId);
  }
  function mutate(id, patch) {
    const project = repository.load(id);
    if (typeof patch.name === "string") {
      patch = {
        ...patch,
        name: uniqueName(
          patch.name.trim(),
          repository.list().projects.filter((item) => item.projectId !== id),
        ),
      };
    }
    if (!repository.acquire(id, token))
      throw new Error(
        "This project is being edited in another tab. Open it and take over editing first.",
      );
    try {
      repository.save(
        { ...project, ...patch },
        { expectedRevision: project.revision, token },
      );
    } finally {
      repository.release(id, token);
    }
    publish();
  }
  function duplicate(id) {
    const original = repository.load(id);
    const copy = duplicateProject(
      original,
      uniqueName(
        `${original.name.slice(0, 95)} copy`,
        repository.list().projects,
      ),
    );
    repository.create(copy);
    publish();
    notice(`Created ${copy.name}.`);
  }
  function remove(id) {
    const project = repository.load(id);
    if (!repository.acquire(id, token))
      throw new Error("Another tab owns this project.");
    try {
      repository.remove(id, { expectedRevision: project.revision, token });
    } finally {
      repository.release(id, token);
    }
    publish();
    notice("Project permanently deleted.");
  }
  function restore(entries, options) {
    const result = restoreBackupDetailed(repository, entries, options);
    const projects = result.created;
    publish();
    notice(
      `Restored ${projects.length} independent ${projects.length === 1 ? "copy" : "copies"}. Existing records were preserved.`,
    );
    return result;
  }
  function resetTemplate({ backup = false } = {}) {
    const editor = stateRef.current.editor;
    if (!editor || editor.readOnly)
      throw new Error("Take over editing before resetting.");
    const id = editor.project.projectId;
    if (
      !repository.owns(id, token) ||
      repository.load(id).revision !== editor.project.revision
    )
      throw new StorageConflictError(
        "The saved project or editing owner changed. Download unsaved JSON before reloading.",
      );
    // Validate the reset before any backup write. Failed backup aborts the reset.
    resetToOrigin(editor.project);
    if (backup) {
      const copy = duplicateProject(
        editor.project,
        uniqueName(
          `${editor.project.name.slice(0, 85)} before reset`,
          repository.list().projects,
        ),
      );
      repository.create(copy);
      publish();
    }
    dispatch({ type: "RESET_TEMPLATE" });
    notice(
      backup
        ? "Original template restored. An independent copy preserves your previous work."
        : "Original template restored. Undo is available in this session.",
    );
  }
  function takeOver() {
    const editor = stateRef.current.editor;
    try {
      // Explicitly discard only after the user has seen the unsaved-work warning.
      if (
        editor.dirty &&
        !window.confirm(
          "Taking over reloads the saved project and discards this tab's unsaved changes. Download unsaved JSON first. Continue?",
        )
      )
        return;
      const project = repository.load(editor.project.projectId);
      if (project.status !== "active")
        throw new Error(
          "This project is now in Trash. Return to projects to restore it.",
        );
      if (!repository.acquire(project.projectId, token, true))
        throw new Error("Ownership changed again. Try taking over once more.");
      dispatch({ type: "OPEN", project, readOnly: false });
      publish();
    } catch (error) {
      report(error);
    }
  }
  function editMetadata(patch) {
    try {
      if (!repository.owns(projectId, token))
        throw new StorageConflictError(
          "Another tab owns this project. Download unsaved JSON before taking over.",
        );
      dispatch({ type: "EDIT_METADATA", patch });
    } catch (error) {
      dispatch({ type: "READ_ONLY", message: error.message });
    }
  }
  const sendCommand = useCallback(
    (command, historyKey) => {
      const editor = stateRef.current.editor;
      if (!editor || editor.readOnly) return;
      try {
        if (!repository.owns(editor.project.projectId, token))
          throw new StorageConflictError(
            "Another tab owns this project. Download unsaved JSON before taking over.",
          );
        dispatch(
          typeof command === "string"
            ? { type: command }
            : {
                type: "COMMAND",
                command:
                  editor.masterEdit &&
                  !command.type.startsWith("MASTER") &&
                  !localInstanceCommand(editor.project, command)
                    ? {
                        type: "MASTER_EDIT",
                        masterId: editor.masterEdit.masterId,
                        instanceRoot: editor.masterEdit.rootId,
                        command,
                      }
                    : command,
                historyKey,
              },
        );
      } catch (error) {
        dispatch({ type: "READ_ONLY", message: error.message });
      }
    },
    [repository, token],
  );
  const select = useCallback(
    (ids, toggle = false) => dispatch({ type: "SELECT", ids, toggle }),
    [],
  );
  const configureElement = useCallback(
    (command) => {
      const editor = stateRef.current.editor;
      if (!editor || editor.readOnly)
        return { error: "This project is read-only." };
      try {
        if (!repository.owns(editor.project.projectId, token))
          throw new StorageConflictError(
            "Another tab owns this project. Download unsaved JSON before taking over.",
          );
      } catch (error) {
        dispatch({ type: "READ_ONLY", message: error.message });
        return { error: error.message };
      }
      try {
        if (command.type !== "CONFIGURE_ELEMENT" || editor.masterEdit)
          throw new Error(
            "Exit master editing before configuring a local copy.",
          );
        // A synchronous result lets the dialog advance only after the complete
        // candidate passes. The reducer independently rechecks the same boundary.
        const result = applyCommand(editor.project, command);
        dispatch({ type: "COMMAND", command });
        return result;
      } catch (error) {
        return { error: error.message };
      }
    },
    [repository, token],
  );
  return (
    <BuilderContext.Provider
      value={{
        state,
        repository,
        dispatch,
        report,
        notice,
        refresh,
        publish,
        open,
        create,
        mutate,
        duplicate,
        remove,
        restore,
        back,
        canLeave,
        saveNow,
        takeOver,
        resetTemplate,
        editMetadata,
        sendCommand,
        configureElement,
        select,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}
