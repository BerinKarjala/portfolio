import {useCallback, useEffect, useRef, useState} from 'react';

export const ROTATION_INTERVAL = 12000;
export const SLIDE_DURATION = 1600;

export default function useCarouselRotation({blocked, count, advance}) {
  const [held, setHeld] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [moving, setMoving] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const current = useRef(null);
  current.current = {blocked, count, advance, reducedMotion};
  const direction = useRef(1);
  const [autoDirection, setAutoDirection] = useState(1);
  const remaining = useRef(ROTATION_INTERVAL);
  const pending = useRef(null);
  const motionTimer = useRef(null);
  const inMotion = useRef(false);
  const hold = useCallback(() => {pending.current = null; setHeld(true);}, []);
  const slide = useCallback(function start(delta) {
    const state = current.current;
    if (state.blocked || state.count < 2) return;
    if (inMotion.current) {pending.current = delta; return;}
    state.advance(delta);
    setCycle(value => value + 1);
    if (state.reducedMotion) return;
    inMotion.current = true;
    setMoving(true);
    motionTimer.current = setTimeout(() => {
      inMotion.current = false;
      setMoving(false);
      const next = pending.current;
      pending.current = null;
      if (next !== null) start(next);
    }, SLIDE_DURATION);
  }, []);
  const command = useCallback(delta => {
    if (current.current.blocked || current.current.count < 2) return;
    direction.current = delta < 0 ? -1 : 1;
    setAutoDirection(direction.current);
    remaining.current = ROTATION_INTERVAL;
    setHeld(false);
    setHovered(false);
    slide(direction.current);
  }, [slide]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(media?.matches ?? false);
    const visibility = () => setVisible(document.visibilityState !== 'hidden');
    const release = () => setPressed(false);
    media?.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      clearTimeout(motionTimer.current);
      media?.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, []);
  useEffect(() => {
    if (blocked || reducedMotion || !visible) {
      pending.current = null;
      clearTimeout(motionTimer.current);
      inMotion.current = false;
      setMoving(false);
    }
  }, [blocked, reducedMotion, visible]);
  const autoEnabled = !held && !blocked && visible && !reducedMotion && count > 1 && !moving;
  const rotating = autoEnabled && !hovered && !pressed;
  useEffect(() => { if (!autoEnabled) remaining.current = ROTATION_INTERVAL; }, [autoEnabled]);
  useEffect(() => {
    if (!rotating) return;
    const started = performance.now();
    let completed = false;
    const timer = setTimeout(() => {
      completed = true;
      remaining.current = ROTATION_INTERVAL;
      current.current.advance(direction.current);
      setCycle(value => value + 1);
    }, remaining.current);
    return () => {
      clearTimeout(timer);
      if (!completed) remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [rotating, cycle]);
  return {
    rotating, moving, reducedMotion, hold, command, autoDirection,
    autoMotion: autoEnabled ? (rotating ? 'running' : 'paused') : 'off',
    interactions: {
      onFocusCapture: event => {if (event.target.closest('[data-carousel-card]') && !event.target.closest('[data-rotation-control]')) hold();},
      onPointerOver: event => {if (event.pointerType !== 'touch' && event.target.closest('[data-carousel-stage]')) setHovered(true);},
      onPointerOut: event => {if (!event.relatedTarget?.closest?.('[data-carousel-stage]')) setHovered(false);},
      onPointerDown: event => {if (event.target.closest('[data-carousel-card]')) setPressed(true);},
    },
  };
}
