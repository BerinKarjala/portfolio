import { useEffect, useRef, useState } from 'react';
import { clampPoint, dragBounds, returnPoint } from './floatingMotion';

const THRESHOLD = 8;
const RETURN_DURATION = 8000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const change = () => setReduced(media.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  return reduced;
}

export default function useFloatingMoon({ element, onActivate, onCalendar, onInteraction }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const current = useRef(position);
  const session = useRef(null);
  const returning = useRef(null);
  const suppressClick = useRef(false);
  const lastPointer = useRef('');
  const reduced = useReducedMotion();
  const callbacks = useRef({ onActivate, onCalendar, onInteraction, reduced });
  callbacks.current = { onActivate, onCalendar, onInteraction, reduced };

  function place(point) {
    current.current = point;
    setPosition(point);
  }
  function limits() {
    const rect = element.current?.getBoundingClientRect();
    if (!rect) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    return dragBounds(rect, current.current, { width: window.innerWidth, height: window.innerHeight });
  }
  function stopReturn() {
    if (returning.current !== null) cancelAnimationFrame(returning.current);
    returning.current = null;
  }
  function startReturn() {
    stopReturn();
    const from = current.current;
    if (callbacks.current.reduced || (from.x === 0 && from.y === 0)) return;
    const start = performance.now();
    const step = now => {
      const elapsed = Math.max(0, now - start);
      place(clampPoint(returnPoint(from, elapsed, RETURN_DURATION), limits()));
      if (elapsed < RETURN_DURATION) returning.current = requestAnimationFrame(step);
      else returning.current = null;
    };
    returning.current = requestAnimationFrame(step);
  }
  function release(elementNode, pointerId) {
    try {
      if (elementNode.hasPointerCapture?.(pointerId)) elementNode.releasePointerCapture(pointerId);
    } catch { /* The browser may already have released capture. */ }
  }
  function endSession(shouldReturn = true) {
    const state = session.current;
    if (!state) return;
    session.current = null;
    suppressClick.current = true;
    for (const id of state.contacts.keys()) release(state.element, id);
    callbacks.current.onInteraction?.(false);
    if (state.dragged && shouldReturn) startReturn();
  }
  function move(event) {
    const state = session.current;
    const contact = state?.contacts.get(event.pointerId);
    if (!contact) return;
    const dx = event.clientX - contact.x;
    const dy = event.clientY - contact.y;
    if (Math.hypot(dx, dy) <= THRESHOLD && !state.dragged) return;
    if (state.multi) { state.rejected = true; return; }
    if (!state.dragged) {
      stopReturn();
      state.origin = { ...current.current };
      state.bounds = limits();
      state.dragged = true;
    }
    suppressClick.current = true;
    place(clampPoint({ x: state.origin.x + dx, y: state.origin.y + dy }, state.bounds));
  }

  useEffect(() => {
    const resize = () => {
      if (session.current) session.current.bounds = limits();
      place(clampPoint(current.current, limits()));
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') {
        endSession(false);
        stopReturn();
        if (!callbacks.current.reduced) place({ x: 0, y: 0 });
      }
    };
    const blur = () => endSession();
    window.addEventListener('resize', resize);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hidden);
      endSession(false);
      stopReturn();
    };
  }, []);
  useEffect(() => { if (reduced) stopReturn(); }, [reduced]);

  const handlers = {
    onPointerDown: event => {
      lastPointer.current = event.pointerType;
      if (event.button !== 0) { suppressClick.current = true; return; }
      let state = session.current;
      if (!state) {
        suppressClick.current = false;
        state = { element: event.currentTarget, contacts: new Map(), started: Date.now(), total: 0,
          initialType: event.pointerType, dragged: false, multi: false, rejected: false };
        session.current = state;
        callbacks.current.onInteraction?.(true);
      } else {
        state.multi = true;
        state.rejected ||= state.dragged || state.initialType !== 'touch' || event.pointerType !== 'touch';
        suppressClick.current = true;
      }
      if (state.contacts.has(event.pointerId)) { state.rejected = true; return; }
      state.total++;
      if (state.total > 2) state.rejected = true;
      state.contacts.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Optional in older browsers. */ }
    },
    onPointerMove: event => {
      if (event.pointerType === 'mouse' && event.buttons === 0 && session.current?.contacts.has(event.pointerId)) {
        endSession();
        return;
      }
      move(event);
    },
    onPointerUp: event => {
      const state = session.current;
      if (!state?.contacts.has(event.pointerId)) return;
      move(event);
      state.contacts.delete(event.pointerId);
      release(state.element, event.pointerId);
      if (state.contacts.size) return;
      session.current = null;
      callbacks.current.onInteraction?.(false);
      if (state.multi) {
        suppressClick.current = true;
        if (!state.rejected && state.total === 2 && Date.now() - state.started <= 600) callbacks.current.onCalendar?.();
        if (state.dragged) startReturn();
      } else if (state.dragged) {
        suppressClick.current = true;
        startReturn();
      }
    },
    onPointerCancel: () => endSession(),
    onLostPointerCapture: event => { if (session.current?.contacts.has(event.pointerId)) endSession(); },
    onContextMenu: event => {
      event.preventDefault();
      endSession();
      suppressClick.current = true;
      if (lastPointer.current !== 'touch') callbacks.current.onCalendar?.();
    },
    onKeyDown: event => {
      if (event.key === 'Escape') endSession();
      if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false;
    },
    onClick: event => {
      if (suppressClick.current || session.current) { event.preventDefault(); return; }
      callbacks.current.onActivate?.();
    },
  };
  return {
    position, reduced, handlers,
    moveBy: (x, y) => { stopReturn(); place(clampPoint({ x: current.current.x + x, y: current.current.y + y }, limits())); },
    finishMove: startReturn,
    reset: () => { endSession(false); stopReturn(); place({ x: 0, y: 0 }); },
  };
}
