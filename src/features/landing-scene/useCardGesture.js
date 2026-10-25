import {useEffect, useRef} from 'react';

export const CARD_GESTURES = {swipe: 60, dominance: 1.5, swipeMs: 500, tapMs: 300, tapDrift: 24, jitter: 8};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const interactive = target => !target.closest('[data-card-select]')
  && !!target.closest('a,button,input,select,textarea,[contenteditable],.writing-editor,.landing-calendar');
function eligible(event) {
  const target = event.target;
  if (target.closest('[data-card-select]')) return true;
  if (interactive(target)) return false;
  return target === event.currentTarget || !!target.closest('[data-card-gesture]');
}
export default function useCardGesture({select, expand, disabled = false}) {
  const actions = useRef(null);
  actions.current = {select, expand, disabled};
  const contact = useRef(null);
  const lastTap = useRef(null);
  const suppress = useRef(0);
  const touches = useRef(new Set());
  const cancel = () => {
    if (contact.current) suppress.current = Date.now() + 600;
    contact.current = null;
    lastTap.current = null;
  };
  useEffect(() => {
    const secondContact = event => {
      if (event.pointerType === 'touch') touches.current.add(event.pointerId);
      if (contact.current && event.pointerId !== contact.current.id) {contact.current.invalid = true; lastTap.current = null;}
    };
    const release = event => touches.current.delete(event.pointerId);
    const blur = () => {cancel(); touches.current.clear();};
    window.addEventListener('pointerdown', secondContact, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointerdown', secondContact, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', blur);
    };
  }, []);
  return {
    onPointerDown: event => {
      if (actions.current.disabled || !eligible(event) || event.button !== 0) return;
      if (contact.current) {contact.current.invalid = true; return;}
      contact.current = {id: event.pointerId, x: event.clientX, y: event.clientY, time: Date.now(), type: event.pointerType, invalid: touches.current.size > 1};
      if (event.pointerType === 'touch') {
        try {event.currentTarget.setPointerCapture?.(event.pointerId);} catch { /* No active pointer after cancellation or synthetic dispatch. */ }
      }
    },
    onPointerMove: event => {
      const start = contact.current;
      if (!start || start.id !== event.pointerId) return;
      start.maxDx = Math.max(start.maxDx || 0, Math.abs(start.x - event.clientX));
      if (distance(start, {x: event.clientX, y: event.clientY}) > CARD_GESTURES.jitter) start.dragged = true;
    },
    onPointerUp: event => {
      const start = contact.current;
      if (!start || start.id !== event.pointerId) return;
      contact.current = null;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      const end = {x: event.clientX, y: event.clientY, time: Date.now()};
      const dy = start.y - end.y, dx = Math.max(Math.abs(start.x - end.x), start.maxDx || 0);
      const elapsed = end.time - start.time;
      if (start.invalid || actions.current.disabled) {suppress.current = end.time + 600; lastTap.current = null; return;}
      if (start.type !== 'touch') return;
      suppress.current = end.time + 600;
      if (dy >= CARD_GESTURES.swipe && dy >= dx * CARD_GESTURES.dominance && elapsed <= CARD_GESTURES.swipeMs) {
        lastTap.current = null;
        event.preventDefault();
        actions.current.expand();
      } else if (!start.dragged && distance(start, end) <= CARD_GESTURES.jitter && elapsed <= CARD_GESTURES.tapMs) {
        const previous = lastTap.current;
        if (previous && end.time - previous.time <= CARD_GESTURES.tapMs && distance(previous, end) <= CARD_GESTURES.tapDrift) {
          lastTap.current = null;
          event.preventDefault();
          actions.current.expand();
        } else {lastTap.current = end; actions.current.select();}
      } else lastTap.current = null;
    },
    onPointerCancel: cancel,
    onLostPointerCapture: () => {if (contact.current) cancel();},
    onClickCapture: event => {
      if (interactive(event.target)) return;
      if (Date.now() < suppress.current) {event.preventDefault(); event.stopPropagation(); return;}
      if (!actions.current.disabled) actions.current.select();
    },
    onDoubleClick: event => {
      if (actions.current.disabled || !eligible(event) || Date.now() < suppress.current) return;
      event.preventDefault();
      actions.current.expand();
    },
  };
}
