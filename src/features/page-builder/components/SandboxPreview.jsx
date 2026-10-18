import { useMemo, useRef, useState } from "react";
import { previewDocument } from "../exporters/compiler";

export default function SandboxPreview({
  compiled,
  title = "Website preview",
}) {
  const [width, setWidth] = useState(1280);
  const drag = useRef(null);
  const source = useMemo(() => previewDocument(compiled), [compiled]);
  const clamp = (value) => Math.max(320, Math.min(1920, Math.round(value)));
  return (
    <section className="pb-sandbox" aria-label={title}>
      <div className="pb-preview-toolbar">
        <label>
          Preview device
          <select
            value={[390, 768, 1280].includes(width) ? width : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") setWidth(Number(e.target.value));
            }}
          >
            <option value={390}>Mobile · 390px</option>
            <option value={768}>Tablet · 768px</option>
            <option value={1280}>Desktop · 1280px</option>
            {![390, 768, 1280].includes(width) && (
              <option value="custom">Custom</option>
            )}
          </select>
        </label>
        <label>
          Preview width
          <input
            type="number"
            min={320}
            max={1920}
            value={width}
            onChange={(e) => setWidth(clamp(Number(e.target.value) || 320))}
          />
        </label>
        <span>{width}px layout · scroll horizontally for wider pages</span>
      </div>
      <p className="pb-hint">
        Links to sections work. External navigation and form submission are
        blocked. Use native menus and controls to inspect interaction states.
      </p>
      <div
        className="pb-preview-stage"
        tabIndex={0}
        role="region"
        aria-label="Scrollable preview viewport"
      >
        <div className="pb-preview-sized" style={{ width, height: 640 }}>
          <iframe
            title={title}
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={source}
            style={{ width, height: 640 }}
          />
        </div>
      </div>
      <div
        className="pb-preview-resizer"
        role="separator"
        aria-label="Resize preview"
        aria-orientation="vertical"
        aria-valuemin={320}
        aria-valuemax={1920}
        aria-valuenow={width}
        tabIndex={0}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setWidth(
              e.key === "Home"
                ? 320
                : e.key === "End"
                  ? 1920
                  : clamp(width + (e.key === "ArrowLeft" ? -10 : 10)),
            );
          }
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, width };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setWidth(clamp(drag.current.width + (e.clientX - drag.current.x)));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        ↔ Drag or use arrow keys to resize
      </div>
    </section>
  );
}
