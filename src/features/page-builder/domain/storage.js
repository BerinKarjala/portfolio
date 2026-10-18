import { migrateProject, validateProject } from "./project";

export const PROJECT_PREFIX = "page-builder:project:";
export const OWNER_PREFIX = "page-builder:owner:";
const WORKSPACE_PREFIX = "page-builder:workspace:";
const PREFERENCES_KEY = "page-builder:preferences";
const PALETTE_KEY = "page-builder:palette";
const LEASE_MS = 45000;

export class StorageConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "StorageConflictError";
  }
}

/** Browser operations are injected so quotas, denied access and races are testable.
 * @param {Pick<Storage, "length"|"key"|"getItem"|"setItem"|"removeItem">} storage
 * @param {{now?: () => number}} options
 */
export function createRepository(storage, { now = Date.now } = {}) {
  function read(key) {
    try {
      return storage.getItem(key);
    } catch {
      throw new Error(
        "Browser storage is unavailable. Enable site storage, or download your unsaved project JSON.",
      );
    }
  }
  function write(key, value) {
    try {
      storage.setItem(key, value);
    } catch {
      throw new Error(
        "Browser storage could not save this change (quota or access restriction). Your last saved record is unchanged. Download the unsaved JSON before leaving.",
      );
    }
  }
  function removeKey(key) {
    try {
      storage.removeItem(key);
    } catch {
      throw new Error("Browser storage could not delete this record.");
    }
  }
  function projectKey(id) {
    if (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))
      throw new Error("Invalid project ID.");
    return `${PROJECT_PREFIX}${id}`;
  }
  function decode(raw, id) {
    if (raw === null)
      throw new StorageConflictError(
        "Project no longer exists. Reload the dashboard.",
      );
    const project = migrateProject(JSON.parse(raw));
    if (project.projectId !== id)
      throw new Error("Stored key and project ID do not match.");
    return project;
  }
  function load(id) {
    const key = projectKey(id);
    const raw = read(key);
    const project = decode(raw, id);
    if (JSON.parse(raw).schemaVersion !== project.schemaVersion) {
      if (read(key) !== raw)
        throw new StorageConflictError(
          "Project changed during migration. Reload before trying again.",
        );
      write(key, JSON.stringify(project)); // One replacement, only after full validation.
    }
    return project;
  }
  function list() {
    const projects = [];
    const damaged = [];
    let bytes = 0;
    const keys = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(PROJECT_PREFIX)) keys.push(key);
      }
    } catch {
      throw new Error(
        "Browser storage is unavailable. Saved projects have not been changed.",
      );
    }
    for (const key of keys) {
      const raw = read(key);
      bytes += (key.length + (raw?.length || 0)) * 2;
      try {
        projects.push(load(key.slice(PROJECT_PREFIX.length)));
      } catch (error) {
        damaged.push({ key, message: error.message });
      }
    }
    return { projects, damaged, bytes };
  }
  function create(project) {
    validateProject(project);
    const key = projectKey(project.projectId);
    if (read(key) !== null)
      throw new StorageConflictError(
        "A project with this ID already exists. Import an independent copy instead.",
      );
    if (project.revision !== 0)
      throw new Error("New records must start at revision zero.");
    write(key, JSON.stringify(project));
    return project;
  }
  function lease(id) {
    try {
      const value = JSON.parse(read(`${OWNER_PREFIX}${id}`));
      return value &&
        typeof value.token === "string" &&
        Number.isFinite(value.expiresAt)
        ? value
        : null;
    } catch (error) {
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  }
  function owns(id, token) {
    const value = lease(id);
    return !!value && value.token === token && value.expiresAt > now();
  }
  function acquire(id, token, takeover = false) {
    load(id);
    const owner = lease(id);
    if (!takeover && owner && owner.expiresAt > now() && owner.token !== token)
      return false;
    write(
      `${OWNER_PREFIX}${id}`,
      JSON.stringify({ token, expiresAt: now() + LEASE_MS }),
    );
    return owns(id, token);
  }
  function renew(id, token) {
    if (!owns(id, token)) return false;
    write(
      `${OWNER_PREFIX}${id}`,
      JSON.stringify({ token, expiresAt: now() + LEASE_MS }),
    );
    return true;
  }
  function release(id, token) {
    if (lease(id)?.token === token) removeKey(`${OWNER_PREFIX}${id}`);
  }
  function check(id, expectedRevision, token) {
    if (!owns(id, token))
      throw new StorageConflictError(
        "Another tab owns this project, or your editing lease expired. Download unsaved JSON, then reload or take over editing.",
      );
    const current = load(id);
    if (current.revision !== expectedRevision)
      throw new StorageConflictError(
        "The saved revision changed. Download unsaved JSON and reload before editing.",
      );
    return current;
  }
  function save(project, { expectedRevision, token }) {
    validateProject(project);
    if (project.revision !== expectedRevision) {
      throw new StorageConflictError(
        "The in-memory revision does not match the expected saved revision.",
      );
    }
    check(project.projectId, expectedRevision, token);
    const next = validateProject({
      ...project,
      revision: expectedRevision + 1,
      updatedAt: new Date(now()).toISOString(),
    });
    // Best effort: localStorage has no atomic cross-tab compare-and-swap.
    check(project.projectId, expectedRevision, token);
    write(projectKey(project.projectId), JSON.stringify(next));
    return next;
  }
  function remove(id, options) {
    const current = check(id, options.expectedRevision, options.token);
    if (current.status !== "trashed")
      throw new Error(
        "Move the project to Trash before deleting it permanently.",
      );
    removeKey(projectKey(id));
    try {
      removeKey(`${WORKSPACE_PREFIX}${id}`);
      release(id, options.token);
    } catch {
      /* Auxiliary keys never restore deleted content. */
    }
  }
  function raw(key) {
    if (!key.startsWith(PROJECT_PREFIX))
      throw new Error("Not a project record.");
    return read(key);
  }
  function discardDamaged(key, expectedRaw) {
    if (raw(key) !== expectedRaw)
      throw new StorageConflictError(
        "Stored data changed. Refresh before deleting.",
      );
    let valid = false;
    try {
      decode(expectedRaw, key.slice(PROJECT_PREFIX.length));
      valid = true;
    } catch {
      /* Only invalid data is eligible here. */
    }
    if (valid)
      throw new Error("This record is valid. Use the normal Trash workflow.");
    removeKey(key);
  }
  function rollbackCreated(project) {
    const key = projectKey(project.projectId);
    if (read(key) !== JSON.stringify(project))
      throw new Error(
        "A newly restored project changed and cannot be rolled back safely.",
      );
    removeKey(key);
  }
  function preferences() {
    try {
      const p = JSON.parse(read(PREFERENCES_KEY));
      return {
        view: p?.view === "list" ? "list" : "grid",
        sort: ["updated", "name", "created"].includes(p?.sort)
          ? p.sort
          : "updated",
      };
    } catch {
      return { view: "grid", sort: "updated" };
    }
  }
  function savePreferences(p) {
    write(
      PREFERENCES_KEY,
      JSON.stringify({
        view: p.view === "list" ? "list" : "grid",
        sort: ["updated", "name", "created"].includes(p.sort)
          ? p.sort
          : "updated",
      }),
    );
  }
  function workspace(id) {
    try {
      const value = JSON.parse(read(`${WORKSPACE_PREFIX}${id}`));
      return normalizeWorkspace(value);
    } catch {
      return normalizeWorkspace({});
    }
  }
  function saveWorkspace(id, value) {
    projectKey(id);
    write(
      `${WORKSPACE_PREFIX}${id}`,
      JSON.stringify(normalizeWorkspace(value)),
    );
  }
  function palettePreferences() {
    try {
      const value = JSON.parse(read(PALETTE_KEY));
      return {
        favorites: safeIds(value?.favorites),
        recent: safeIds(value?.recent).slice(0, 8),
      };
    } catch {
      return { favorites: [], recent: [] };
    }
  }
  function savePalettePreferences(value) {
    write(
      PALETTE_KEY,
      JSON.stringify({
        favorites: safeIds(value.favorites),
        recent: safeIds(value.recent).slice(0, 8),
      }),
    );
  }
  return {
    palettePreferences,
    savePalettePreferences,
    list,
    load,
    create,
    save,
    remove,
    raw,
    discardDamaged,
    acquire,
    renew,
    release,
    owns,
    rollbackCreated,
    preferences,
    savePreferences,
    workspace,
    saveWorkspace,
  };
}

function safeIds(value) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id) =>
              typeof id === "string" &&
              /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id),
          ),
        ),
      ].slice(0, 10000)
    : [];
}
function normalizeWorkspace(value) {
  const number = (v, min, max, fallback) =>
    Number.isFinite(v) && v >= min && v <= max ? v : fallback;
  return {
    viewport: number(value?.viewport, 240, 3840, 1280),
    zoom: number(value?.zoom, 0.5, 2, 1),
    scrollTop: number(value?.scrollTop, 0, 1000000, 0),
    scrollLeft: number(value?.scrollLeft, 0, 1000000, 0),
    selectedId: safeIds([value?.selectedId])[0] || null,
    selectedIds: safeIds(value?.selectedIds || [value?.selectedId]),
    expandedIds: safeIds(value?.expandedIds),
    leftOpen: value?.leftOpen !== false,
    rightOpen: value?.rightOpen !== false,
    leftTab: value?.leftTab === "layers" ? "layers" : "palette",
    inspectorTab: [
      "content",
      "layout",
      "style",
      "effects",
      "accessibility",
      "page",
    ].includes(value?.inspectorTab)
      ? value.inspectorTab
      : "page",
    mobilePanel: ["left", "right"].includes(value?.mobilePanel)
      ? value.mobilePanel
      : null,
  };
}

export function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return {
      get length() {
        throw new Error("Storage disabled");
      },
      getItem() {
        throw new Error("Storage disabled");
      },
      setItem() {
        throw new Error("Storage disabled");
      },
      removeItem() {
        throw new Error("Storage disabled");
      },
    };
  }
}
