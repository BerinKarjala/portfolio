import { useState, useEffect, useRef } from "react";
import { useBuilder } from "../state/BuilderProvider";
import { safeUrl } from "../domain/project";
import { documentText } from "../domain/project";
import { isTextInput } from "../hooks/useCanvasCamera";
export default function ExternalPaste({ parentId }) {
  const { state, sendCommand } = useBuilder();
  const [value, setValue] = useState("");
  const details = useRef(null);
  useEffect(() => {
    const paste = (event) => {
      if (isTextInput(event.target) || event.defaultPrevented) return;
      const text = event.clipboardData?.getData("text/plain");
      if (!text) return;
      event.preventDefault();
      setValue(text.slice(0, 10000));
      if (details.current) details.current.open = true;
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, []);
  const url = safeUrl(value.trim()),
    image =
      url && /\.(png|jpe?g|webp|avif|gif|svg)(?:[?#]|$)/i.test(value.trim());
  // Paste suggestions are explicit and never interpret clipboard HTML.
  return (
    <details ref={details} className="pb-external-paste">
      <summary>Paste external content</summary>
      <label>
        Paste text or an HTTPS URL
        <textarea
          value={value}
          maxLength={10000}
          onChange={(event) => setValue(event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            setValue(event.clipboardData.getData("text/plain").slice(0, 10000));
          }}
        />
      </label>
      <div className="pb-inline-actions">
        {[
          ["paragraph", "Insert as paragraph"],
          ...(url ? [["link", "Insert as link"]] : []),
          ...(image ? [["image", "Insert as image"]] : []),
        ].map(([component, label]) => (
          <button
            key={component}
            type="button"
            disabled={state.editor.readOnly || !value.trim()}
            onClick={() => {
              sendCommand({
                type: "ADD",
                component,
                parentId,
                initialProps:
                  component === "paragraph"
                    ? { document: documentText(value) }
                    : component === "link"
                      ? { text: value.trim(), href: value.trim() }
                      : { src: value.trim(), alt: "" },
              });
              setValue("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </details>
  );
}
