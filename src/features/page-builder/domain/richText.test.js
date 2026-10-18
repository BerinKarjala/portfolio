import { describe, expect, it } from "vitest";
import {
  textDocument,
  validateRichText,
  richPlainText,
  formatRange,
  replaceRange,
  insertInlineIcon,
  migrateDocument,
} from "./richText";

describe("structured rich text (Q118–121)", () => {
  it("formats only a UTF-16 selection and preserves formatting across replacements", () => {
    let doc = formatRange(textDocument("Hello world"), 6, 11, { mark: "bold" });
    expect(doc.nodes.map((n) => [n.text, n.marks])).toEqual([
      ["Hello ", []],
      ["world", ["bold"]],
    ]);
    doc = replaceRange(doc, 7, 10, "EAR");
    expect(richPlainText(doc)).toBe("Hello wEARd");
    expect(doc.nodes.at(-1).marks).toContain("bold");
    expect(richPlainText(replaceRange(doc, 0, 6, ""))).toBe("wEARd");
  });
  it("supports links, inline icons, superscript, colors and mutually exclusive subscript", () => {
    let doc = formatRange(textDocument("Explore"), 0, 7, {
      href: "https://example.com",
      styles: { color: "#123456", fontFamily: "Lora" },
      mark: "superscript",
    });
    doc = formatRange(doc, 0, 7, { mark: "subscript" });
    doc = insertInlineIcon(doc, 7, 7, "star", "Featured");
    expect(doc.nodes[0].type).toBe("link");
    expect(doc.nodes[0].marks).toEqual(["subscript"]);
    expect(doc.nodes.at(-1).type).toBe("icon");
    expect(validateRichText(doc)).toBe(doc);
  });
  it("migrates old text without HTML interpretation and rejects executable/unknown nodes", () => {
    expect(
      richPlainText(
        migrateDocument({
          version: 1,
          nodes: [{ type: "text", text: "<script>literal</script>" }],
        }),
      ),
    ).toBe("<script>literal</script>");
    expect(() =>
      validateRichText({
        version: 2,
        nodes: [{ type: "html", html: "<img onerror=alert(1)>" }],
      }),
    ).toThrow();
    expect(() =>
      formatRange(textDocument("x"), 0, 1, { href: "javascript:alert(1)" }),
    ).toThrow();
    expect(() =>
      formatRange(textDocument("x"), 0, 1, {
        styles: { backgroundImage: "url(x)" },
      }),
    ).toThrow();
  });
});
