import { TEMPLATES } from "./templates";
import {
  ensure as assert,
  object,
  text,
  identifier,
  safeUrl,
} from "./validation";
import {
  validateStyles,
  validatePresets,
  validateEffects,
  defaultEffects,
  CATEGORIES,
  STATES,
} from "./styles";
import { textDocument, richPlainText, migrateDocument } from "./richText";
import { validateProps, defaultProps } from "./components";
import { COMPONENTS, canContain, isContainer } from "./catalog";
import { validateMasterLinks } from "./masters";
import { polishTemplate } from "./templateDesign";
export { safeUrl, validateStyles };

import {
  defaultLayout,
  defaultGeometry,
  validateCanvasElement,
} from "./canvasModel";

/**
 * @typedef {Object} Project
 * @property {3} schemaVersion
 * @property {string} projectId Stable browser record identity, independent of its name.
 * @property {string} name
 * @property {number} revision Incremented only by the storage repository.
 * @property {"active"|"trashed"} status
 * @property {boolean} favorite
 * @property {{metadata: Object, rootElementIds: string[], elements: Object<string, Object>}} page
 * @property {Object} masters Validated project-local definitions.
 * @property {Object} presets Validated project-local definitions.
 */

export const SCHEMA_VERSION = 3;
export const MAX_JSON_BYTES = 4 * 1024 * 1024;
export const newId = () => crypto.randomUUID();
export const documentText = textDocument;
export const plainText = (e) =>
  e.props.document ? richPlainText(e.props.document) : e.props.text || "";
export const byteSize = (text) => new TextEncoder().encode(text).length;

function guard(value, depth = 0, budget = { count: 0 }) {
  assert(
    depth <= 24 && ++budget.count <= 100000,
    "Project data is too complex.",
  );
  if (value && typeof value === "object") {
    assert(
      Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype,
      "Unsupported data object.",
    );
    for (const [key, child] of Object.entries(value)) {
      assert(
        !["__proto__", "constructor", "prototype"].includes(key),
        "Unsafe object key.",
      );
      guard(child, depth + 1, budget);
    }
  } else
    assert(
      value === null ||
        ["string", "boolean"].includes(typeof value) ||
        (typeof value === "number" && Number.isFinite(value)),
      "Invalid JSON value.",
    );
}

/** Validate, without mutating or silently stripping unsupported/executable data.
 * @param {unknown} project
 * @returns {Project}
 * @throws {Error} when structural, semantic, or property-level contracts fail.
 */
export function validateProject(project) {
  guard(project);
  assert(
    byteSize(JSON.stringify(project)) <= MAX_JSON_BYTES,
    "Project exceeds the 4 MiB import limit.",
  );
  object(
    project,
    [
      "schemaVersion",
      "projectId",
      "name",
      "createdAt",
      "updatedAt",
      "revision",
      "originTemplateId",
      "status",
      "favorite",
      "page",
      "masters",
      "presets",
      "globalStyles",
      "globalEffects",
      "assets",
    ],
    "Project",
  );
  assert(
    project.schemaVersion === SCHEMA_VERSION,
    "Unsupported project schema version. Keep the original file for a compatible version.",
  );
  assert(identifier(project.projectId), "Invalid project ID.");
  text(project.name, 100, "Project name", false);
  for (const key of ["createdAt", "updatedAt"])
    assert(
      typeof project[key] === "string" &&
        /^\d{4}-\d\d-\d\dT/.test(project[key]) &&
        Number.isFinite(Date.parse(project[key])),
      `Invalid ${key}.`,
    );
  assert(
    Number.isSafeInteger(project.revision) && project.revision >= 0,
    "Invalid project revision.",
  );
  assert(
    TEMPLATES.some((t) => t.id === project.originTemplateId),
    "Unknown template.",
  );
  assert(
    ["active", "trashed"].includes(project.status) &&
      typeof project.favorite === "boolean",
    "Invalid project status or favorite.",
  );
  validatePresets(project.presets);
  object(project.masters, Object.keys(project.masters || {}), "Masters");
  validateStyles(project.globalStyles);
  validateEffects(project.globalEffects);
  assert(
    project.globalEffects.animation !== "inherit",
    "Global animation cannot inherit itself.",
  );
  object(project.assets, ["externalUrlsOnly"], "Assets");
  assert(
    project.assets.externalUrlsOnly === true,
    "Only external media URLs are supported.",
  );
  object(project.page, ["metadata", "rootElementIds", "elements"], "Page");
  const { metadata, elements, rootElementIds } = project.page;
  object(
    metadata,
    ["title", "description", "lang", "indexable", "faviconUrl"],
    "Metadata",
  );
  text(metadata.title, 200, "Page title", false);
  text(metadata.description, 1000, "Description");
  assert(
    typeof metadata.lang === "string" &&
      /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(metadata.lang),
    "Invalid page language.",
  );
  assert(
    typeof metadata.indexable === "boolean" &&
      safeUrl(metadata.faviconUrl, { empty: true }),
    "Invalid indexing or favicon setting.",
  );
  assert(
    Array.isArray(rootElementIds) && rootElementIds.every(identifier),
    "Invalid page roots.",
  );
  object(elements, Object.keys(elements || {}), "Elements");
  const seen = new Set();
  const htmlIds = new Set();
  const visit = (id, parentId, depth) => {
    assert(depth <= 4, "Maximum tree depth is four (page root excluded).");
    assert(!seen.has(id), "Tree contains a cycle or repeated element.");
    const e = elements[id];
    assert(e && identifier(id), "Tree has a missing child.");
    seen.add(id);
    object(
      e,
      [
        "id",
        "type",
        "name",
        "htmlId",
        "parentId",
        "children",
        "layoutMode",
        "positionMode",
        "props",
        "styles",
        "presetIds",
        "visibility",
        "locked",
        "layout",
        "geometry",
        "effects",
        "instance",
        "presetVariants",
        "accessibility",
      ],
      "Element",
    );
    assert(
      e.id === id && e.parentId === parentId,
      "Element ID or parent reference is inconsistent.",
    );
    assert(
      COMPONENTS.some((c) => c.type === e.type),
      "Unsupported component type.",
    );
    text(e.name, 100, "Element name", false);
    assert(
      e.htmlId === "" ||
        (typeof e.htmlId === "string" &&
          /^[A-Za-z][\w:.-]{0,99}$/.test(e.htmlId) &&
          !htmlIds.has(e.htmlId)),
      "Duplicate or invalid HTML ID.",
    );
    if (e.htmlId) htmlIds.add(e.htmlId);
    assert(
      Array.isArray(e.children) && e.children.every(identifier),
      "Invalid child references.",
    );
    assert(
      ["flex", "grid"].includes(e.layoutMode) &&
        ["flow", "absolute", "sticky"].includes(e.positionMode),
      "Unsupported layout mode in this milestone.",
    );
    validateCanvasElement(e);
    object(e.styles, ["overrides", "states"], "Element styles");
    validateStyles(e.styles.overrides);
    object(e.styles.states, STATES, "Interaction states");
    Object.values(e.styles.states).forEach((s) => validateStyles(s));
    object(e.presetIds, CATEGORIES, "Preset references");
    object(e.presetVariants, CATEGORIES, "Preset variants");
    for (const category of CATEGORIES) {
      if (e.presetIds[category])
        assert(
          project.presets[e.presetIds[category]]?.category === category,
          "Unknown preset or category mismatch.",
        );
      if (e.presetVariants[category])
        assert(
          project.presets[e.presetIds[category]]?.variants[
            e.presetVariants[category]
          ],
          "Unknown preset variant.",
        );
    }
    validateEffects(e.effects);
    assert(
      e.instance === null || (e.instance && typeof e.instance === "object"),
      "Invalid linked instance.",
    );
    object(e.accessibility, ["label", "role", "decorative"], "Accessibility");
    text(e.accessibility.label, 200, "accessible label");
    assert(
      ["", "region", "banner", "main", "complementary", "contentinfo"].includes(
        e.accessibility.role,
      ) && typeof e.accessibility.decorative === "boolean",
      "Invalid accessibility settings.",
    );
    assert(
      e.positionMode !== "sticky" ||
        e.type === "container" ||
        e.type === "nav" ||
        e.type === "card",
      "Sticky requires a structured container.",
    );
    object(
      e.visibility,
      ["globalHidden", "mobile", "tablet", "desktop"],
      "Visibility",
    );
    assert(
      ["globalHidden", "mobile", "tablet", "desktop"].every(
        (key) => typeof e.visibility[key] === "boolean",
      ) && typeof e.locked === "boolean",
      "Invalid visibility or lock.",
    );
    validateProps(e.type, e.props);
    assert(
      isContainer(e) || e.children.length === 0,
      "Illegal nesting inside a leaf component.",
    );
    for (const child of e.children) {
      assert(
        elements[child] && canContain(e, elements[child].type),
        "Illegal semantic nesting.",
      );
      visit(child, id, depth + 1);
    }
  };
  rootElementIds.forEach((id) => {
    assert(
      elements[id]?.type !== "listItem",
      "List items require a list parent.",
    );
    visit(id, null, 1);
  });
  assert(
    seen.size === Object.keys(elements).length,
    "Every element must be reachable; orphan elements are invalid.",
  );
  Object.values(elements).forEach((e) =>
    assert(
      !e.geometry.flowParentId || elements[e.geometry.flowParentId],
      "Retained placement has a missing parent reference.",
    ),
  );
  validateMasterLinks(project);
  for (const master of Object.values(project.masters)) {
    assert(
      master.elements[master.rootId]?.instance === null,
      "Master definitions cannot contain instances.",
    );
    validateProject({
      ...project,
      masters: {},
      page: {
        ...project.page,
        rootElementIds: [master.rootId],
        elements: master.elements,
      },
    });
  }
  return project;
}

export function migrateProject(input) {
  guard(input);
  let data = input;
  if (data?.schemaVersion === 0)
    data = {
      ...structuredClone(data),
      schemaVersion: 1,
      status: data.status ?? "active",
      favorite: data.favorite ?? false,
      revision: data.revision ?? 0,
    };
  if (data?.schemaVersion === 1) {
    data = structuredClone(data);
    object(
      data.page?.elements,
      Object.keys(data.page?.elements || {}),
      "Elements",
    );
    for (const e of Object.values(data.page.elements)) {
      object(
        e,
        [
          "id",
          "type",
          "name",
          "htmlId",
          "parentId",
          "children",
          "layoutMode",
          "positionMode",
          "props",
          "styles",
          "presetIds",
          "visibility",
          "locked",
        ],
        "Legacy element",
      );
      assert(e.positionMode === "flow", "Unsupported legacy positioning.");
      e.layout = defaultLayout();
      e.geometry = defaultGeometry(e.parentId);
    }
    data.schemaVersion = 2;
  }
  if (data?.schemaVersion === 2) {
    data = structuredClone(data);
    for (const e of Object.values(data.page?.elements || {})) {
      object(
        e,
        [
          "id",
          "type",
          "name",
          "htmlId",
          "parentId",
          "children",
          "layoutMode",
          "positionMode",
          "props",
          "styles",
          "presetIds",
          "visibility",
          "locked",
          "layout",
          "geometry",
        ],
        "Schema-2 element",
      );
      if (e.props.document)
        e.props.document = migrateDocument(e.props.document);
      if (e.type === "image") e.props = { ...e.props, priority: false };
      if (e.type === "nav")
        e.props = { label: "Navigation", menuLabel: "Menu", ...e.props };
      e.styles.states = {};
      e.presetVariants = {};
      e.effects = defaultEffects();
      e.instance = null;
      e.accessibility = { label: "", role: "", decorative: false };
    }
    data.globalEffects = defaultEffects("none");
    data.schemaVersion = 3;
  }
  return validateProject(data);
}

export function createProject({
  name = "Untitled project",
  templateId = "blank",
} = {}) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  assert(template, "Unknown template.");
  const timestamp = new Date().toISOString();
  const project = {
    schemaVersion: SCHEMA_VERSION,
    projectId: newId(),
    name: name.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 0,
    originTemplateId: templateId,
    status: "active",
    favorite: false,
    page: {
      metadata: {
        title: name.trim(),
        description: "",
        lang: "en",
        indexable: true,
        faviconUrl: "",
      },
      rootElementIds: [],
      elements: {},
    },
    masters: {},
    presets: {},
    globalEffects: defaultEffects("none"),
    globalStyles: {
      backgroundColor: "#ffffff",
      color: "#17251d",
      fontFamily: "system-ui",
    },
    assets: { externalUrlsOnly: true },
  };
  function add(type, props, parent = null, overrides = {}) {
    const id = newId();
    project.page.elements[id] = {
      id,
      type,
      name: type === "container" ? "Section" : type,
      htmlId: "",
      parentId: parent,
      children: [],
      layoutMode: "flex",
      positionMode: "flow",
      props: { ...defaultProps(type), ...props },
      styles: { overrides, states: {} },
      presetVariants: {},
      effects: defaultEffects(),
      instance: null,
      accessibility: { label: "", role: "", decorative: false },
      presetIds: {},
      visibility: {
        globalHidden: false,
        mobile: true,
        tablet: true,
        desktop: true,
      },
      locked: false,
      layout: defaultLayout(),
      geometry: defaultGeometry(parent),
    };
    (parent
      ? project.page.elements[parent].children
      : project.page.rootElementIds
    ).push(id);
    return id;
  }
  template.sections.forEach(([eyebrow, title, body, cta], i) => {
    const root = add("container", {}, null, {
      padding: "3rem",
      gap: "1rem",
      ...(i === 0
        ? {
            backgroundColor: template.accent,
            color: "#ffffff",
            minHeight: "20rem",
          }
        : {}),
    });
    add("paragraph", { document: documentText(eyebrow) }, root, {
      fontSize: "0.75rem",
      fontWeight: 700,
    });
    add(
      "heading",
      { level: i === 0 ? 1 : 2, document: documentText(title) },
      root,
      { fontSize: i === 0 ? "3rem" : "2rem", fontWeight: 700, lineHeight: 1.1 },
    );
    add("paragraph", { document: documentText(body) }, root, {
      lineHeight: 1.6,
    });
    if (cta)
      add(
        "link",
        {
          text: cta,
          href:
            templateId === "contact"
              ? "mailto:hello@example.com"
              : "https://example.com",
        },
        root,
        { fontWeight: 700 },
      );
  });
  polishTemplate(project, template, add);
  return validateProject(project);
}

export function duplicateProject(project, name = `${project.name} copy`) {
  validateProject(project);
  const result = structuredClone(project);
  const map = Object.fromEntries(
    Object.keys(result.page.elements).map((id) => [id, newId()]),
  );
  result.projectId = newId();
  result.name = name;
  result.status = "active";
  result.favorite = false;
  result.revision = 0;
  result.createdAt = result.updatedAt = new Date().toISOString();
  result.page.rootElementIds = result.page.rootElementIds.map((id) => map[id]);
  result.page.elements = Object.fromEntries(
    Object.values(result.page.elements).map((e) => {
      e.id = map[e.id];
      e.parentId = e.parentId ? map[e.parentId] : null;
      e.geometry.flowParentId = map[e.geometry.flowParentId] || null;
      e.children = e.children.map((id) => map[id]);
      if (e.instance) e.instance.rootId = map[e.instance.rootId];
      return [e.id, e];
    }),
  );
  return validateProject(result);
}
