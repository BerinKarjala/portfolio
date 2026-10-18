import { useEffect, useRef, useState } from "react";
import { plainText } from "../domain/project";

function PreviewImage({ element }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="pb-image-fallback">
      {element.props.alt || "Image unavailable"}
    </div>
  ) : (
    <img
      src={element.props.src}
      alt={element.props.alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

// M1 shows starter content only. The M4 sandbox preview will use the export compiler.
export default function PagePreview({ project }) {
  function render(id) {
    const element = project.page.elements[id];
    if (!element || element.visibility.globalHidden) return null;
    const style = element.styles.overrides;
    const children = element.children.map(render);
    const props = { key: id, style };
    switch (element.type) {
      case "heading": {
        const Heading = `h${element.props.level}`;
        return <Heading {...props}>{plainText(element)}</Heading>;
      }
      case "paragraph":
        return <p {...props}>{plainText(element)}</p>;
      case "link":
        return (
          <span {...props} className="pb-preview-link">
            {element.props.text} ↗
          </span>
        );
      case "divider":
        return <hr {...props} />;
      case "image":
        return (
          <div {...props}>
            <PreviewImage element={element} />
          </div>
        );
      case "list": {
        const List = element.props.ordered ? "ol" : "ul";
        return <List {...props}>{children}</List>;
      }
      case "listItem":
        return <li {...props}>{plainText(element)}</li>;
      default:
        return (
          <div {...props} className="pb-preview-section">
            {children}
          </div>
        );
    }
  }
  return (
    <div className="pb-page" style={project.globalStyles}>
      {project.page.rootElementIds.length ? (
        project.page.rootElementIds.map(render)
      ) : (
        <div className="pb-blank-page">
          <span aria-hidden="true">＋</span>
          <h3>Your page starts here.</h3>
          <p>A blank canvas for your next idea.</p>
        </div>
      )}
    </div>
  );
}

export function Thumbnail({ project }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver !== "function",
  );
  useEffect(() => {
    if (visible || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  const first = project.page.elements[project.page.rootElementIds[0]];
  return (
    <div
      ref={ref}
      className="pb-thumbnail"
      style={{
        "--pb-preview-accent":
          first?.styles.overrides.backgroundColor || "#166534",
      }}
      aria-hidden="true"
    >
      {visible && (
        <>
          <div className="pb-thumbnail-bar">
            <i />
            <i />
            <i />
          </div>
          <div className="pb-thumbnail-hero">
            <span />
            <strong>{project.page.metadata.title}</strong>
            <span />
          </div>
          <div className="pb-thumbnail-cards">
            <i />
            <i />
            <i />
          </div>
        </>
      )}
    </div>
  );
}
