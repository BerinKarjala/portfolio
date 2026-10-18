import { useMemo, useState } from "react";

// Text tokens render as React text nodes, including strings that resemble markup.
function tokens(line, language) {
  const pattern =
    language === "html"
      ? /(<!--[\s\S]*?-->|<\/?[\w-]+|\/?\s*>|[\w-]+(?==)|"[^"]*")/g
      : /(\/\*.*?\*\/|#[\da-fA-F]{3,8}\b|[\w-]+(?=\s*:)|[{};]|"[^"]*"|'[^']*')/g;
  return line.split(pattern).map((part, i) => (
    <span key={i} className={i % 2 ? "pb-code-token" : undefined}>
      {part}
    </span>
  ));
}
export default function CodeViewer({ text, language }) {
  const [status, setStatus] = useState("");
  const lines = useMemo(
    () =>
      text.split("\n").map((line, i) => (
        <li key={i}>
          <code>{tokens(line, language)}</code>
        </li>
      )),
    [text, language],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Code copied.");
    } catch {
      setStatus(
        "Clipboard unavailable. Select and copy the code from the text field below.",
      );
    }
  }
  return (
    <section
      className="pb-generated-code"
      aria-label={`Generated ${language.toUpperCase()}`}
    >
      <div className="pb-preview-toolbar">
        <strong>{language === "html" ? "index.html" : "styles.css"}</strong>
        <button type="button" onClick={copy}>
          Copy {language.toUpperCase()}
        </button>
        <span role="status">{status}</span>
      </div>
      <div
        className="pb-code-scroll"
        tabIndex={0}
        aria-label={`${language.toUpperCase()} source with line numbers`}
      >
        <ol>{lines}</ol>
      </div>
      <details>
        <summary>Select code manually</summary>
        <textarea
          aria-label={`Read-only ${language.toUpperCase()} code`}
          readOnly
          value={text}
          rows={8}
          spellCheck={false}
        />
      </details>
    </section>
  );
}
