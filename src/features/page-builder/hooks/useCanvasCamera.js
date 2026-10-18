import { useEffect, useRef, useState } from "react";
import { clamp } from "../domain/geometry";

export const isTextInput = (target) =>
  !!target?.closest?.("input, textarea, select, [contenteditable='true']");
export default function useCanvasCamera({
  scrollRef,
  workspace,
  setWorkspace,
  sessionKey,
}) {
  const latest = useRef({ workspace, setWorkspace });
  latest.current = { workspace, setWorkspace };
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const space = useRef(false);
  const frame = useRef(0);
  const blockClick = useRef(false);
  const [panning, setPanning] = useState(false);
  function zoomTo(value, point) {
    const el = scrollRef.current;
    if (!el) return;
    const previous = latest.current.workspace.zoom;
    const zoom = clamp(value, 0.5, 2);
    const rect = el.getBoundingClientRect();
    const at = point || {
      x: rect.left + el.clientWidth / 2,
      y: rect.top + el.clientHeight / 2,
    };
    const x = at.x - rect.left;
    const y = at.y - rect.top;
    const left = ((el.scrollLeft + x) * zoom) / previous - x;
    const top = ((el.scrollTop + y) * zoom) / previous - y;
    latest.current.setWorkspace((ws) => ({ ...ws, zoom }));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.scrollLeft = left;
      el.scrollTop = top;
    });
  }
  useEffect(() => {
    const el = scrollRef.current;
    el.scrollTop = latest.current.workspace.scrollTop;
    el.scrollLeft = latest.current.workspace.scrollLeft;
    const wheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomTo(latest.current.workspace.zoom * Math.exp(-e.deltaY * 0.005), {
          x: e.clientX,
          y: e.clientY,
        });
      }
    };
    const down = (e) => {
      if (
        e.code === "Space" &&
        !isTextInput(e.target) &&
        !e.target.closest?.("button,summary,a")
      ) {
        space.current = true;
        e.preventDefault();
      }
    };
    const up = (e) => {
      if (e.code === "Space") space.current = false;
    };
    const reset = () => {
      space.current = false;
      pointers.current.clear();
      gesture.current = null;
      setPanning(false);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      cancelAnimationFrame(frame.current);
    };
  }, [sessionKey]);
  function onPointerDown(event) {
    if (event.target.closest(".pb-node-controls,.pb-resize-handle")) return;
    if (event.pointerType === "touch")
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    const el = scrollRef.current;
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      const [a, b] = points;
      const rect = el.getBoundingClientRect();
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: latest.current.workspace.zoom,
        x: (a.x + b.x) / 2 - rect.left,
        y: (a.y + b.y) / 2 - rect.top,
        left: el.scrollLeft,
        top: el.scrollTop,
      };
    } else if (
      event.button === 1 ||
      space.current ||
      (event.pointerType === "touch" &&
        !event.target.closest("[data-element-id],button,input,select,textarea"))
    )
      gesture.current = {
        kind: "pan",
        x: event.clientX,
        y: event.clientY,
        left: el.scrollLeft,
        top: el.scrollTop,
      };
    if (gesture.current) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setPanning(true);
    }
  }
  function onPointerMove(event) {
    if (pointers.current.has(event.pointerId))
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    const g = gesture.current;
    const el = scrollRef.current;
    if (!g) return;
    event.preventDefault();
    if (g.kind === "pan") {
      el.scrollLeft = g.left - event.clientX + g.x;
      el.scrollTop = g.top - event.clientY + g.y;
    } else {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const zoom = clamp(
        (g.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(g.distance, 1),
        0.5,
        2,
      );
      const rect = el.getBoundingClientRect();
      latest.current.setWorkspace((ws) => ({ ...ws, zoom }));
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.scrollLeft =
          ((g.left + g.x) * zoom) / g.zoom - ((a.x + b.x) / 2 - rect.left);
        el.scrollTop =
          ((g.top + g.y) * zoom) / g.zoom - ((a.y + b.y) / 2 - rect.top);
      });
    }
  }
  function end(event) {
    pointers.current.delete(event.pointerId);
    if (gesture.current) {
      blockClick.current = true;
      setTimeout(() => {
        blockClick.current = false;
      }, 0);
      gesture.current = null;
      setPanning(false);
    }
  }
  function fit() {
    const el = scrollRef.current;
    zoomTo((el.clientWidth - 96) / latest.current.workspace.viewport);
    requestAnimationFrame(() => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
  }
  return {
    panning,
    zoomTo,
    fit,
    handlers: {
      onClickCapture: (event) => {
        if (blockClick.current) {
          event.preventDefault();
          event.stopPropagation();
          blockClick.current = false;
        }
      },
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
    },
  };
}
