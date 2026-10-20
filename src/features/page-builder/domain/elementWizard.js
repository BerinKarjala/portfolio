import { defaultProps } from "./components";
import { isContainer } from "./catalog";
import { CATEGORIES, STATES, STYLE_GROUPS } from "./styles";
import { localInstanceCommand } from "./masters";
import { validateProject } from "./project";

const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const appearanceKeys = [
  ...STYLE_GROUPS.Typography,
  ...STYLE_GROUPS.Appearance,
  ...STYLE_GROUPS.Effects,
];
const allStyleKeys = Object.values(STYLE_GROUPS).flat();
const layoutProps = { gallery: ["columns", "aspect", "fit"] };
const appearanceProps = { gallery: ["hover"], table: ["striped"] };
export const WIZARD_STEPS = [
  { id: "content", label: "Content and purpose" },
  { id: "layout", label: "Layout and spacing" },
  { id: "appearance", label: "Appearance" },
  { id: "accessibility", label: "Accessibility and visibility" },
  { id: "review", label: "Review and finish" },
];

export function wizardSteps(element) {
  return WIZARD_STEPS.filter(({ id }) => {
    if (element.instance)
      return ["layout", "accessibility", "review"].includes(id);
    return (
      id !== "content" || Object.keys(defaultProps(element.type)).length > 0
    );
  }).map((step) =>
    element.instance && step.id === "accessibility"
      ? { ...step, label: "Visibility" }
      : step,
  );
}

export function wizardPropKeys(element, step) {
  if (step === "layout") return layoutProps[element.type] || [];
  if (step === "appearance") return appearanceProps[element.type] || [];
  if (step !== "content") return [];
  return Object.keys(defaultProps(element.type)).filter(
    (key) =>
      !(layoutProps[element.type] || []).includes(key) &&
      !(appearanceProps[element.type] || []).includes(key),
  );
}

function keys(value, allowed, label) {
  ensure(
    value &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).every((key) => allowed.includes(key)),
    `Unsupported ${label} change for this wizard step.`,
  );
}

export function validateWizardChanges(element, step, changes) {
  const allowed = {
    content: ["props", ...(element.type === "image" ? ["accessibility"] : [])],
    layout: [
      "styles",
      "geometry",
      "positionMode",
      ...(isContainer(element) ? ["layout", "layoutMode"] : []),
      ...(element.type === "gallery" ? ["props"] : []),
    ],
    appearance: [
      "styles",
      "effects",
      "presetIds",
      "presetVariants",
      ...(appearanceProps[element.type] ? ["props"] : []),
    ],
    accessibility: [
      "visibility",
      ...(!element.instance ? ["accessibility", "name", "htmlId"] : []),
    ],
  };
  ensure(
    allowed[step] && wizardSteps(element).some((s) => s.id === step),
    "This wizard step is not allowed for the element.",
  );
  keys(changes, allowed[step], "element");
  if (changes.props)
    keys(changes.props, wizardPropKeys(element, step), "content");
  if (changes.geometry)
    keys(
      changes.geometry,
      ["x", "y", "width", "height", "zIndex", "aspectLocked"],
      "geometry",
    );
  if (changes.layout)
    keys(
      changes.layout,
      [
        "direction",
        "wrap",
        "align",
        "justify",
        "columns",
        "overflowX",
        "overflowY",
      ],
      "layout",
    );
  if (changes.visibility)
    keys(
      changes.visibility,
      ["globalHidden", "mobile", "tablet", "desktop"],
      "visibility",
    );
  if (changes.accessibility)
    keys(
      changes.accessibility,
      step === "content"
        ? ["decorative"]
        : [
            "label",
            "role",
            ...(["image", "icon"].includes(element.type) ? [] : ["decorative"]),
          ],
      "accessibility",
    );
  for (const kind of ["presetIds", "presetVariants"])
    if (changes[kind]) keys(changes[kind], CATEGORIES, "preset reference");
  if (changes.styles) {
    keys(
      changes.styles,
      ["overrides", ...(step === "appearance" ? ["states"] : [])],
      "style",
    );
    if (changes.styles.overrides)
      keys(
        changes.styles.overrides,
        step === "layout" ? STYLE_GROUPS.Layout : appearanceKeys,
        "style property",
      );
    if (changes.styles.states) {
      keys(changes.styles.states, STATES, "interaction state");
      for (const styles of Object.values(changes.styles.states))
        keys(styles, allStyleKeys, "interaction style");
    }
  }
  if (element.instance) {
    // Ask the existing domain capability predicate, not a separate UI permission list.
    const patch = { ...changes };
    delete patch.positionMode;
    ensure(
      !Object.keys(patch).length ||
        localInstanceCommand(
          { page: { elements: { [element.id]: element } } },
          {
            type: "PATCH",
            ids: [element.id],
            patch,
          },
        ),
      "Linked copies allow local size, placement and visibility overrides only.",
    );
  }
}

const mergeRecord = (original, patch, removeNull = false) => {
  const next = { ...original };
  for (const [key, value] of Object.entries(patch)) {
    if (removeNull && value === null) delete next[key];
    else next[key] = structuredClone(value);
  }
  return next;
};

// Used for temporary field rendering too: validation happens at preview/completion,
// so a rejected value remains available for correction rather than disappearing.
export function mergeWizardChanges(element, changes) {
  const next = structuredClone(element);
  for (const [key, value] of Object.entries(changes)) {
    if (key === "styles") {
      if (value.overrides)
        next.styles.overrides = mergeRecord(
          next.styles.overrides,
          value.overrides,
          true,
        );
      if (value.states)
        for (const [state, styles] of Object.entries(value.states))
          next.styles.states[state] = mergeRecord(
            next.styles.states[state] || {},
            styles,
            true,
          );
    } else if (
      [
        "props",
        "layout",
        "geometry",
        "visibility",
        "effects",
        "accessibility",
        "presetIds",
        "presetVariants",
      ].includes(key)
    )
      next[key] = mergeRecord(
        next[key],
        value,
        ["presetIds", "presetVariants"].includes(key),
      );
    else next[key] = structuredClone(value);
  }
  return next;
}

export function mergeWizardPatch(previous, patch) {
  const next = { ...previous };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ["styles", "states", ...STATES].includes(key)
    )
      next[key] = mergeWizardPatch(previous[key] || {}, value);
    else if (value && typeof value === "object" && !Array.isArray(value))
      next[key] = { ...previous[key], ...structuredClone(value) };
    else next[key] = structuredClone(value);
  }
  return next;
}

export function applyWizardStep(original, command, { blocked, run }) {
  ensure(
    command.projectId === original.projectId,
    "The wizard belongs to a different project.",
  );
  ensure(command.ids?.length === 1, "Configure one element at a time.");
  const id = command.ids[0],
    element = original.page.elements[id];
  ensure(element, "This element no longer exists.");
  ensure(
    !blocked(original, id),
    "A locked element or descendant prevents configuration.",
  );
  ensure(
    same(command.baseline, element),
    "This element changed while the wizard was open. Reload current settings before applying.",
  );
  validateWizardChanges(element, command.step, command.changes);
  let base = original;
  if (
    command.changes.positionMode &&
    command.changes.positionMode !== element.positionMode
  )
    base = run(original, {
      type: "MODE",
      ids: [id],
      mode: command.changes.positionMode,
      placements: command.placements,
    }).project;
  const project = structuredClone(base);
  project.page.elements[id] = mergeWizardChanges(
    base.page.elements[id],
    command.changes,
  );
  validateProject(project);
  return {
    project: same(project, original) ? original : project,
    selection: [id],
  };
}
