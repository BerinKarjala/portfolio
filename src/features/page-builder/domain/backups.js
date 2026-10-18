import {
  byteSize,
  duplicateProject,
  migrateProject,
  validateProject,
} from "./project";

export const MAX_BACKUP_BYTES = 16 * 1024 * 1024;

export function createBackup(
  projects,
  { includeTrash = false, single = false } = {},
) {
  const selected = projects.filter(
    (p) => includeTrash || p.status === "active",
  );
  selected.forEach(validateProject);
  if (single && selected.length !== 1)
    throw new Error("Select one project to export.");
  const raw = JSON.stringify(
    single
      ? { kind: "page-builder-project", formatVersion: 1, project: selected[0] }
      : {
          kind: "page-builder-collection",
          formatVersion: 1,
          projects: selected,
        },
    null,
    2,
  );
  if (byteSize(raw) > MAX_BACKUP_BYTES)
    throw new Error(
      "This backup exceeds 16 MiB. Export selected projects in smaller groups.",
    );
  return raw;
}

export function inspectBackup(raw, existing) {
  if (typeof raw !== "string" || byteSize(raw) > MAX_BACKUP_BYTES)
    throw new Error("Choose a JSON file no larger than 16 MiB.");
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error(
      "This file is not valid JSON. The saved projects have not changed.",
    );
  }
  let projects;
  if (input?.schemaVersion !== undefined) projects = [input];
  else {
    if (input?.formatVersion !== 1)
      throw new Error(
        "Unsupported backup version. Keep the original file for a compatible version.",
      );
    const allowed =
      input?.kind === "page-builder-project"
        ? ["kind", "formatVersion", "project"]
        : ["kind", "formatVersion", "projects"];
    if (!input || Object.keys(input).some((key) => !allowed.includes(key)))
      throw new Error("Unsupported backup fields.");
    if (input.kind === "page-builder-project") projects = [input.project];
    else if (
      input.kind === "page-builder-collection" &&
      Array.isArray(input.projects)
    )
      projects = input.projects;
    else throw new Error("Unsupported backup format.");
  }
  const entries = projects.map((value, index) => {
    try {
      const project = migrateProject(value);
      const sameId = existing.find((p) => p.projectId === project.projectId);
      const sameName = existing.find(
        (p) => p.name.toLowerCase() === project.name.toLowerCase(),
      );
      return {
        index,
        project,
        duplicate: !!(sameId || sameName),
        comparison: sameId
          ? JSON.stringify(sameId) === JSON.stringify(project)
            ? "Identical saved record"
            : "Same ID, different content or revision"
          : sameName
            ? "Same project name"
            : "New project",
        error: null,
      };
    } catch (error) {
      return {
        index,
        project: null,
        duplicate: false,
        comparison: "Invalid project",
        error: error.message,
      };
    }
  });
  // A single project import should explain its validation failure directly.
  if (entries.length === 1 && entries[0].error)
    throw new Error(entries[0].error);
  return { entries };
}

export function uniqueName(name, projects) {
  let candidate = name;
  let suffix = 2;
  const names = new Set(projects.map((p) => p.name.toLowerCase()));
  while (names.has(candidate.toLowerCase())) {
    const tail = ` (${suffix++})`;
    candidate = name.slice(0, 100 - tail.length) + tail;
  }
  return candidate;
}

export function restoreBackup(repository, entries) {
  const existing = [...repository.list().projects];
  const created = [];
  try {
    for (const entry of entries) {
      if (entry.error || !entry.project)
        throw new Error(
          "An invalid project was selected. Skip invalid entries before restoring.",
        );
      const copy = duplicateProject(
        entry.project,
        uniqueName(entry.project.name, existing),
      );
      copy.status = entry.project.status;
      copy.favorite = entry.project.favorite;
      repository.create(copy);
      created.push(copy);
      existing.push(copy);
    }
    return created;
  } catch (error) {
    const retained = [];
    for (const project of created.reverse()) {
      try {
        repository.rollbackCreated(project);
      } catch {
        retained.push(project.name);
      }
    }
    throw new Error(
      retained.length
        ? `Restore stopped: ${error.message} Could not remove these new copies: ${retained.join(", ")}. Review the dashboard.`
        : `Restore failed; newly added records were rolled back. ${error.message}`,
    );
  }
}
