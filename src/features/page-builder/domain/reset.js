import { createProject, validateProject } from "./project";

// Retain record identity and its CAS revision; only working website data resets.
export function resetToOrigin(project) {
  const fresh = createProject({
    name: project.name,
    templateId: project.originTemplateId,
  });
  return validateProject({
    ...project,
    page: fresh.page,
    globalStyles: fresh.globalStyles,
    globalEffects: fresh.globalEffects,
    presets: fresh.presets,
    masters: fresh.masters,
  });
}
