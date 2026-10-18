import { ensure, object, text, safeUrl } from "./validation";
import { validateStyles } from "./styles";
import { ICONS } from "./icons";
export const MARKS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "superscript",
  "subscript",
];
export const INLINE_STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "color",
  "backgroundColor",
  "letterSpacing",
];
export const textDocument = (text) => ({
  version: 2,
  nodes: [{ type: "text", text, marks: [], styles: {} }],
});
export const richPlainText = (doc) =>
  doc?.nodes
    .map((n) =>
      n.type === "break" ? "\n" : n.type === "icon" ? "\ufffc" : n.text,
    )
    .join("") || "";
export const nodeLength = (n) =>
  n.type === "break" || n.type === "icon" ? 1 : n.text.length;
export function validateRichText(doc) {
  object(doc, ["version", "nodes"], "Rich text");
  ensure(
    doc.version === 2 && Array.isArray(doc.nodes) && doc.nodes.length <= 2000,
    "Unsupported rich-text structure.",
  );
  let length = 0;
  for (const n of doc.nodes) {
    if (n.type === "break") {
      object(n, ["type"], "Line break");
      continue;
    }
    if (n.type === "icon") {
      object(n, ["type", "iconId", "label", "styles"], "Inline icon");
      ensure(Object.hasOwn(ICONS, n.iconId), "Unknown icon.");
      text(n.label, 100, "icon label");
    } else {
      object(
        n,
        n.type === "link"
          ? ["type", "text", "marks", "styles", "href"]
          : ["type", "text", "marks", "styles"],
        "Text node",
      );
      ensure(["text", "link"].includes(n.type), "Unsupported text node.");
      text(n.text, 20000);
      ensure(
        Array.isArray(n.marks) &&
          new Set(n.marks).size === n.marks.length &&
          n.marks.every((m) => MARKS.includes(m)) &&
          !(n.marks.includes("superscript") && n.marks.includes("subscript")),
        "Invalid text marks.",
      );
      if (n.type === "link")
        ensure(safeUrl(n.href, { link: true }), "Unsafe rich-text link.");
    }
    object(n.styles, INLINE_STYLES, "Inline styles");
    validateStyles(n.styles);
    length += nodeLength(n);
  }
  ensure(length <= 20000, "Rich text is too long.");
  return doc;
}
export function migrateDocument(doc) {
  if (doc?.version !== 1) return validateRichText(doc);
  object(doc, ["version", "nodes"], "Legacy text");
  ensure(Array.isArray(doc.nodes), "Invalid legacy text.");
  return validateRichText({
    version: 2,
    nodes: doc.nodes.map((n) => {
      object(n, ["type", "text"], "Legacy text node");
      ensure(n.type === "text", "Unsupported legacy text.");
      return { type: "text", text: n.text, marks: [], styles: {} };
    }),
  });
}
function slice(doc, start, end) {
  let offset = 0;
  return doc.nodes.flatMap((n) => {
    const length = nodeLength(n),
      from = Math.max(0, start - offset),
      to = Math.min(length, end - offset);
    offset += length;
    if (to <= from) return [];
    return [
      {
        ...structuredClone(n),
        ...(["text", "link"].includes(n.type)
          ? { text: n.text.slice(from, to) }
          : {}),
      },
    ];
  });
}
function compact(nodes) {
  return nodes.reduce((out, n) => {
    if (["text", "link"].includes(n.type) && !n.text) return out;
    const last = out.at(-1);
    if (
      last &&
      ["text", "link"].includes(n.type) &&
      JSON.stringify({ ...last, text: "" }) ===
        JSON.stringify({ ...n, text: "" })
    )
      last.text += n.text;
    else out.push(n);
    return out;
  }, []);
}
function bounds(doc, start, end) {
  validateRichText(doc);
  const len = richPlainText(doc).length;
  ensure(
    Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end >= start &&
      end <= len,
    "Invalid text selection.",
  );
  return len;
}
export function replaceRange(doc, start, end, value) {
  const len = bounds(doc, start, end);
  text(value, 20000);
  const near = slice(doc, Math.max(0, start - 1), Math.max(start, 1))[0];
  const template =
    near && ["text", "link"].includes(near.type)
      ? near
      : { type: "text", marks: [], styles: {} };
  const inserts = value
    .split("\n")
    .flatMap((text, i) => [
      ...(i ? [{ type: "break" }] : []),
      { ...structuredClone(template), text },
    ]);
  return validateRichText({
    version: 2,
    nodes: compact([
      ...slice(doc, 0, start),
      ...inserts,
      ...slice(doc, end, len),
    ]),
  });
}
export function formatRange(doc, start, end, format) {
  const len = bounds(doc, start, end);
  if (start === end) return doc;
  object(format, ["mark", "styles", "href"], "Formatting");
  if (format.mark) ensure(MARKS.includes(format.mark), "Unknown text mark.");
  if (format.styles) {
    object(format.styles, INLINE_STYLES, "Inline styles");
    validateStyles(format.styles);
  }
  if (format.href)
    ensure(safeUrl(format.href, { link: true }), "Unsafe rich-text link.");
  const selected = slice(doc, start, end);
  const remove =
    format.mark &&
    selected.filter((n) => n.marks).every((n) => n.marks.includes(format.mark));
  const nodes = selected.map((n) => {
    if (n.type === "break") return n;
    const copy = structuredClone(n);
    if (copy.marks && format.mark) {
      copy.marks = copy.marks.filter(
        (m) =>
          m !== format.mark &&
          !(format.mark === "superscript" && m === "subscript") &&
          !(format.mark === "subscript" && m === "superscript"),
      );
      if (!remove) copy.marks.push(format.mark);
    }
    if (format.styles) copy.styles = { ...copy.styles, ...format.styles };
    if (Object.hasOwn(format, "href") && ["text", "link"].includes(copy.type)) {
      copy.type = format.href ? "link" : "text";
      if (format.href) copy.href = format.href;
      else delete copy.href;
    }
    return copy;
  });
  return validateRichText({
    version: 2,
    nodes: compact([
      ...slice(doc, 0, start),
      ...nodes,
      ...slice(doc, end, len),
    ]),
  });
}
export function insertInlineIcon(doc, start, end, iconId, label = "") {
  const len = bounds(doc, start, end);
  return validateRichText({
    version: 2,
    nodes: [
      ...slice(doc, 0, start),
      { type: "icon", iconId, label, styles: {} },
      ...slice(doc, end, len),
    ],
  });
}
export function remapRichLinks(doc, anchors) {
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.type === "link" && n.href.startsWith("#") && anchors[n.href.slice(1)]
        ? { ...n, href: "#" + anchors[n.href.slice(1)] }
        : n,
    ),
  };
}
