import { beforeEach, describe, expect, it } from "vitest";
import { createProject } from "./project";
import { createRepository, PROJECT_PREFIX } from "./storage";
import { createBackup, inspectBackup, restoreBackup } from "./backups";

class MemoryStorage {
  data = new Map();
  get length() {
    return this.data.size;
  }
  key(i) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(key) {
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}
let storage, repo, now;
beforeEach(() => {
  storage = new MemoryStorage();
  now = 1000;
  repo = createRepository(storage, { now: () => now });
});

describe("isolated project storage (AC-09, AC-10)", () => {
  it("reports denied storage access without manufacturing an empty saved collection", () => {
    const denied = createRepository({
      get length() {
        throw new Error("Denied");
      },
    });
    expect(() => denied.list()).toThrow(/unavailable/i);
  });

  it("requires the in-memory revision to match the expected revision", () => {
    const p = repo.create(createProject({ name: "Snapshot" }));
    repo.acquire(p.projectId, "owner");
    expect(() =>
      repo.save({ ...p, revision: 3 }, { expectedRevision: 0, token: "owner" }),
    ).toThrow(/in-memory revision/i);
    expect(repo.load(p.projectId)).toEqual(p);
  });
  it("isolates corruption, includes Trash, and reconstructs a directory without an index", () => {
    const p = repo.create(createProject({ name: "Healthy" }));
    storage.setItem(`${PROJECT_PREFIX}damaged`, "{bad");
    expect(repo.list().projects.map((v) => v.projectId)).toEqual([p.projectId]);
    expect(repo.list().damaged).toHaveLength(1);
    expect(repo.raw(`${PROJECT_PREFIX}damaged`)).toBe("{bad");
    repo.acquire(p.projectId, "owner");
    repo.save(
      { ...p, status: "trashed" },
      { expectedRevision: 0, token: "owner" },
    );
    expect(repo.list().projects[0].status).toBe("trashed");
  });

  it("rejects stale revisions and an old owner's delayed writes after immediate takeover", () => {
    const p = repo.create(createProject({ name: "Project" }));
    expect(repo.acquire(p.projectId, "tab-a")).toBe(true);
    expect(repo.acquire(p.projectId, "tab-b")).toBe(false);
    expect(repo.acquire(p.projectId, "tab-b", true)).toBe(true);
    expect(() => repo.save(p, { expectedRevision: 0, token: "tab-a" })).toThrow(
      /another tab|ownership/i,
    );
    const next = repo.save(
      { ...p, name: "New" },
      { expectedRevision: 0, token: "tab-b" },
    );
    expect(next.revision).toBe(1);
    expect(() => repo.save(p, { expectedRevision: 0, token: "tab-b" })).toThrow(
      /revision|changed/i,
    );
    expect(repo.load(p.projectId).name).toBe("New");
    repo.release(p.projectId, "tab-a");
    expect(repo.owns(p.projectId, "tab-b")).toBe(true);
  });

  it("expires abandoned leases and preserves another owner's lease on release", () => {
    const p = repo.create(createProject({ name: "Project" }));
    repo.acquire(p.projectId, "old");
    now += 60000;
    expect(repo.acquire(p.projectId, "new")).toBe(true);
    repo.release(p.projectId, "old");
    expect(repo.owns(p.projectId, "new")).toBe(true);
  });

  it("keeps the last good bytes after quota, validation, or migration failure", () => {
    const p = repo.create(createProject({ name: "Last good" }));
    repo.acquire(p.projectId, "owner");
    const key = `${PROJECT_PREFIX}${p.projectId}`;
    const previous = storage.getItem(key);
    const originalSet = storage.setItem.bind(storage);
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() =>
      repo.save(
        { ...p, name: "Unsaved" },
        { expectedRevision: 0, token: "owner" },
      ),
    ).toThrow(/quota|storage/i);
    expect(storage.getItem(key)).toBe(previous);
    storage.setItem = originalSet;
    const old = { ...p, schemaVersion: 0 };
    delete old.status;
    delete old.favorite;
    delete old.revision;
    storage.setItem(key, JSON.stringify(old));
    const oldBytes = storage.getItem(key);
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => repo.load(p.projectId)).toThrow();
    expect(storage.getItem(key)).toBe(oldBytes);
  });

  it("migrates a valid old record with exactly one record replacement", () => {
    const p = createProject({ name: "Legacy" });
    p.schemaVersion = 0;
    delete p.status;
    delete p.favorite;
    delete p.revision;
    storage.setItem(`${PROJECT_PREFIX}${p.projectId}`, JSON.stringify(p));
    const calls = [];
    const original = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      calls.push(key);
      original(key, value);
    };
    expect(repo.load(p.projectId).schemaVersion).toBe(1);
    expect(calls).toEqual([`${PROJECT_PREFIX}${p.projectId}`]);
  });

  it("never overwrites an existing ID and requires Trash before permanent deletion", () => {
    const p = repo.create(createProject({ name: "Keep" }));
    expect(() => repo.create(p)).toThrow(/exists/i);
    repo.acquire(p.projectId, "owner");
    expect(() =>
      repo.remove(p.projectId, { expectedRevision: 0, token: "owner" }),
    ).toThrow(/Trash/i);
    const trashed = repo.save(
      { ...p, status: "trashed" },
      { expectedRevision: 0, token: "owner" },
    );
    repo.remove(p.projectId, {
      expectedRevision: trashed.revision,
      token: "owner",
    });
    expect(repo.list().projects).toEqual([]);
  });
});

describe("portable backups (AC-08, AC-09)", () => {
  it("previews duplicates and restores independent copies with remapped IDs", () => {
    const p = repo.create(
      createProject({ name: "Portfolio", templateId: "portfolio" }),
    );
    const backup = createBackup([p]);
    const preview = inspectBackup(backup, repo.list().projects);
    expect(preview.entries[0].duplicate).toBe(true);
    const result = restoreBackup(repo, preview.entries);
    expect(result).toHaveLength(1);
    expect(result[0].projectId).not.toBe(p.projectId);
    expect(result[0].name).toBe("Portfolio (2)");
    expect(repo.load(p.projectId)).toEqual(p);
  });

  it("excludes Trash by default, supports selected Trash, and rejects invalid/future input", () => {
    const p = createProject({ name: "Trashed" });
    p.status = "trashed";
    expect(inspectBackup(createBackup([p]), []).entries).toHaveLength(0);
    expect(
      inspectBackup(createBackup([p], { includeTrash: true }), []).entries,
    ).toHaveLength(1);
    expect(() =>
      inspectBackup(
        '{"kind":"page-builder-collection","formatVersion":99,"projects":[]}',
        [],
      ),
    ).toThrow();
    expect(() => inspectBackup('{"name":"bad"}', [])).toThrow();
  });

  it("rolls back newly added projects if a collection restore fails", () => {
    const entries = inspectBackup(
      createBackup([
        createProject({ name: "A" }),
        createProject({ name: "B" }),
      ]),
      [],
    ).entries;
    const originalSet = storage.setItem.bind(storage);
    let writes = 0;
    storage.setItem = (key, value) => {
      if (key.startsWith(PROJECT_PREFIX) && ++writes === 2)
        throw new Error("QuotaExceededError");
      originalSet(key, value);
    };
    expect(() => restoreBackup(repo, entries)).toThrow(/rolled back/i);
    expect(repo.list().projects).toHaveLength(0);
  });
});
