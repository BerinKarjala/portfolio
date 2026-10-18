// Only compiler-owned tags and attributes enter this AST. Author text is always escaped.
export const node = (tag, attrs = {}, children = []) => ({
  tag,
  attrs,
  children: [children]
    .flat(Infinity)
    .filter((v) => v !== null && v !== undefined),
});
export const escapeText = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const voidTags = new Set(["meta", "link", "img", "hr", "br", "input", "track"]);
export function serialize(n, depth = 0) {
  if (typeof n === "string" || typeof n === "number") return escapeText(n);
  const attrs = Object.entries(n.attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeText(v)}"`))
    .join("");
  const open = `<${n.tag}${attrs}>`;
  if (voidTags.has(n.tag)) return open;
  const inline = [
    "span",
    "a",
    "strong",
    "em",
    "u",
    "s",
    "sup",
    "sub",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "label",
    "legend",
    "summary",
    "option",
    "title",
    "th",
    "td",
    "figcaption",
    "caption",
    "svg",
    "path",
  ].includes(n.tag);
  const contents = n.children.map((c) => serialize(c, depth + 1));
  if (inline || !contents.length)
    return `${open}${contents.join("")}</${n.tag}>`;
  const pad = "  ".repeat(depth + 1);
  return `${open}\n${pad}${contents.join("\n" + pad)}\n${"  ".repeat(depth)}</${n.tag}>`;
}
