import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import quill from '../../assets/landing/ivory-quill.webp';
import inkwell from '../../assets/landing/cobalt-inkwell.webp';
import { useScene } from './SceneContext';
import useObjectGesture from './useObjectGesture';

const RETURN_DURATION = 1200;
const TAP_WINDOW = 350;

export default function WritingSet({ deskRef, onSteer = () => {} }) {
  const { openEditor, editorLauncher } = useScene();
  const element = useRef(null);
  const rendered = useRef({x: 0, y: 0});
  const returning = useRef(null);
  const resumeReturn = useRef(null);
  const lastTap = useRef(null);
  const lastTouchOpen = useRef(-Infinity);
  const description = useId();
  const gesture = useObjectGesture({
    // Keyboard and assistive-technology activation remains a single action.
    primary: event => {if (event.detail === 0) openEditor(event.currentTarget);},
    onDrag: point => {
      lastTap.current = null;
      const rect = element.current?.getBoundingClientRect();
      if (!rect) return;
      const center = rect.left + rect.width / 2 - rendered.current.x + point.x;
      const halfRange = Math.max(1, (window.innerWidth - rect.width) / 2);
      onSteer(Math.max(-1, Math.min(1, (center - window.innerWidth / 2) / halfRange)));
    },
    onDragEnd: point => {onSteer(null); returnHome(point);},
    onTap: (event, target, point) => {
      // Keep the target steady for the second tap, then resume an interrupted
      // return if the visitor does not activate it.
      if (point.x || point.y) resumeReturn.current = setTimeout(() => {resumeReturn.current = null; returnHome(point);}, TAP_WINDOW + 50);
      if (event.pointerType !== 'touch' || !target?.closest?.('.landing-inkwell')) return;
      const tap = {time: Date.now(), x: event.clientX, y: event.clientY};
      const previous = lastTap.current;
      if (previous && tap.time - previous.time <= TAP_WINDOW && Math.hypot(tap.x - previous.x, tap.y - previous.y) <= 32) {
        lastTap.current = null;
        lastTouchOpen.current = tap.time;
        openEditor(element.current);
      } else lastTap.current = tap;
    },
    bounds: () => {
      const desk = deskRef.current?.getBoundingClientRect();
      const object = element.current?.getBoundingClientRect();
      if (!desk || !object) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      // Horizontal travel reaches the screen edges; vertical movement stays
      // within the tabletop. Use the committed position for DOM measurements.
      const {x, y} = rendered.current;
      return {
        minX: x - object.left,
        maxX: x + window.innerWidth - object.right,
        minY: y + desk.top + desk.height * .35 - object.bottom,
        maxY: y + desk.top + desk.height * .85 - object.bottom,
      };
    },
  });
  useLayoutEffect(() => {rendered.current = gesture.position;}, [gesture.position]);

  function stopReturn() {
    if (returning.current !== null) cancelAnimationFrame(returning.current);
    if (resumeReturn.current !== null) clearTimeout(resumeReturn.current);
    returning.current = null;
    resumeReturn.current = null;
  }
  function returnHome(from) {
    stopReturn();
    if (!from.x && !from.y) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {gesture.moveTo({x: 0, y: 0}); return;}
    const started = performance.now();
    const step = now => {
      const t = Math.max(0, Math.min(1, (now - started) / RETURN_DURATION));
      const remaining = (1 - t) ** 2;
      gesture.moveTo({x: from.x * remaining, y: from.y * remaining});
      if (t < 1) returning.current = requestAnimationFrame(step);
      else returning.current = null;
    };
    returning.current = requestAnimationFrame(step);
  }
  const latest = useRef({reset: gesture.reset, onSteer});
  latest.current = {reset: gesture.reset, onSteer};
  useEffect(() => {
    const resize = () => {stopReturn(); latest.current.onSteer(null); latest.current.reset();};
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => {if (media?.matches && (returning.current !== null || resumeReturn.current !== null)) {stopReturn(); latest.current.onSteer(null); latest.current.reset();}};
    window.addEventListener('resize', resize);
    media?.addEventListener?.('change', motion);
    return () => {window.removeEventListener('resize', resize); media?.removeEventListener?.('change', motion); stopReturn();};
  }, []);
  const { onContextMenu: unusedContextMenu, ...handlers } = gesture.handlers;
  const moved = gesture.position.x !== 0 || gesture.position.y !== 0;
  return <>
    <button ref={node => {element.current = node; editorLauncher.current = node;}} className="landing-writing-set" aria-label="Open text editor with the inkwell" aria-describedby={description} title="Drag to steer the projects. Double-click the inkwell to write."
      style={{ transform: `translateX(-50%) translate(${gesture.position.x}px, ${gesture.position.y}px)` }} {...handlers}
      onPointerDown={event => {stopReturn(); handlers.onPointerDown(event);}}
      onDoubleClick={event => {
        if (Date.now() - lastTouchOpen.current > 600 && gesture.clickAllowed() && (event.target === event.currentTarget || event.target.closest?.('.landing-inkwell'))) openEditor(event.currentTarget);
      }}
      onKeyDown={event => {
        handlers.onKeyDown(event);
        const direction = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
        if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) {event.preventDefault(); stopReturn(); gesture.moveBy(...direction);}
      }}
      onKeyUp={event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {onSteer(null); returnHome(gesture.currentPosition());}
      }}
      onBlur={() => {onSteer(null); returnHome(gesture.currentPosition());}}>
      <img className="landing-quill" src={quill} alt="" width="400" height="600" draggable="false" />
      <img className="landing-inkwell" src={inkwell} alt="" width="240" height="240" draggable="false" />
    </button>
    <span id={description} className="sr-only">Double-click or double-tap the inkwell to write. Drag the writing set left or right to steer the project carousel. Use arrow keys to steer and Enter or Space to write.</span>
    {moved && <button className="landing-writing-reset" onClick={() => {stopReturn(); onSteer(null); gesture.reset();}}>Reset writing set position</button>}
  </>;
}
