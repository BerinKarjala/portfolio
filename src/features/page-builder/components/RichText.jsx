import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ICONS } from "../domain/icons";
import { FONTS, reactStyles } from "../domain/styles";
import {
  formatRange,
  replaceRange,
  insertInlineIcon,
  richPlainText,
} from "../domain/richText";

export function InlineIcon({ name, label = "", decorative = false, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      style={style}
    >
      <path d={ICONS[name] || ICONS.star} />
    </svg>
  );
}
export function RichText({ document }) {
  return document.nodes.map((n, i) => {
    if (n.type === "break") return <br key={i} />;
    if (n.type === "icon")
      return (
        <span key={i} data-rich-atom="true" contentEditable={false}>
          <InlineIcon
            name={n.iconId}
            label={n.label}
            decorative={!n.label}
            style={reactStyles(n.styles)}
          />
        </span>
      );
    let child = n.text;
    const tags = {
      bold: "strong",
      italic: "em",
      underline: "u",
      strike: "s",
      superscript: "sup",
      subscript: "sub",
    };
    for (const mark of n.marks) {
      const Tag = tags[mark];
      child = <Tag>{child}</Tag>;
    }
    return n.type === "link" ? (
      <a
        key={i}
        href={n.href}
        style={reactStyles(n.styles)}
        onClick={(e) => e.preventDefault()}
      >
        {child}
      </a>
    ) : (
      <span key={i} style={reactStyles(n.styles)}>
        {child}
      </span>
    );
  });
}
const units = (node) =>
  node.nodeType === 3
    ? node.textContent.length
    : node.nodeType === 1 && (node.tagName === "BR" || node.dataset.richAtom)
      ? 1
      : [...node.childNodes].reduce((sum, n) => sum + units(n), 0);
function offsetOf(root, node, offset) {
  let total = 0,
    found = false;
  function walk(at) {
    if (found) return;
    if (at === node) {
      total +=
        at.nodeType === 3
          ? offset
          : [...at.childNodes]
              .slice(0, offset)
              .reduce((s, n) => s + units(n), 0);
      found = true;
      return;
    }
    if (
      at.nodeType === 3 ||
      (at.nodeType === 1 && (at.tagName === "BR" || at.dataset.richAtom))
    ) {
      total += units(at);
      return;
    }
    for (const child of at.childNodes) walk(child);
  }
  walk(root);
  return found ? total : null;
}
function pointAt(root, offset) {
  let left = offset,
    answer;
  function walk(node) {
    if (answer) return;
    if (node.nodeType === 3) {
      if (left <= node.textContent.length) answer = [node, left];
      else left -= node.textContent.length;
    } else if (
      node.nodeType === 1 &&
      (node.tagName === "BR" || node.dataset.richAtom)
    ) {
      const index = [...node.parentNode.childNodes].indexOf(node);
      if (left <= 1) answer = [node.parentNode, index + (left ? 1 : 0)];
      else left -= 1;
    } else for (const child of node.childNodes) walk(child);
  }
  walk(root);
  return answer || [root, root.childNodes.length];
}
export function RichTextEditor({
  document: doc,
  onChange,
  onDone,
  onHistory,
  disabled = false,
}) {
  const root = useRef(null),
    saved = useRef({ start: 0, end: 0 }),
    pending = useRef(null),
    composing = useRef(false);
  const [link, setLink] = useState(""),
    [font, setFont] = useState("system-ui"),
    [size, setSize] = useState("1rem"),
    [color, setColor] = useState("#17251d"),
    [highlight, setHighlight] = useState("#fff1a8"),
    [icon, setIcon] = useState("star"),
    [error, setError] = useState("");
  function capture() {
    const s = window.getSelection();
    if (
      !s?.rangeCount ||
      !root.current?.contains(s.anchorNode) ||
      !root.current?.contains(s.focusNode)
    )
      return;
    const a = offsetOf(root.current, s.anchorNode, s.anchorOffset),
      b = offsetOf(root.current, s.focusNode, s.focusOffset);
    if (a !== null && b !== null)
      saved.current = { start: Math.min(a, b), end: Math.max(a, b) };
  }
  function restore(range = saved.current) {
    if (!root.current) return;
    root.current.focus();
    const r = window.document.createRange(),
      a = pointAt(root.current, range.start),
      b = pointAt(root.current, range.end);
    r.setStart(...a);
    r.setEnd(...b);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }
  useEffect(() => {
    window.document.addEventListener("selectionchange", capture);
    restore();
    return () =>
      window.document.removeEventListener("selectionchange", capture);
  }, []);
  useLayoutEffect(() => {
    if (pending.current) {
      const r = pending.current;
      pending.current = null;
      restore(r);
    }
  }, [doc]);
  function commit(next, range, key) {
    if (disabled) return;
    setError("");
    saved.current = range;
    pending.current = range;
    onChange(next, key);
  }
  function format(value) {
    try {
      const { start, end } = saved.current;
      if (start === end) {
        setError("Select text to format.");
        return;
      }
      commit(
        formatRange(doc, start, end, value),
        { start, end },
        value.styles
          ? `format:${Object.keys(value.styles).join(",")}:${start}:${end}`
          : undefined,
      );
    } catch (e) {
      setError(e.message);
    }
  }
  function replace(
    value,
    start = saved.current.start,
    end = saved.current.end,
  ) {
    try {
      commit(
        replaceRange(doc, start, end, value),
        { start: start + value.length, end: start + value.length },
        "typing",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  function beforeInput(event) {
    if (composing.current || (event.nativeEvent || event).isComposing) return;
    capture();
    const kind = (event.nativeEvent || event).inputType || "insertText",
      { start, end } = saved.current;
    const length = richPlainText(doc).length;
    if (kind === "insertText") {
      event.preventDefault();
      replace((event.nativeEvent || event).data || "");
    } else if (["insertParagraph", "insertLineBreak"].includes(kind)) {
      event.preventDefault();
      replace("\n");
    } else if (kind.startsWith("delete")) {
      event.preventDefault();
      const target = (event.nativeEvent || event).getTargetRanges?.()[0];
      const a = target
        ? offsetOf(root.current, target.startContainer, target.startOffset)
        : null;
      const b = target
        ? offsetOf(root.current, target.endContainer, target.endOffset)
        : null;
      if (start !== end) replace("", start, end);
      else if (a !== null && b !== null && a !== b)
        replace("", Math.min(a, b), Math.max(a, b));
      else {
        const points = [
          ...new Intl.Segmenter(undefined, {
            granularity: kind.includes("Word") ? "word" : "grapheme",
          }).segment(richPlainText(doc)),
        ].map((s) => s.index);
        replace(
          "",
          kind.includes("Backward")
            ? (points.filter((n) => n < start).at(-1) ?? 0)
            : start,
          kind.includes("Forward")
            ? (points.find((n) => n > end) ?? length)
            : end,
        );
      }
    } else if (kind === "historyUndo" || kind === "historyRedo") {
      event.preventDefault();
    }
  }
  function reconcile() {
    if (composing.current) return;
    const current = richPlainText(doc);
    function read(node) {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType === 1 && node.dataset.richAtom) return "\ufffc";
      if (node.nodeType === 1 && node.tagName === "BR") return "\n";
      return [...node.childNodes].map(read).join("");
    }
    const next = read(root.current);
    if (next === current) return;
    let start = 0;
    while (
      start < current.length &&
      start < next.length &&
      current[start] === next[start]
    )
      start++;
    let tail = 0;
    while (
      tail < current.length - start &&
      tail < next.length - start &&
      current[current.length - 1 - tail] === next[next.length - 1 - tail]
    )
      tail++;
    const value = next.slice(start, next.length - tail);
    replace(value, start, current.length - tail);
  }
  const beforeRef = useRef(beforeInput);
  beforeRef.current = beforeInput;
  useEffect(() => {
    const handler = (event) => beforeRef.current(event);
    const node = root.current;
    node.addEventListener("beforeinput", handler);
    return () => node.removeEventListener("beforeinput", handler);
  }, []);
  const dock = window.document.querySelector(".pb-rich-dock");
  const toolbar = (
    <div
      className="pb-rich-toolbar"
      role="toolbar"
      aria-label="Text formatting"
    >
      {Object.entries({
        bold: "Bold",
        italic: "Italic",
        underline: "Underline",
        strike: "Strike",
        superscript: "Superscript",
        subscript: "Subscript",
      }).map(([mark, label]) => (
        <button
          key={mark}
          type="button"
          disabled={disabled}
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format({ mark })}
        >
          {label}
        </button>
      ))}
      <label>
        Selection font
        <select
          aria-label="Selection font"
          value={font}
          onChange={(e) => {
            setFont(e.target.value);
            format({ styles: { fontFamily: e.target.value } });
          }}
        >
          {Object.keys(FONTS).map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <label>
        Selection weight
        <select
          aria-label="Selection weight"
          defaultValue="400"
          onChange={(e) =>
            format({ styles: { fontWeight: Number(e.target.value) } })
          }
        >
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Selection size
        <select
          aria-label="Selection size"
          value={size}
          onChange={(e) => {
            setSize(e.target.value);
            format({ styles: { fontSize: e.target.value } });
          }}
        >
          {["0.75rem", "1rem", "1.25rem", "1.5rem", "2rem", "3rem"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Text color
        <input
          aria-label="Selection color"
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            format({ styles: { color: e.target.value } });
          }}
        />
      </label>
      <label>
        Highlight
        <input
          aria-label="Selection highlight"
          type="color"
          value={highlight}
          onChange={(e) => {
            setHighlight(e.target.value);
            format({ styles: { backgroundColor: e.target.value } });
          }}
        />
      </label>
      <label>
        Link URL
        <input
          aria-label="Rich text link URL"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://… or #section"
        />
      </label>
      <button type="button" onClick={() => format({ href: link })}>
        Apply text link
      </button>
      <button type="button" onClick={() => format({ href: "" })}>
        Remove text link
      </button>
      <label>
        Inline icon
        <select
          aria-label="Inline icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        >
          {Object.keys(ICONS).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => {
          try {
            const { start, end } = saved.current;
            commit(
              insertInlineIcon(doc, start, end, icon, ""),
              { start: start + 1, end: start + 1 },
              undefined,
            );
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        Insert inline icon
      </button>
      <button type="button" onClick={onDone}>
        Done editing text
      </button>
    </div>
  );
  return (
    <div
      className="pb-rich-editor"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {dock ? createPortal(toolbar, dock) : toolbar}
      {error && <p role="alert">{error}</p>}
      <div
        ref={root}
        className="pb-rich-surface"
        role="textbox"
        aria-label="Rich text content"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        spellCheck
        onInput={reconcile}
        onCompositionStart={() => {
          composing.current = true;
          capture();
        }}
        onCompositionEnd={() => {
          composing.current = false;
          reconcile();
        }}
        onPaste={(event) => {
          event.preventDefault();
          capture();
          replace(event.clipboardData.getData("text/plain"));
        }}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            ["z", "y"].includes(event.key.toLowerCase())
          ) {
            event.preventDefault();
            event.stopPropagation();
            onHistory?.(
              event.key.toLowerCase() === "y" || event.shiftKey
                ? "REDO"
                : "UNDO",
            );
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
          if (event.key === "Enter") {
            event.preventDefault();
            capture();
            replace("\n");
          }
        }}
      >
        <RichText document={doc} />
      </div>
      <p className="pb-rich-help">
        Select text, then format it. Pasted content becomes plain text. Escape
        finishes editing.
      </p>
    </div>
  );
}
