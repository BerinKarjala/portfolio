/* @vitest-environment jsdom */
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { makeElement } from "../domain/structure";
import { FIELD_KINDS, makeField } from "../domain/components";
import { createProject, validateProject } from "../domain/project";
import ComponentContent from "./ComponentContent";
afterEach(cleanup);
describe("semantic component fixtures", () => {
  it("renders every form field kind with labels and constraints without binding visitor values", () => {
    const e = makeElement("form");
    e.props.fields = FIELD_KINDS.map((kind, i) => ({
      ...makeField(kind),
      name: "field-" + i,
      label: "Field " + i,
      required: true,
      pattern: kind === "text" ? "[A-Za-z]+" : "",
    }));
    const original = JSON.stringify(e);
    const { container } = render(<ComponentContent element={e} />);
    const form = screen.getByRole("form", { name: "Form preview" });
    expect(form.getAttribute("method")).toBe("POST");
    expect(form.getAttribute("action")).toBe("https://example.com/contact");
    expect(
      container.querySelectorAll("input,select,textarea").length,
    ).toBeGreaterThanOrEqual(FIELD_KINDS.length);
    for (const input of container.querySelectorAll("input,select,textarea")) {
      expect(input.disabled).toBe(true);
      expect(input.getAttribute("value")).toBe(null);
      expect(input.id).toBeTruthy();
    }
    expect(
      container.querySelector("input[type=text]").getAttribute("pattern"),
    ).toBe("[A-Za-z]+");
    fireEvent.change(container.querySelector("input[type=email]"), {
      target: { value: "private@example.com" },
    });
    expect(JSON.stringify(e)).toBe(original);
  });
  it.each(["none", "row", "column", "both"])(
    "renders table %s headers with appropriate native scope",
    (headers) => {
      const e = makeElement("table");
      e.props.headers = headers;
      const { container } = render(<ComponentContent element={e} />);
      expect(container.querySelectorAll("tr")).toHaveLength(3);
      expect(container.querySelector("caption").textContent).toBe(
        e.props.caption,
      );
      const columns = container.querySelectorAll("th[scope=col]").length;
      expect(columns).toBe(["column", "both"].includes(headers) ? 3 : 0);
      expect(container.querySelectorAll("th[scope=row]").length).toBe(
        headers === "row" ? 3 : headers === "both" ? 2 : 0,
      );
    },
  );
  it("renders curated icons, safe rich tags and literal markup as text", () => {
    const e = makeElement("paragraph");
    e.props.document = {
      version: 2,
      nodes: [
        {
          type: "link",
          text: "<script>literal</script>",
          href: "https://example.com",
          marks: ["bold", "superscript"],
          styles: { color: "#123456" },
        },
        { type: "icon", iconId: "leaf", label: "Leaf", styles: {} },
      ],
    };
    const { container } = render(<ComponentContent element={e} />);
    expect(container.querySelector("a sup strong").textContent).toBe(
      "<script>literal</script>",
    );
    expect(container.querySelectorAll("script")).toHaveLength(0);
    expect(screen.getByRole("img", { name: "Leaf" })).toBeTruthy();
  });
  it("loads only the approved embed in an opaque sandbox without forms or top navigation", () => {
    const e = makeElement("embed");
    render(<ComponentContent element={e} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load external embed" }),
    );
    const iframe = screen.getByTitle("Video embed");
    expect(iframe.getAttribute("src")).toBe(e.props.url);
    expect(iframe.getAttribute("sandbox")).toBe(
      "allow-scripts allow-presentation",
    );
    expect(iframe.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
  it("keeps external media native with captions and autoplay disabled while editing", () => {
    const e = makeElement("video");
    Object.assign(e.props, {
      autoplay: true,
      muted: true,
      captions: "https://example.com/captions.vtt",
    });
    const { container } = render(<ComponentContent element={e} />);
    expect(container.querySelector("video").hasAttribute("autoplay")).toBe(
      false,
    );
    expect(container.querySelector("video").muted).toBe(true);
    expect(container.querySelector("track").getAttribute("kind")).toBe(
      "captions",
    );
  });
  it("keeps gallery order, captions, ratios and focal styling", () => {
    const e = makeElement("gallery");
    const { container } = render(
      <ComponentContent element={e} viewport={390} />,
    );
    expect(
      [...container.querySelectorAll("figcaption")].map((n) => n.textContent),
    ).toEqual(e.props.images.map((n) => n.caption));
    expect(
      container.querySelector(".pb-content-gallery").style.gridTemplateColumns,
    ).toBe("repeat(1,minmax(0,1fr))");
    expect(container.querySelector("img").style.objectFit).toBe("cover");
  });
  it.each(["portfolio", "landing", "business", "blog", "contact", "gallery"])(
    "creates a polished immutable %s sample within four levels",
    (templateId) => {
      const p = createProject({ templateId });
      expect(validateProject(p)).toBe(p);
      expect(Object.values(p.page.elements).some((e) => e.type === "nav")).toBe(
        true,
      );
      expect(
        Object.values(p.page.elements).some((e) => e.type === "icon"),
      ).toBe(true);
      const ids = Object.values(p.page.elements)
        .map((e) => e.htmlId)
        .filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );
});
