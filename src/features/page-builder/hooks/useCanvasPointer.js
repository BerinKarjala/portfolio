import { useEffect, useRef, useState } from "react";
import {
  pointerGeometry,
  rectToGeometry,
  resizeGeometry,
  snapGeometry,
} from "../domain/geometry";
import { protectedSubtree } from "../domain/structure";

export default function useCanvasPointer({
  project,
  selection,
  select,
  readOnly,
  sendCommand,
  scrollRef,
  parentBox,
  elementNode,
  zoom,
}) {
  const latest = useRef(null);
  latest.current = { project, selection, select, readOnly, sendCommand, zoom };
  const current = useRef(null);
  const frame = useRef(0);
  const [draft, setDraft] = useState(null);
  function cancel() {
    const g = current.current;
    current.current = null;
    cancelAnimationFrame(frame.current);
    setDraft(null);
    if (g) {
      try {
        g.target.releasePointerCapture(g.pointerId);
      } catch {
        /* Capture may already have been cancelled by the browser. */
      }
    }
  }
  useEffect(() => {
    const blur = () => cancel();
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
      cancelAnimationFrame(frame.current);
    };
  }, []);
  useEffect(() => {
    if (readOnly) cancel();
  }, [readOnly]);
  function calculate() {
    const g = current.current;
    if (!g) return null;
    const parent = parentBox(g.parentId);
    const event = g.last;
    let geometry;
    if (g.kind === "move")
      geometry = pointerGeometry(
        g.start,
        { x: event.clientX, y: event.clientY },
        parent,
      );
    else
      geometry = resizeGeometry(
        g.start.geometry,
        {
          x: event.clientX - g.start.pointer.x,
          y: event.clientY - g.start.pointer.y,
        },
        parent,
        event.shiftKey || g.aspect,
      );
    const siblings = Object.values(latest.current.project.page.elements)
      .filter(
        (e) =>
          e.parentId === g.parentId &&
          e.positionMode === "absolute" &&
          !g.ids.includes(e.id),
      )
      .map((e) => e.geometry);
    const snapped = snapGeometry(geometry, parent, siblings, {
      disabled:
        event.altKey || (g.kind === "resize" && (event.shiftKey || g.aspect)),
      resize: g.kind === "resize",
    });
    const placements = {};
    if (g.kind === "move")
      for (const id of g.ids)
        placements[id] = {
          ...g.originals[id],
          x: g.originals[id].x + snapped.geometry.x - g.start.geometry.x,
          y: g.originals[id].y + snapped.geometry.y - g.start.geometry.y,
        };
    else placements[g.id] = snapped.geometry;
    const style = g.flow
      ? {
          width: `${Math.max(1, ((snapped.geometry.width / 100) * parent.width) / latest.current.zoom).toFixed(2)}px`,
          height: `${Math.max(1, ((snapped.geometry.height / 100) * parent.height) / latest.current.zoom).toFixed(2)}px`,
        }
      : null;
    const next = {
      placements,
      style,
      id: g.id,
      parentId: g.parentId,
      guides: snapped.guides,
    };
    setDraft(next);
    return next;
  }
  function tick() {
    const g = current.current;
    if (!g) return;
    const el = scrollRef.current;
    const rect = el.getBoundingClientRect();
    const p = g.last;
    const axisDelta = (value, start, end) =>
      value < start + 32 ? -10 : value > end - 32 ? 10 : 0;
    el.scrollLeft += axisDelta(p.clientX, rect.left, rect.right);
    el.scrollTop += axisDelta(p.clientY, rect.top, rect.bottom);
    calculate();
    frame.current = requestAnimationFrame(tick);
  }
  function start(event, id, kind) {
    const value = latest.current;
    if (
      event.button !== 0 ||
      value.readOnly ||
      protectedSubtree(value.project, id)
    )
      return;
    const e = value.project.page.elements[id];
    const parent = parentBox(e.parentId);
    if (!(parent.width && parent.height)) return;
    event.preventDefault();
    event.stopPropagation();
    const ids =
      kind === "move" && value.selection.includes(id)
        ? value.selection.filter((key) => {
            const node = value.project.page.elements[key];
            return (
              node.parentId === e.parentId && node.positionMode === "absolute"
            );
          })
        : [id];
    if (ids.some((key) => protectedSubtree(value.project, key))) return;
    if (!value.selection.includes(id)) value.select([id]);
    const geometry =
      e.positionMode === "absolute"
        ? e.geometry
        : rectToGeometry(elementNode(id).getBoundingClientRect(), parent);
    current.current = {
      id,
      ids,
      kind,
      parentId: e.parentId,
      flow: e.positionMode !== "absolute",
      aspect: e.geometry.aspectLocked,
      originals: Object.fromEntries(
        ids.map((key) => [key, value.project.page.elements[key].geometry]),
      ),
      target: event.currentTarget,
      pointerId: event.pointerId,
      last: {
        clientX: event.clientX,
        clientY: event.clientY,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      },
      start: {
        geometry,
        pointer: { x: event.clientX, y: event.clientY },
        parent,
      },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    frame.current = requestAnimationFrame(tick);
  }
  function move(event) {
    if (current.current?.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      current.current.last = {
        clientX: event.clientX,
        clientY: event.clientY,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      };
    }
  }
  function end(event) {
    const g = current.current;
    if (!g || event.pointerId !== g.pointerId) return;
    move(event);
    const result = calculate();
    const moved =
      Math.hypot(
        event.clientX - g.start.pointer.x,
        event.clientY - g.start.pointer.y,
      ) >= 1;
    cancel();
    if (!moved || !result) return;
    if (g.flow)
      latest.current.sendCommand({
        type: "PATCH",
        ids: [g.id],
        patch: { styles: { overrides: result.style } },
      });
    else
      latest.current.sendCommand({
        type: "GEOMETRY",
        ids: g.ids,
        placements: result.placements,
      });
  }
  return {
    draft,
    active: current,
    start,
    cancel,
    handlers: {
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: cancel,
      onLostPointerCapture: cancel,
    },
  };
}
