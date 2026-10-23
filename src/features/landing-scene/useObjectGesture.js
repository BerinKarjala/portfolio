import { useEffect, useRef, useState } from 'react';
const THRESHOLD = 8;
const clamp = (value, min, max) => min > max ? min : Math.min(max, Math.max(min, value));

export default function useObjectGesture({ primary, secondary, bounds, onInteraction }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const current = useRef(position);
  current.current = position;
  const session = useRef(null);
  const suppressClick = useRef(false);
  const lastInput = useRef('');
  const callbacks = useRef({ primary, secondary, bounds, onInteraction });
  callbacks.current = { primary, secondary, bounds, onInteraction };
  function release(element, id) {
    try { if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id); } catch { /* Contact may already be gone. */ }
  }
  function cancel(restore = true) {
    const state = session.current;
    if (!state) return;
    session.current = null;
    suppressClick.current = true;
    for (const id of state.contacts.keys()) release(state.element, id);
    if (restore) setPosition(state.origin);
    callbacks.current.onInteraction?.(false);
  }
  useEffect(() => {
    const blur = () => cancel();
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('blur', blur); cancel(false); };
  }, []);
  function move(event) {
    const state = session.current;
    const contact = state?.contacts.get(event.pointerId);
    if (!contact) return;
    const dx = event.clientX - contact.x, dy = event.clientY - contact.y;
    if (Math.hypot(dx, dy) > THRESHOLD || state.dragged) {
      if (state.multi) state.rejected = true;
      else {
        state.dragged = true;
        suppressClick.current = true;
        setPosition({ x: clamp(state.origin.x + dx, state.bounds.minX, state.bounds.maxX), y: clamp(state.origin.y + dy, state.bounds.minY, state.bounds.maxY) });
      }
    }
  }
  return {
    position,
    moveBy: (x, y) => {
      const limits = callbacks.current.bounds();
      setPosition(previous => ({ x: clamp(previous.x + x, limits.minX, limits.maxX), y: clamp(previous.y + y, limits.minY, limits.maxY) }));
    },
    fit: () => {
      const limits = callbacks.current.bounds();
      if (session.current) session.current.bounds = limits;
      const previous = current.current;
      const next = { x: clamp(previous.x, limits.minX, limits.maxX), y: clamp(previous.y, limits.minY, limits.maxY) };
      if (next.x !== previous.x || next.y !== previous.y) setPosition(next);
    },
    reset: () => { cancel(); setPosition({ x: 0, y: 0 }); },
    handlers: {
      onPointerDown: event => {
        lastInput.current = event.pointerType;
        if (event.button !== 0) { suppressClick.current = true; return; }
        let state = session.current;
        if (!state) {
          suppressClick.current = false;
          state = { contacts: new Map(), origin: current.current, bounds: callbacks.current.bounds(), started: Date.now(), dragged: false, multi: false, rejected: false, total: 0, initialType: event.pointerType, element: event.currentTarget };
          session.current = state;
          callbacks.current.onInteraction?.(true);
        } else {
          state.multi = true;
          state.rejected ||= state.dragged || state.initialType !== 'touch' || event.pointerType !== 'touch';
          suppressClick.current = true;
          setPosition(state.origin);
        }
        if (state.contacts.has(event.pointerId)) { state.rejected = true; return; }
        state.total++;
        if (state.total > 2) state.rejected = true;
        state.contacts.set(event.pointerId, { x: event.clientX, y: event.clientY });
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture is optional in older engines. */ }
      },
      onPointerMove: move,
      onPointerUp: event => {
        const state = session.current;
        if (!state?.contacts.has(event.pointerId)) return;
        if (!state.multi) state.bounds = callbacks.current.bounds();
        move(event);
        state.contacts.delete(event.pointerId);
        release(state.element, event.pointerId);
        if (state.contacts.size) return;
        session.current = null;
        callbacks.current.onInteraction?.(false);
        if (state.multi) {
          suppressClick.current = true;
          if (!state.rejected && state.total === 2 && Date.now() - state.started <= 600) callbacks.current.secondary?.(event);
        } else if (state.dragged) suppressClick.current = true;
      },
      onPointerCancel: () => cancel(),
      onLostPointerCapture: event => { if (session.current?.contacts.has(event.pointerId)) cancel(); },
      onClick: event => {
        if (suppressClick.current || session.current) { event.preventDefault(); return; }
        callbacks.current.primary?.(event);
      },
      onContextMenu: event => {
        event.preventDefault();
        cancel();
        suppressClick.current = true;
        // Native touch long-press is not the requested two-finger tap.
        if (lastInput.current !== 'touch') callbacks.current.secondary?.(event);
      },
      onKeyDown: event => {
        if (event.key === 'Escape') cancel();
        if (event.key === 'Enter' || event.key === ' ') suppressClick.current = false;
      },
    },
  };
}
