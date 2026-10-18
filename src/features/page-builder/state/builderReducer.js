export const initialState = {
  projects: [],
  damaged: [],
  bytes: 0,
  editor: null,
  error: "",
  notice: "",
};

export function builderReducer(state, action) {
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
        },
      };
    case "CLOSE":
      return { ...state, editor: null };
    case "EDIT_METADATA": {
      if (!state.editor || state.editor.readOnly) return state;
      const patch = Object.fromEntries(
        Object.entries(action.patch).filter(([key]) =>
          ["title", "description", "lang", "indexable", "faviconUrl"].includes(
            key,
          ),
        ),
      );
      return {
        ...state,
        editor: {
          ...state.editor,
          project: {
            ...state.editor.project,
            page: {
              ...state.editor.project.page,
              metadata: { ...state.editor.project.page.metadata, ...patch },
            },
          },
          dirty: true,
          status: "unsaved",
          error: "",
        },
      };
    }
    case "SAVING":
      return state.editor
        ? { ...state, editor: { ...state.editor, status: "saving" } }
        : state;
    case "SAVED":
      return state.editor
        ? {
            ...state,
            editor: {
              ...state.editor,
              project: action.project,
              dirty: false,
              status: "saved",
              error: "",
            },
          }
        : state;
    case "SAVE_FAILED":
      return state.editor
        ? {
            ...state,
            editor: {
              ...state.editor,
              status: "failed",
              error: action.message,
            },
          }
        : state;
    case "READ_ONLY":
      return state.editor
        ? {
            ...state,
            editor: { ...state.editor, readOnly: true, error: action.message },
          }
        : state;
    default:
      return state;
  }
}
