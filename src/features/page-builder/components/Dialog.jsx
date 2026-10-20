import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Dialog({
  labelledBy,
  onDismiss,
  children,
  fullScreen = false,
  className = "",
  restoreFocus,
}) {
  const ref = useRef(null);
  const available = (node) => {
    for (
      let parent = node;
      parent && parent !== ref.current;
      parent = parent.parentElement
    ) {
      if (
        parent.hidden ||
        parent.inert ||
        getComputedStyle(parent).display === "none" ||
        getComputedStyle(parent).visibility === "hidden"
      )
        return false;
      if (
        parent.tagName === "DETAILS" &&
        !parent.open &&
        !parent.querySelector(":scope > summary")?.contains(node)
      )
        return false;
    }
    return true;
  };
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    const first = [
      ...dialog.querySelectorAll(
        "[autofocus], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex='0']",
      ),
    ].find(available);
    first?.focus();
    return () => {
      if (typeof dialog.close === "function") dialog.close();
      document.body.style.overflow = overflow;
      if (restoreFocus) restoreFocus();
      else if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  function keyDown(event) {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    }
    // Native dialogs contain focus. This also supports test DOMs and older hosts.
    if (event.key === "Tab") {
      const focusable = [
        ...ref.current.querySelectorAll(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex='0']",
        ),
      ].filter(available);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-modal="true"
      className={`pb-root ${fullScreen ? "pb-workspace" : "pb-modal"} ${className}`}
      onKeyDown={keyDown}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}

export function Modal({ title, onClose, children }) {
  const titleId = `pb-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <Dialog labelledBy={titleId} onDismiss={onClose}>
      <div className="pb-modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="pb-quiet"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {children}
    </Dialog>
  );
}
