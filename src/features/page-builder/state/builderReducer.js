import { applyCommand } from "../domain/structure";

export const initialState = {
  projects: [],
  damaged: [],
  bytes: 0,
  editor: null,
  error: "",
  notice: "",
};
const snapshot = (project) => ({
  page: project.page,
  globalStyles: project.globalStyles,
  globalEffects: project.globalEffects,
  masters: project.masters,
  presets: project.presets,
});
function commit(state, project, selection, action) {
  const editor = state.editor;
  if (project === editor.project)
    return { ...state, editor: { ...editor, selection } };
  const now = action.now ?? Date.now();
  const coalesce =
    action.historyKey &&
    editor.historyKey === action.historyKey &&
    now - editor.historyTime < 800 &&
    editor.future.length === 0;
  return {
    ...state,
    editor: {
      ...editor,
      project,
      selection,
      masterEdit:
        editor.masterEdit &&
        selection.every(
          (id) =>
            project.page.elements[id]?.instance?.rootId ===
            editor.masterEdit.rootId,
        )
          ? editor.masterEdit
          : null,
      richEditingId: selection.includes(editor.richEditingId)
        ? editor.richEditingId
        : null,
      dirty: true,
      status: "unsaved",
      error: "",
      commandError: "",
      past: coalesce
        ? editor.past
        : [...editor.past, snapshot(editor.project)].slice(-50),
      future: [],
      historyKey: action.historyKey || null,
      historyTime: now,
    },
  };
}
export function builderReducer(state, action) {
  const editor = state.editor;
  switch (action.type) {
    case "REFRESH":
      return { ...state, ...action.collection };
    case "ERROR":
      return { ...state, error: action.message, notice: "" };
    case "NOTICE":
      return { ...state, notice: action.message, error: "" };
    case "OPEN":
      return {
        ...state,
        error: "",
        notice: "",
        editor: {
          project: action.project,
          dirty: false,
          readOnly: action.readOnly,
          status: "saved",
          error: "",
          commandError: "",
          selection: (action.selection || []).filter(
            (id) => action.project.page.elements[id],
          ),
          past: [],
          future: [],
          historyKey: null,
          historyTime: 0,
          masterEdit: null,
          richEditingId: null,
          effectsPaused: false,
          replayVersion: 0,
        },
      };
    case "CLOSE":
      return { ...state, editor: null };
    case "SELECT": {
      if (!editor) return state;
      const ids = [...new Set(action.ids)].filter(
        (id) => editor.project.page.elements[id],
      );
      const selection = action.toggle
        ? [
            ...editor.selection.filter((id) => !ids.includes(id)),
            ...ids.filter((id) => !editor.selection.includes(id)),
          ]
        : ids;
      return {
        ...state,
        editor: {
          ...editor,
          selection,
          commandError: "",
          historyKey: null,
          richEditingId:
            selection.length === 1 && selection[0] === editor.richEditingId
              ? editor.richEditingId
              : null,
          masterEdit:
            editor.masterEdit &&
            selection.every(
              (id) =>
                editor.project.page.elements[id].instance?.rootId ===
                editor.masterEdit.rootId,
            )
              ? editor.masterEdit
              : null,
        },
      };
    }
    case "MASTER_MODE": {
      const e = editor?.project.page.elements[action.id];
      return editor
        ? {
            ...state,
            editor: {
              ...editor,
              masterEdit: e?.instance
                ? { masterId: e.instance.masterId, rootId: e.instance.rootId }
                : null,
              richEditingId: null,
            },
          }
        : state;
    }
    case "RICH_MODE":
      return editor
        ? {
            ...state,
            editor: {
              ...editor,
              richEditingId: editor.readOnly ? null : action.id || null,
            },
          }
        : state;
    case "EFFECTS_PAUSE":
      return editor
        ? {
            ...state,
            editor: { ...editor, effectsPaused: !editor.effectsPaused },
          }
        : state;
    case "EFFECTS_REPLAY":
      return editor
        ? {
            ...state,
            editor: { ...editor, replayVersion: editor.replayVersion + 1 },
          }
        : state;
    case "COMMAND": {
      if (!editor || editor.readOnly) return state;
      try {
        const result = applyCommand(editor.project, action.command);
        return commit(
          state,
          result.project,
          [
            "PATCH",
            "STYLE",
            "PRESET_SAVE",
            "PRESET_REMOVE",
            "PRESET_APPLY",
            "GLOBAL_STYLE",
            "GLOBAL_EFFECTS",
            "MASTER_COPY",
          ].includes(action.command.type)
            ? editor.selection
            : result.selection,
          action,
        );
      } catch (error) {
        return { ...state, editor: { ...editor, commandError: error.message } };
      }
    }
    case "UNDO":
    case "REDO": {
      if (!editor || editor.readOnly) return state;
      const undo = action.type === "UNDO";
      const source = undo ? editor.past : editor.future;
      if (!source.length) return state;
      const project = { ...editor.project, ...source.at(-1) };
      return {
        ...state,
        editor: {
          ...editor,
          project,
          dirty: true,
          status: "unsaved",
          error: "",
          commandError: "",
          historyKey: null,
          masterEdit: null,
          richEditingId: null,
          selection: editor.selection.filter((id) => project.page.elements[id]),
          past: undo
            ? editor.past.slice(0, -1)
            : [...editor.past, snapshot(editor.project)].slice(-50),
          future: undo
            ? [...editor.future, snapshot(editor.project)]
            : editor.future.slice(0, -1),
        },
      };
    }
    case "EDIT_METADATA": {
      if (!editor || editor.readOnly) return state;
      const patch = Object.fromEntries(
        Object.entries(action.patch).filter(([key]) =>
          ["title", "description", "lang", "indexable", "faviconUrl"].includes(
            key,
          ),
        ),
      );
      const project = {
        ...editor.project,
        page: {
          ...editor.project.page,
          metadata: { ...editor.project.page.metadata, ...patch },
        },
      };
      if (
        JSON.stringify(project.page.metadata) ===
        JSON.stringify(editor.project.page.metadata)
      )
        return state;
      return commit(state, project, editor.selection, {
        ...action,
        historyKey: `metadata:${Object.keys(patch).join(",")}`,
      });
    }
    case "SAVING":
      return editor
        ? { ...state, editor: { ...editor, status: "saving" } }
        : state;
    case "SAVED":
      return editor
        ? {
            ...state,
            editor: {
              ...editor,
              project: action.project,
              dirty: false,
              status: "saved",
              error: "",
            },
          }
        : state;
    case "SAVE_FAILED":
      return editor
        ? {
            ...state,
            editor: { ...editor, status: "failed", error: action.message },
          }
        : state;
    case "READ_ONLY":
      return editor
        ? {
            ...state,
            editor: {
              ...editor,
              readOnly: true,
              error: action.message,
              masterEdit: null,
              richEditingId: null,
            },
          }
        : state;
    default:
      return state;
  }
}
