import { useEffect, useRef, useState } from "react";

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
