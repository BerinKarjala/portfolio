import { cssDeclarations, ownStyles, STATES } from "../domain/styles";
import { isContainer } from "../domain/catalog";
import { ICONS } from "../domain/icons";
import { node as n, serialize } from "./html";
import { preflight, visibleElements } from "./preflight";

const FRAMES = {
  fade: "from { opacity: 0; } to { opacity: 1; }",
  slide:
    "from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); }",
  zoom: "from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); }",
  rotate: "from { transform: rotate(-8deg); } to { transform: rotate(0); }",
  pulse: "0%,100% { transform: scale(1); } 50% { transform: scale(1.04); }",
  bounce:
    "0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); }",
};
const BASE = `/* Native elements and shared layout */
* { box-sizing: border-box; }
html { color-scheme: light; }
body { margin: 0; font: 16px/1.5 system-ui, sans-serif; }
.pb-page { position: relative; min-height: 100vh; isolation: isolate; }
.pb-node { min-width: 0; min-height: 28px; overflow-wrap: anywhere; }
h1,h2,h3,h4,h5,h6,p { margin: 0; font-size: inherit; font-weight: inherit; line-height: inherit; letter-spacing: inherit; }
p { white-space: pre-wrap; }
a { color: inherit; text-decoration: underline; }
img { display: block; max-width: 100%; height: auto; }
hr { border: 0; border-top: 1px solid currentColor; margin: 12px 0; }
.pb-container { display: flex; flex-direction: column; }
.pb-flow { position: relative; flex: 1; min-width: 0; }
.pb-card { border: 1px solid #afc0b4; border-radius: .7rem; padding: 1.5rem; background: #fff; }
.pb-button { display: inline-block; background: #173f33; color: #fff; padding: .7em 1.2em; border-radius: .4em; font-weight: 600; text-decoration: none; }
.pb-image { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: linear-gradient(140deg,#e6efe9,#b5c4ba); }
.pb-icon { display: inline-block; width: 1em; height: 1em; vertical-align: -.125em; }
.pb-nav summary { cursor: pointer; border: 1px solid currentColor; padding: .5em 1em; border-radius: .3em; width: fit-content; }
.pb-nav details[open] > summary { margin-bottom: 1rem; }
.pb-nav details { flex: 1; min-width: 0; }
@media (min-width: 768px) {
  .pb-nav summary { display: none; }
  .pb-nav details::details-content { content-visibility: visible; display: block; }
  .pb-nav details:not([open]) > .pb-flow { display: flex; }
}
.pb-form { display: flex; flex-direction: column; gap: .9rem; }
.pb-form label { display: flex; flex-direction: column; gap: .4rem; }
.pb-form input,.pb-form textarea,.pb-form select { width: 100%; font: inherit; color: #213b2d; background: #ffffffdd; border: 1px solid #94a49b; border-radius: .35rem; padding: .7rem; }
.pb-form input[type=checkbox],.pb-form input[type=radio] { width: auto; }
.pb-form button { align-self: flex-start; font: inherit; border: 0; cursor: pointer; background: #173f33; color: #fff; padding: .8rem 1.2rem; border-radius: .4rem; }
.pb-internal-table-scroll { overflow-x: auto; width: 100%; }
.pb-table table { border-collapse: collapse; width: 100%; min-width: 280px; }
.pb-table th,.pb-table td { border-bottom: 1px solid #9aa79e; padding: .7em 1em; text-align: left; }
.pb-table th { font-weight: 700; background: #b5c4ba44; }
.pb-table table[data-striped=true] tbody tr:nth-child(even) { background: #b5c4ba22; }
.pb-table caption { text-align: left; padding-bottom: .7em; font-weight: 600; }
.pb-gallery { display: grid; gap: 1rem; }
.pb-gallery figure { margin: 0; overflow: hidden; min-width: 0; }
.pb-gallery img { width: 100%; transition: transform .25s, opacity .25s; }
.pb-gallery[data-hover=zoom] figure:hover img { transform: scale(1.035); }
.pb-gallery[data-hover=fade] figure:hover img { opacity: .75; }
.pb-gallery figcaption { margin-top: .7em; font-size: .85em; }
video,audio { max-width: 100%; }
.pb-embed { width: 100%; aspect-ratio: 16 / 9; border: 0; }
:focus-visible { outline: 3px solid #337dcc; outline-offset: 2px; }
`;
const formatStyles = (styles) =>
  cssDeclarations(
    Object.fromEntries(
      Object.entries(styles).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
const formatBody = (body) =>
  (body.match(/(?:[^;"']|"[^"]*"|'[^']*')+/g) || [])
    .map((d) => "  " + d.replace(":", ": ") + ";")
    .join("\n");
export const exportSlug = (name) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "") || "page-builder";

/** Pure compiler: validated materialized instances and preset graphs -> HTML AST + CSS. */
export function compileProject(project, { observedFailures = [] } = {}) {
  const result = preflight(project, observedFailures);
  const empty = { ...result, html: "", css: "", document: null, classes: {} };
  if (result.errors.length) return empty;
  try {
    const elements = visibleElements(project),
      classes = Object.fromEntries(
        elements.map((e) => [e.id, `pb-${e.type}-${e.id}`]),
      );
    const rules = new Map(),
      responsive = [],
      fonts = new Set(),
      animations = new Set();
    const add = (selector, styles) => {
      const body = typeof styles === "string" ? styles : formatStyles(styles);
      if (!body) return;
      if (!rules.has(body)) rules.set(body, []);
      rules.get(body).push(selector);
      if (
        styles.fontFamily &&
        ["Inter", "DM Sans", "Lora", "Space Grotesk"].includes(
          styles.fontFamily,
        )
      )
        fonts.add(styles.fontFamily);
    };
    const inlineStyles = (styles) => {
      const body = formatStyles(styles);
      if (!body) return "";
      const key = "pb-inline-" + (inlineStyles.cache.size + 1);
      if (inlineStyles.cache.has(body)) return inlineStyles.cache.get(body);
      inlineStyles.cache.set(body, key);
      add("." + key, styles);
      return key;
    };
    inlineStyles.cache = new Map();
    const icon = (id, label = "", decorative = false, styles = {}) =>
      n(
        "svg",
        {
          class: ["pb-icon", inlineStyles(styles)].filter(Boolean).join(" "),
          viewBox: "0 0 24 24",
          width: "1em",
          height: "1em",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "1.7",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          role: decorative ? "presentation" : "img",
          "aria-hidden": decorative ? "true" : undefined,
          "aria-label": decorative ? undefined : label,
        },
        n("path", { d: ICONS[id] }),
      );
    const rich = (doc) =>
      doc.nodes.map((item) => {
        if (item.type === "break") return n("br");
        if (item.type === "icon")
          return icon(item.iconId, item.label, !item.label, item.styles);
        let child = item.text;
        const tags = {
          bold: "strong",
          italic: "em",
          underline: "u",
          strike: "s",
          superscript: "sup",
          subscript: "sub",
        };
        for (const mark of item.marks) child = n(tags[mark], {}, child);
        return n(
          item.type === "link" ? "a" : "span",
          {
            class: inlineStyles(item.styles) || undefined,
            ...(item.type === "link"
              ? {
                  href: item.href,
                  rel: item.href.startsWith("https:")
                    ? "noopener noreferrer"
                    : undefined,
                }
              : {}),
          },
          child,
        );
      });
    add(".pb-page", project.globalStyles);
    for (const e of elements) {
      const selector = "." + classes[e.id],
        s = ownStyles(project, e.id),
        g = e.geometry;
      const structural = {
        position: e.positionMode === "flow" ? "relative" : e.positionMode,
        zIndex: g.zIndex,
        overflowX: e.layout.overflowX,
        overflowY: e.layout.overflowY,
      };
      // Structural declarations follow visual styles, matching the editor's placement rules.
      add(
        selector,
        formatStyles(s) +
          ";" +
          Object.entries(structural)
            .map(
              ([k, v]) =>
                `${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${v}`,
            )
            .join(";") +
          (e.positionMode === "absolute"
            ? `;left:${g.x}%;top:${g.y}%;width:${g.width}%;height:${g.height}%;min-height:0`
            : ""),
      );
      if (
        s.fontFamily &&
        ["Inter", "DM Sans", "Lora", "Space Grotesk"].includes(s.fontFamily)
      )
        fonts.add(s.fontFamily);
      for (const state of STATES) {
        const stateStyles = ownStyles(project, e.id, state);
        add(
          selector + ":" + state,
          Object.fromEntries(
            Object.entries(stateStyles).filter(([k, v]) => s[k] !== v),
          ),
        );
      }
      const effect =
        e.effects.animation === "inherit" ? project.globalEffects : e.effects;
      if (effect.animation !== "none") {
        animations.add(effect.animation);
        add(
          selector + (effect.trigger === "load" ? "" : ":" + effect.trigger),
          `animation:pb-${effect.animation} ${effect.duration}s ease ${effect.delay}s ${effect.iterations} ${effect.direction} both`,
        );
      }
      if (isContainer(e)) {
        const childSelector =
          selector +
          (e.type === "nav"
            ? " > details > .pb-flow"
            : e.type === "list"
              ? ""
              : " > .pb-flow");
        const l = e.layout,
          grid = e.layoutMode === "grid";
        add(
          childSelector,
          `display:${grid ? "grid" : "flex"};flex-direction:${l.direction};flex-wrap:${l.wrap ? "wrap" : "nowrap"};align-items:${l.align};justify-content:${l.justify};gap:${s.gap || "0"};${grid ? `grid-template-columns:repeat(${l.columns},minmax(0,1fr));` : ""}${!e.children.some((id) => project.page.elements[id].positionMode === "flow") ? "min-height:6rem;" : ""}`,
        );
        if (e.type === "nav")
          responsive.push(
            `@media (min-width: 768px) { ${selector} > details:not([open]) > .pb-flow { display: ${grid ? "grid" : "flex"}; } }`,
          );
        if (grid)
          for (const [query, cols] of [
            ["max-width: 599px", 1],
            ["min-width: 600px) and (max-width: 1023px", 2],
          ])
            responsive.push(
              `@media (${query}) { ${childSelector} { grid-template-columns: repeat(${Math.min(l.columns, cols)},minmax(0,1fr)); } }`,
            );
      }
      for (const [key, query] of [
        ["mobile", "max-width: 599px"],
        ["tablet", "min-width: 600px) and (max-width: 1023px"],
        ["desktop", "min-width: 1024px"],
      ])
        if (!e.visibility[key])
          responsive.push(
            `@media (${query}) { ${selector} { display: none !important; } }`,
          );
    }
    function render(id) {
      const e = project.page.elements[id];
      if (!classes[id]) return null;
      const p = e.props;
      const attrs = {
        class: [
          "pb-node",
          classes[id],
          isContainer(e) && e.type !== "container" && "pb-container",
          "pb-" + e.type,
        ]
          .filter(Boolean)
          .join(" "),
        id: e.htmlId || undefined,
        role: e.accessibility.role || undefined,
        "aria-label": e.accessibility.label || undefined,
      };
      const children = e.children.map(render);
      if (isContainer(e)) {
        if (e.type === "list")
          return n(p.ordered ? "ol" : "ul", attrs, children);
        const flow = n("div", { class: "pb-flow" }, children);
        if (e.type === "nav")
          return n(
            "nav",
            { ...attrs, "aria-label": e.accessibility.label || p.label },
            n("details", { open: true }, [n("summary", {}, p.menuLabel), flow]),
          );
        return n(e.type === "card" ? "article" : "section", attrs, flow);
      }
      if (e.type === "heading")
        return n("h" + p.level, attrs, rich(p.document));
      if (e.type === "paragraph") return n("p", attrs, rich(p.document));
      if (e.type === "listItem") return n("li", attrs, rich(p.document));
      if (["button", "link"].includes(e.type))
        return n(
          "a",
          {
            ...attrs,
            href: p.href,
            rel: p.href.startsWith("https:")
              ? "noopener noreferrer"
              : undefined,
          },
          p.text,
        );
      if (e.type === "divider") return n("hr", attrs);
      if (e.type === "image")
        return n("img", {
          ...attrs,
          src: p.src,
          alt: e.accessibility.decorative ? "" : p.alt,
          loading: p.priority ? "eager" : "lazy",
          fetchpriority: p.priority ? "high" : "auto",
          decoding: "async",
          referrerpolicy: "no-referrer",
          width: 400,
          height: 300,
        });
      if (e.type === "icon")
        return n("span", attrs, icon(p.iconId, p.label, p.decorative));
      if (e.type === "embed")
        return n("iframe", {
          ...attrs,
          class: attrs.class + " pb-embed",
          src: p.url,
          title: p.title,
          loading: "lazy",
          sandbox: "allow-scripts allow-presentation",
          allow: "fullscreen",
          referrerpolicy: "no-referrer",
        });
      if (["audio", "video"].includes(e.type))
        return n(
          e.type,
          {
            ...attrs,
            src: p.src,
            controls: p.controls,
            muted: p.muted,
            autoplay: p.autoplay,
            loop: p.loop,
            preload: p.preload,
            poster: p.poster || undefined,
          },
          [
            p.captions
              ? n("track", {
                  kind: "captions",
                  src: p.captions,
                  srclang: p.captionLang,
                  label: "Captions",
                  default: true,
                })
              : null,
            "Your browser does not support this media.",
          ],
        );
      if (e.type === "gallery") {
        const sel = "." + classes[id];
        add(sel, `grid-template-columns:repeat(${p.columns},minmax(0,1fr))`);
        add(sel + " img", { aspectRatio: p.aspect, objectFit: p.fit });
        responsive.push(
          `@media (max-width: 599px) { ${sel} { grid-template-columns: 1fr; } }`,
          `@media (min-width: 600px) and (max-width: 1023px) { ${sel} { grid-template-columns: repeat(${Math.min(2, p.columns)},minmax(0,1fr)); } }`,
        );
        return n(
          "div",
          { ...attrs, "data-hover": p.hover },
          p.images.map((img) =>
            n("figure", {}, [
              n("img", {
                class: "pb-image",
                src: img.src,
                alt: img.alt,
                loading: "lazy",
                decoding: "async",
                width: 400,
                height: 300,
                referrerpolicy: "no-referrer",
              }),
              n("figcaption", {}, img.caption),
            ]),
          ),
        );
      }
      if (e.type === "table") {
        const header = ["column", "both"].includes(p.headers);
        const row = (cells, r) =>
          n(
            "tr",
            {},
            cells.map((cell, c) => {
              const isHead =
                (r === 0 && header) ||
                (c === 0 && ["row", "both"].includes(p.headers));
              return n(
                isHead ? "th" : "td",
                {
                  scope: isHead
                    ? r === 0 && header
                      ? "col"
                      : "row"
                    : undefined,
                },
                cell,
              );
            }),
          );
        return n(
          "div",
          attrs,
          n(
            "div",
            {
              class: "pb-internal-table-scroll",
              role: "region",
              "aria-label": p.caption || "Scrollable table",
              tabindex: 0,
            },
            n("table", { "data-striped": String(p.striped) }, [
              n("caption", {}, p.caption),
              header ? n("thead", {}, row(p.rows[0], 0)) : null,
              n(
                "tbody",
                {},
                p.rows
                  .slice(header ? 1 : 0)
                  .map((cells, r) => row(cells, r + (header ? 1 : 0))),
              ),
            ]),
          ),
        );
      }
      if (e.type === "form")
        return n(
          "form",
          {
            ...attrs,
            action: p.action,
            method: p.method,
            "aria-label": e.accessibility.label || "Contact form",
          },
          [
            ...p.fields.map((f, fieldIndex) => {
              // Generated IDs cannot collide with authored HTML IDs: all begin with an isolated prefix, chosen below.
              const fieldId =
                fieldPrefix + e.id.length + "-" + e.id + "-" + fieldIndex;
              const input = {
                id: fieldId,
                name: f.name,
                required: f.required,
                autocomplete: f.autocomplete,
              };
              if (f.kind === "radio")
                return n("fieldset", {}, [
                  n("legend", {}, f.label),
                  ...f.options.map((label, i) =>
                    n("label", { for: fieldId + "-option-" + i }, [
                      n("input", {
                        ...input,
                        id: fieldId + "-option-" + i,
                        type: "radio",
                        value: label,
                      }),
                      label,
                    ]),
                  ),
                ]);
              const label = n("label", { for: fieldId }, f.label);
              if (f.kind === "select")
                return n("div", {}, [
                  label,
                  n(
                    "select",
                    input,
                    f.options.map((option) =>
                      n("option", { value: option }, option),
                    ),
                  ),
                ]);
              const textAttrs = {
                ...input,
                placeholder: f.placeholder || undefined,
                minlength: f.minLength,
                maxlength: f.maxLength,
              };
              return n("div", {}, [
                label,
                f.kind === "textarea"
                  ? n("textarea", textAttrs)
                  : n("input", {
                      ...textAttrs,
                      type: f.kind,
                      pattern: f.pattern || undefined,
                      min: f.min || undefined,
                      max: f.max || undefined,
                    }),
              ]);
            }),
            n("button", { type: "submit" }, p.submitLabel),
          ],
        );
      throw new Error("Unsupported compiler component.");
    }
    let fieldPrefix = "pb-field-";
    const usedIds = elements.map((e) => e.htmlId);
    while (usedIds.some((id) => id.startsWith(fieldPrefix)))
      fieldPrefix = "pb-" + fieldPrefix;
    const main = n(
      "main",
      { class: "pb-page" },
      project.page.rootElementIds.map(render),
    );
    const metadata = project.page.metadata;
    // Only selected, actually used fonts are requested. Each has a local fallback.
    const fontUrl = fonts.size
      ? "https://fonts.googleapis.com/css2?" +
        [...fonts]
          .sort()
          .map(
            (f) => "family=" + f.replaceAll(" ", "+") + ":wght@400;500;600;700",
          )
          .join("&") +
        "&display=swap"
      : null;
    const document = n("html", { lang: metadata.lang }, [
      n("head", {}, [
        n("meta", { charset: "UTF-8" }),
        n("meta", {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        }),
        n("title", {}, metadata.title),
        n("meta", { name: "description", content: metadata.description }),
        n("meta", {
          name: "robots",
          content: metadata.indexable ? "index, follow" : "noindex, nofollow",
        }),
        metadata.faviconUrl
          ? n("link", { rel: "icon", href: metadata.faviconUrl })
          : null,
        fontUrl ? n("link", { rel: "stylesheet", href: fontUrl }) : null,
        n("link", { rel: "stylesheet", href: "styles.css" }),
      ]),
      n("body", {}, main),
    ]);
    // Prune optional component defaults when that component does not occur in the visible tree.
    const present = new Set(elements.map((e) => e.type));
    const base = BASE.split("\n")
      .filter(
        (line) =>
          ![
            [".pb-card", "card"],
            [".pb-button", "button"],
            [".pb-image", "image"],
            [".pb-form", "form"],
            [".pb-table", "table"],
            [".pb-internal-table-scroll", "table"],
            [".pb-gallery", "gallery"],
            [".pb-nav", "nav"],
            [".pb-embed", "embed"],
          ].some(
            ([prefix, type]) =>
              line.trimStart().startsWith(prefix) &&
              !present.has(type) &&
              !(type === "image" && present.has("gallery")),
          ),
      )
      .join("\n");
    const css =
      [
        base,
        "/* Resolved element and shared span styles */",
        ...[...rules].map(
          ([body, selectors]) =>
            selectors.join(",\n") + " {\n" + formatBody(body) + "\n}",
        ),
        "/* Responsive layout and visibility */",
        ...responsive,
        ...[...animations]
          .sort()
          .map((name) => `@keyframes pb-${name} { ${FRAMES[name]} }`),
        "@media (prefers-reduced-motion: reduce) {\n  *,*::before,*::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }\n  .pb-gallery img { transform: none !important; }\n}",
      ].join("\n\n") + "\n";
    return {
      ...result,
      html: "<!doctype html>\n" + serialize(document) + "\n",
      css,
      document,
      classes,
    };
  } catch {
    return {
      ...empty,
      errors: [
        {
          code: "compiler-failed",
          message:
            "The page could not be compiled. Download project JSON for recovery; saved data has not changed.",
          elementId: null,
        },
      ],
    };
  }
}

/** Identical content/styles with explicit isolation-only changes, never saved to project JSON. */
export function previewDocument(compiled) {
  if (compiled.errors.length || !compiled.document) return "";
  const doc = structuredClone(compiled.document),
    head = doc.children[0];
  head.children = head.children.filter(
    (e) => !(e.tag === "link" && e.attrs.href === "styles.css"),
  );
  head.children.unshift(
    n("meta", {
      "http-equiv": "Content-Security-Policy",
      content:
        "default-src 'none'; img-src https:; media-src https:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com; form-action 'none'; base-uri 'none'; object-src 'none'; script-src 'none'",
    }),
  );
  function inert(e) {
    if (typeof e !== "object") return;
    if (e.tag === "a" && e.attrs.href) {
      if (e.attrs.href.startsWith("#")) {
        // srcdoc otherwise resolves relative fragments against the portfolio URL.
        e.attrs.href = "about:srcdoc" + e.attrs.href;
      } else {
        delete e.attrs.href;
        e.attrs.role = "link";
        e.attrs.tabindex = 0;
        e.attrs["aria-disabled"] = "true";
      }
    }
    if (e.tag === "form") delete e.attrs.action;
    for (const child of e.children) inert(child);
  }
  inert(doc);
  // CSS comes exclusively from validated allowlisted properties. Defend the raw style text context too.
  const html = "<!doctype html>\n" + serialize(doc);
  return html.replace(
    "</head>",
    "<style>" + compiled.css.replace(/</g, "\\3c ") + "</style>\n  </head>",
  );
}
export function prepareExport(
  project,
  { acknowledgeWarnings = false, observedFailures = [] } = {},
) {
  const c = compileProject(project, { observedFailures });
  if (c.errors.length)
    throw new Error("Fix critical export errors before downloading.");
  if (c.warnings.length && !acknowledgeWarnings)
    throw new Error(
      "Review and acknowledge export warnings before downloading.",
    );
  return {
    ...c,
    filename: exportSlug(project.name) + ".zip",
    files: { "index.html": c.html, "styles.css": c.css },
  };
}
