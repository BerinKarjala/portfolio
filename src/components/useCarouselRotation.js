import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';

export const ROTATION_INTERVAL = 12000;
export const SLIDE_DURATION = 1600;

export default function useCarouselRotation({blocked, count, advance, steering = null}) {
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
  const stageRef = useRef(null);
  // Signed progress preserves the current physical position when steering
  // reverses: the carousel retraces its path before reaching the other card.
  const progress = useRef(0);
  const pending = useRef(null);
  const motionTimer = useRef(null);
  const inMotion = useRef(false);
  const pointerDown = useRef(false);
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
    progress.current = 0;
    setHeld(false);
    setHovered(false);
    slide(direction.current);
  }, [slide]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(media?.matches ?? false);
    const visibility = () => setVisible(document.visibilityState !== 'hidden');
    const release = () => {pointerDown.current = false; setPressed(false);};
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
  const steeringActive = steering !== null && Number.isFinite(steering);
  const amount = steeringActive ? Math.max(-1, Math.min(1, steering)) : 0;
  // Positive steering moves cards visually right; the previous-project slot
  // is the rightward direction in the carousel's indexing convention.
  const flowDirection = steeringActive && amount !== 0 ? -Math.sign(amount) : direction.current;
  const speed = steeringActive ? 1 + 3 * Math.abs(amount) : 1;
  const autoEnabled = (!held || steeringActive) && !blocked && visible && !reducedMotion && count > 1 && !moving;
  const rotating = autoEnabled && (steeringActive || (!hovered && !pressed));
  const paint = useCallback(value => {
    const node = stageRef.current;
    if (!node) return;
    const fraction = Math.min(1, Math.abs(value));
    node.style.setProperty('--landing-shift', `${fraction * 110}%`);
    node.style.setProperty('--landing-fraction', String(fraction));
    node.dataset.autoDirection = value < 0 ? 'previous' : 'next';
  }, []);
  useEffect(() => {
    if (steeringActive) {
      setHeld(false);
      if (amount !== 0) direction.current = -Math.sign(amount);
    }
  }, [steeringActive, amount]);
  useLayoutEffect(() => { paint(progress.current); }, [cycle, paint]);
  useEffect(() => { if (!autoEnabled) {progress.current = 0; paint(0);} }, [autoEnabled, paint]);
  useEffect(() => {
    if (!rotating) return;
    const started = performance.now();
    const from = progress.current;
    const rate = flowDirection * speed / ROTATION_INTERVAL;
    const target = flowDirection;
    let completed = false;
    let frame = null;
    const positionAt = now => Math.max(-1, Math.min(1, from + Math.max(0, now - started) * rate));
    const draw = now => {paint(positionAt(now)); frame = requestAnimationFrame(draw);};
    frame = requestAnimationFrame(draw);
    const timer = setTimeout(() => {
      completed = true;
      progress.current = 0;
      current.current.advance(target);
      setCycle(value => value + 1);
    }, Math.max(0, (target - from) / rate));
    return () => {
      clearTimeout(timer);
      if (frame !== null) cancelAnimationFrame(frame);
      if (!completed) {progress.current = positionAt(performance.now()); paint(progress.current);}
    };
  }, [rotating, cycle, flowDirection, speed, paint]);
  return {
    rotating, moving, reducedMotion, hold, command, stageRef,
    autoMotion: autoEnabled ? (rotating ? 'running' : 'paused') : 'off',
    interactions: {
      onFocusCapture: event => {if (!pointerDown.current && event.target.closest('[data-carousel-card]') && !event.target.closest('[data-rotation-control]')) hold();},
      onPointerOver: event => {if (event.pointerType !== 'touch' && event.target.closest('[data-carousel-stage]')) setHovered(true);},
      onPointerOut: event => {if (!event.relatedTarget?.closest?.('[data-carousel-stage]')) setHovered(false);},
      onPointerDown: event => {if (event.target.closest('[data-carousel-card]')) {pointerDown.current = true; setPressed(true);}},
    },
  };
}
