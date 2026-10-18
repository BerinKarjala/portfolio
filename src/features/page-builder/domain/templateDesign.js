import { defaultProps } from "./components";
import { textDocument } from "./richText";

/** Original sample compositions use editable components and curated SVG icons.
 * Gallery pictures intentionally start as replaceable external-URL placeholders.
 */
export function polishTemplate(project, template, add) {
  if (template.id === "blank") return;
  const roots = project.page.rootElementIds,
    es = project.page.elements;
  project.globalStyles = { ...project.globalStyles, lineHeight: 1.6 };
  roots.forEach((id, i) => {
    const e = es[id];
    e.name =
      i === 0 ? "Hero" : i === roots.length - 1 ? "Contact" : "Selected work";
    e.htmlId = ["intro", "work", "contact"][i];
    e.styles.overrides = {
      ...e.styles.overrides,
      padding: "2rem",
      ...(i > 0
        ? { backgroundColor: i % 2 ? "#f1f4ef" : "#ffffff", color: "#173d2d" }
        : {}),
    };
    for (const child of e.children) {
      const n = es[child];
      if (n.type === "heading" && n.props.level === 1)
        n.styles.overrides.fontSize = "2.5rem";
      if (n.type === "paragraph" && n.styles.overrides.fontSize === "0.75rem")
        n.styles.overrides = {
          ...n.styles.overrides,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        };
      if (n.type === "link")
        n.props.href = i === 0 ? "#work" : "mailto:hello@example.com";
    }
  });
  const hero = roots[0];
  const nav = add("nav", defaultProps("nav"), hero, {
    fontSize: "0.8rem",
    paddingBottom: "1rem",
  });
  es[nav].name =
    template.id === "portfolio"
      ? "Alex / Independent designer"
      : template.name + " studio";
  es[nav].layout.direction = "row";
  es[nav].layout.wrap = true;
  es[nav].styles.overrides.gap = "1.5rem";
  for (const [text, href] of [
    ["Introduction", "#intro"],
    ["Work", "#work"],
    ["Contact", roots.length > 2 ? "#contact" : "mailto:hello@example.com"],
  ])
    add("link", { text, href }, nav);
  es[hero].children = [nav, ...es[hero].children.filter((id) => id !== nav)];
  const emblem = add(
    "icon",
    {
      iconId: {
        portfolio: "leaf",
        landing: "sparkle",
        business: "globe",
        blog: "sun",
        contact: "mail",
        gallery: "star",
      }[template.id],
      label: "",
      decorative: true,
    },
    hero,
    { fontSize: "2rem", color: "#ffffff" },
  );
  es[emblem].name = "Studio mark";
  if (template.id === "gallery") {
    const gallery = add("gallery", defaultProps("gallery"), roots[1]);
    es[gallery].props.images.push({
      id: crypto.randomUUID(),
      src: "https://example.com/art-3.jpg",
      alt: "Warm geometric composition",
      caption: "Warm geometry",
    });
    es[gallery].props.images[0].alt = "Green geometric composition";
    es[gallery].props.images[1].alt = "Violet geometric composition";
  } else if (template.id === "contact") {
    const form = add("form", defaultProps("form"), roots[1], {
      maxWidth: "40rem",
    });
    es[form].name = "Contact form";
    es[form].props.fields[0].required = true;
  } else if (template.id === "blog") {
    for (const root of roots.slice(1)) {
      const note = add(
        "paragraph",
        {
          document: textDocument(
            "A short note from the studio · 5 minute read",
          ),
        },
        root,
        { fontSize: "0.8rem", color: "#586b60" },
      );
      es[note].name = "Reading note";
    }
  } else {
    const grid = add("container", {}, roots[1], { gap: "1rem" });
    es[grid].name = "Highlights";
    es[grid].layoutMode = "grid";
    es[grid].layout.columns = 3;
    for (const [title, body] of template.id === "business"
      ? [
          ["Research", "Understand the people behind the problem."],
          ["Identity", "A clear expression of what makes you different."],
          ["Digital", "Useful experiences made with care."],
        ]
      : template.id === "landing"
        ? [
            ["Plan with purpose", "Keep your next step in view."],
            ["Make space", "Bring good ideas together."],
            ["Share progress", "Move forward with your team."],
          ]
        : [
            [
              "Field journal",
              "An editorial concept inspired by everyday observations.",
            ],
            [
              "Studio identity",
              "A considered visual system for an independent studio.",
            ],
            ["Digital garden", "An experiment in a calmer, more useful web."],
          ]) {
      const card = add("card", {}, grid, {
        padding: "1.2rem",
        borderRadius: "0.75rem",
        backgroundColor: "#ffffff",
      });
      es[card].name = title;
      es[card].layout.direction = "column";
      es[card].styles.overrides.gap = "0.7rem";
      // Depth four is the limit; text is intentionally one semantic rich paragraph.
      const doc = textDocument(title + "\n" + body);
      doc.nodes = [
        { type: "text", text: title, marks: ["bold"], styles: {} },
        { type: "break" },
        { type: "text", text: body, marks: [], styles: {} },
      ];
      add("paragraph", { document: doc }, card, { fontSize: "0.95rem" });
    }
  }
}
