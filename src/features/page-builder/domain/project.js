import { TEMPLATES } from "./templates";

/**
 * @typedef {Object} Project
 * @property {1} schemaVersion
 * @property {string} projectId Stable browser record identity, independent of its name.
 * @property {string} name
 * @property {number} revision Incremented only by the storage repository.
 * @property {"active"|"trashed"} status
 * @property {boolean} favorite
 * @property {{metadata: Object, rootElementIds: string[], elements: Object<string, Object>}} page
 * @property {Object} masters Reserved for the M3 schema extension; empty in M1.
 * @property {Object} presets Reserved for the M3 schema extension; empty in M1.
 */

export const SCHEMA_VERSION = 1;
export const MAX_JSON_BYTES = 4 * 1024 * 1024;
export const newId = () => crypto.randomUUID();
export const documentText = (text) => ({
  version: 1,
  nodes: [{ type: "text", text }],
});
export const plainText = (element) =>
  element.props.document?.nodes.map((node) => node.text).join("") ||
  element.props.text ||
  "";
export const byteSize = (text) => new TextEncoder().encode(text).length;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function object(value, keys, label) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype,
    `${label} must be an object.`,
  );
  assert(
    Object.keys(value).every((key) => keys.includes(key)),
    `${label} contains unsupported fields.`,
  );
}
function text(value, max, label, allowEmpty = true) {
  assert(
    typeof value === "string" &&
      value.length <= max &&
      (allowEmpty || value.trim().length > 0),
    `${label} must contain ${allowEmpty ? "at most" : "1–"} ${max} characters.`,
  );
}
function identifier(value) {
  return (
    typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)
  );
}
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

export function safeUrl(value, { link = false, empty = false } = {}) {
  if (empty && value === "") return true;
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\u0000-\u0020\u007f<>"'\\]/.test(value)
  )
    return false;
  if (link && /^#[A-Za-z][\w:.-]*$/.test(value)) return true;
  if (link && /^mailto:[^@?]+@[^@?]+\.[^@?]+$/.test(value)) return true;
  if (link && /^tel:\+?[\d()-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateStyles(styles) {
  object(
    styles,
    [
      "color",
      "backgroundColor",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "padding",
      "gap",
      "borderRadius",
      "maxWidth",
      "textAlign",
      "minHeight",
    ],
    "Styles",
  );
  for (const [key, value] of Object.entries(styles)) {
    let valid = false;
    if (["color", "backgroundColor"].includes(key))
      valid =
        typeof value === "string" && /^#[\da-f]{6}([\da-f]{2})?$/i.test(value);
    else if (key === "fontFamily")
      valid = ["system-ui", "serif", "sans-serif", "monospace"].includes(value);
    else if (key === "fontWeight")
      valid = [400, 500, 600, 700, 800].includes(value);
    else if (key === "lineHeight")
      valid = typeof value === "number" && value >= 1 && value <= 3;
    else if (key === "textAlign")
      valid = ["left", "center", "right"].includes(value);
    else
      valid =
        typeof value === "string" &&
        /^(?:0|(?:\d{1,3}(?:\.\d{1,2})?)(?:px|rem|em|%))$/.test(value);
    assert(valid, `Unsupported or unsafe style: ${key}.`);
  }
  return styles;
}

function validateDocument(doc) {
  object(doc, ["version", "nodes"], "Rich text");
  assert(
    doc.version === 1 && Array.isArray(doc.nodes) && doc.nodes.length <= 1000,
    "Unsupported rich-text structure.",
  );
  doc.nodes.forEach((node) => {
    object(node, ["type", "text"], "Text node");
    assert(node.type === "text", "Unsupported rich-text node.");
    text(node.text, 10000, "Text");
  });
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
  object(project.masters, [], "Masters (added in M3)");
  object(project.presets, [], "Presets (added in M3)");
  validateStyles(project.globalStyles);
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
      ],
      "Element",
    );
    assert(
      e.id === id && e.parentId === parentId,
      "Element ID or parent reference is inconsistent.",
    );
    assert(
      [
        "container",
        "heading",
        "paragraph",
        "link",
        "divider",
        "image",
        "nav",
        "list",
        "listItem",
      ].includes(e.type),
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
      ["flex", "grid"].includes(e.layoutMode) && e.positionMode === "flow",
      "Unsupported layout mode in this milestone.",
    );
    object(e.styles, ["overrides"], "Element styles");
    validateStyles(e.styles.overrides);
    object(e.presetIds, [], "Preset references");
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
    const props = {
      container: [],
      nav: [],
      heading: ["level", "document"],
      paragraph: ["document"],
      link: ["text", "href"],
      divider: [],
      image: ["src", "alt"],
      list: ["ordered"],
      listItem: ["document"],
    };
    object(e.props, props[e.type], "Component properties");
    if (["heading", "paragraph", "listItem"].includes(e.type))
      validateDocument(e.props.document);
    if (e.type === "heading")
      assert(
        [1, 2, 3, 4, 5, 6].includes(e.props.level),
        "Invalid heading level.",
      );
    if (e.type === "link") {
      text(e.props.text, 1000, "Link text", false);
      assert(safeUrl(e.props.href, { link: true }), "Unsafe link URL.");
    }
    if (e.type === "image") {
      text(e.props.alt, 1000, "Image alt text");
      assert(safeUrl(e.props.src), "Unsafe media URL.");
    }
    if (e.type === "list")
      assert(typeof e.props.ordered === "boolean", "Invalid list type.");
    const container = ["container", "nav", "list"].includes(e.type);
    assert(
      container || e.children.length === 0,
      "Illegal nesting inside a leaf component.",
    );
    for (const child of e.children) {
      assert(
        elements[child] &&
          (e.type !== "list" || elements[child].type === "listItem") &&
          (e.type !== "nav" || elements[child].type === "link") &&
          (e.type === "list" || elements[child].type !== "listItem"),
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
  return project;
}

export function migrateProject(input) {
  guard(input);
  if (input?.schemaVersion === 0) {
    // Only the documented, unreleased v0 development fixture is supported.
    const migrated = {
      ...structuredClone(input),
      schemaVersion: 1,
      status: input.status ?? "active",
      favorite: input.favorite ?? false,
      revision: input.revision ?? 0,
    };
    return validateProject(migrated);
  }
  return validateProject(input);
}

export function createProject({
  name = "Untitled project",
  templateId = "blank",
} = {}) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  assert(template, "Unknown template.");
  const timestamp = new Date().toISOString();
  const project = {
    schemaVersion: 1,
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
      props,
      styles: { overrides },
      presetIds: {},
      visibility: {
        globalHidden: false,
        mobile: true,
        tablet: true,
        desktop: true,
      },
      locked: false,
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
      e.children = e.children.map((id) => map[id]);
      return [e.id, e];
    }),
  );
  return validateProject(result);
}
