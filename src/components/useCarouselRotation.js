import { useEffect, useState } from 'react';

export const ROTATION_INTERVAL = 8000;

export default function useCarouselRotation({ blocked, count, advance }) {
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(media?.matches ?? false);
    const visibility = () => setVisible(document.visibilityState !== 'hidden');
    media?.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media?.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (!pressed) return;
    const release = () => setPressed(false);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, [pressed]);
  const enabled = !paused && !reducedMotion;
  const rotating = enabled && !blocked && !hovered && !pressed && visible;
  useEffect(() => {
    if (!rotating || count < 2) return;
    const timer = setInterval(advance, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [rotating, count, advance]);
  return {
    enabled,
    rotating,
    reducedMotion,
    toggle: () => setPaused(value => !value),
    interactions: {
      onFocusCapture: event => {
        // The explicit rotation control can start rotation without moving focus.
        if (!event.target.closest('[data-rotation-control]')) setPaused(true);
      },
      onPointerEnter: event => { if (event.pointerType !== 'touch') setHovered(true); },
      onPointerLeave: () => setHovered(false),
      onPointerDown: () => setPressed(true),
    },
  };
}
