import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import MoonArtwork from './MoonArtwork';
import useFloatingMoon from './useFloatingMoon';
import { safeInsets } from './floatingMotion';
import './floating-moon.css';

const GAP = 8;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function FloatingMoon({ date, latitude, weather, reducedData, children, onCalendar, onInteraction }) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
  const element = useRef(null);
  const button = useRef(null);
  const panel = useRef(null);
  const detailsId = useId();
  const motion = useFloatingMoon({
    element,
    onActivate: () => { if (open) closeDetails(); else setOpen(true); },
    onCalendar: () => onCalendar?.(button.current),
    onInteraction,
  });
  const { position } = motion;
  function closeDetails(restoreFocus = false) {
    if (moving) motion.finishMove();
    setMoving(false);
    setOpen(false);
    if (restoreFocus) button.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) { setMoving(false); return undefined; }
    const dismiss = event => {
      if (!element.current?.contains(event.target)) closeDetails();
    };
    const key = event => {
      if (event.key === 'Escape' && !event.defaultPrevented && !event.target.closest?.('dialog[open]')) {
        event.preventDefault();
        closeDetails(true);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', key);
    };
  }, [open, moving]);

  const fitPanel = useCallback(() => {
    const rect = element.current?.getBoundingClientRect();
    if (!rect || !panel.current) return;
    const inset = safeInsets(element.current);
    const width = panel.current.offsetWidth || Math.min(288, window.innerWidth - inset.left - inset.right);
    const height = panel.current.offsetHeight || Math.min(260, window.innerHeight - inset.top - inset.bottom);
    const left = clamp(rect.left, inset.left, Math.max(inset.left, window.innerWidth - width - inset.right)) - rect.left;
    const below = rect.bottom + GAP;
    const above = rect.top - height - GAP;
    const screenTop = below + height <= window.innerHeight - inset.bottom
      ? below : above >= inset.top ? above : clamp(below, inset.top, Math.max(inset.top, window.innerHeight - height - inset.bottom));
    const top = screenTop - rect.top;
    setPanelPosition(previous => previous.left === left && previous.top === top ? previous : { left, top });
  }, []);
  useLayoutEffect(() => { if (open) fitPanel(); }, [fitPanel, open, position.x, position.y, moving]);
  useEffect(() => {
    if (!open || !panel.current) return undefined;
    const observer = window.ResizeObserver ? new ResizeObserver(fitPanel) : null;
    observer?.observe(panel.current);
    window.addEventListener('resize', fitPanel);
    return () => { observer?.disconnect(); window.removeEventListener('resize', fitPanel); };
  }, [open, fitPanel]);

  return <div ref={element} data-floating-moon className="floating-moon"
    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
    <button ref={button} type="button" className="floating-moon__button" aria-label="Moon and weather"
      aria-expanded={open} aria-controls={open ? detailsId : undefined} {...motion.handlers}>
      <MoonArtwork date={date} latitude={latitude} weather={weather} reducedData={reducedData} />
    </button>
    {open && <section ref={panel} id={detailsId} className="floating-moon__panel" aria-label="Moon and weather details"
      style={{ left: panelPosition.left, top: panelPosition.top }}>
      <button className="floating-moon__close" type="button" aria-label="Close moon details"
        onClick={() => closeDetails(true)}>×</button>
      {children}
      <div className="floating-moon__actions">
        <button type="button" onClick={() => onCalendar?.(button.current)}>Calendar</button>
        <button type="button" aria-expanded={moving} onClick={() => {
          if (moving) motion.finishMove();
          setMoving(value => !value);
        }}>{moving ? 'Done moving' : 'Move moon'}</button>
        <button type="button" onClick={motion.reset}>Return moon to starting position</button>
      </div>
      {moving && <div className="floating-moon__directions" aria-label="Move moon">
        <button type="button" aria-label="Move moon left" onClick={() => motion.moveBy(-40, 0)}>←</button>
        <button type="button" aria-label="Move moon up" onClick={() => motion.moveBy(0, -40)}>↑</button>
        <button type="button" aria-label="Move moon down" onClick={() => motion.moveBy(0, 40)}>↓</button>
        <button type="button" aria-label="Move moon right" onClick={() => motion.moveBy(40, 0)}>→</button>
      </div>}
    </section>}
  </div>;
}
