import { describe, expect, it } from "vitest";
import {
  createProject,
  duplicateProject,
  migrateProject,
  validateProject,
} from "./project";
import { TEMPLATES } from "./templates";

describe("project model (AC-01, AC-08, AC-09)", () => {
  it("does not impose a separate element-count cap", () => {
    const p = createProject({ name: "Many sections" });
    const source = createProject({ name: "Example", templateId: "portfolio" });
    const section = source.page.elements[source.page.rootElementIds[0]];
    for (let i = 0; i < 1001; i++) {
      const id = `section-${i}`;
      p.page.rootElementIds.push(id);
      p.page.elements[id] = { ...structuredClone(section), id, children: [] };
    }
    expect(validateProject(p)).toBe(p);
  });

  it("prevents a leaf from containing another semantic component", () => {
    const p = createProject({ name: "Nesting", templateId: "portfolio" });
    const root = p.page.elements[p.page.rootElementIds[0]];
    const heading =
      p.page.elements[
        root.children.find((id) => p.page.elements[id].type === "heading")
      ];
    const paragraph =
      p.page.elements[
        root.children.find((id) => p.page.elements[id].type === "paragraph")
      ];
    root.children = root.children.filter((id) => id !== paragraph.id);
    paragraph.parentId = heading.id;
    heading.children.push(paragraph.id);
    expect(() => validateProject(p)).toThrow(/illegal nesting/i);
  });
  it("creates independent valid trees for blank and all six templates", () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      "blank",
      "portfolio",
      "landing",
      "business",
      "blog",
      "contact",
      "gallery",
    ]);
    for (const { id } of TEMPLATES) {
      const a = createProject({ name: "Example", templateId: id });
      const b = createProject({ name: "Example", templateId: id });
      expect(validateProject(a)).toEqual(a);
      expect(a.projectId).not.toBe(b.projectId);
      expect(
        Object.keys(a.page.elements).some((key) => key in b.page.elements),
      ).toBe(false);
    }
  });

  it("duplicates IDs and parent/child references without changing the original", () => {
    const a = createProject({ name: "Original", templateId: "portfolio" });
    const original = JSON.stringify(a);
    const b = duplicateProject(a, "Independent copy");
    expect(b.name).toBe("Independent copy");
    expect(b.revision).toBe(0);
    expect(
      Object.keys(b.page.elements).some((id) => id in a.page.elements),
    ).toBe(false);
    expect(validateProject(b)).toBe(b);
    expect(JSON.stringify(a)).toBe(original);
  });

  it.each([
    [
      "unsafe URL",
      (p) => {
        Object.values(p.page.elements).find(
          (e) => e.type === "link",
        ).props.href = "javascript:alert(1)";
      },
    ],
    [
      "event attribute",
      (p) => {
        Object.values(p.page.elements)[0].props.onClick = "alert(1)";
      },
    ],
    [
      "raw CSS",
      (p) => {
        Object.values(p.page.elements)[0].styles.overrides.background =
          "url(https://evil.invalid)";
      },
    ],
    [
      "dangling child",
      (p) => {
        Object.values(p.page.elements)[0].children.push("missing");
      },
    ],
    [
      "cycle",
      (p) => {
        const root = p.page.rootElementIds[0];
        p.page.elements[root].children.push(root);
      },
    ],
    [
      "duplicate HTML ID",
      (p) => {
        Object.values(p.page.elements)
          .slice(0, 2)
          .forEach((e) => {
            e.htmlId = "duplicate";
          });
      },
    ],
    [
      "unknown field",
      (p) => {
        p.page.innerHTML = "<script>bad</script>";
      },
    ],
    [
      "unknown version",
      (p) => {
        p.schemaVersion = 99;
      },
    ],
  ])("rejects %s", (_, mutate) => {
    const p = createProject({ name: "Safe", templateId: "portfolio" });
    mutate(p);
    expect(() => validateProject(p)).toThrow();
  });

  it("rejects illegal nesting, detached elements, excess depth, and prototype keys", () => {
    const p = createProject({ name: "Nested", templateId: "portfolio" });
    const text = Object.values(p.page.elements).find(
      (e) => e.type === "paragraph",
    );
    const root = p.page.elements[p.page.rootElementIds[0]];
    root.children = root.children.filter((id) => id !== text.id);
    text.parentId = null;
    expect(() => validateProject(p)).toThrow(/reachable|orphan/i);
    const q = createProject({ name: "Deep", templateId: "blank" });
    let parent = null;
    for (let i = 0; i < 5; i++) {
      const node = structuredClone(root);
      node.id = `nested-${i}`;
      node.parentId = parent;
      node.children = [];
      node.htmlId = "";
      q.page.elements[node.id] = node;
      if (parent) q.page.elements[parent].children.push(node.id);
      else q.page.rootElementIds.push(node.id);
      parent = node.id;
    }
    expect(() => validateProject(q)).toThrow(/four|depth/i);
    const raw = JSON.stringify(createProject({ name: "Safe" })).replace(
      '"masters":{}',
      '"masters":{"__proto__":{}}',
    );
    expect(() => validateProject(JSON.parse(raw))).toThrow();
  });

  it("migrates the documented development v0 shape without mutating it", () => {
    const old = createProject({ name: "Prototype" });
    old.schemaVersion = 0;
    delete old.status;
    delete old.favorite;
    delete old.revision;
    const raw = JSON.stringify(old);
    const current = migrateProject(old);
    expect(current.schemaVersion).toBe(1);
    expect(current.status).toBe("active");
    expect(current.favorite).toBe(false);
    expect(JSON.stringify(old)).toBe(raw);
  });
});
