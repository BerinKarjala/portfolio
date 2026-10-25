import { useEffect, useId, useRef } from 'react';
import quill from '../../assets/landing/ivory-quill.webp';
import inkwell from '../../assets/landing/cobalt-inkwell.webp';
import { useScene } from './SceneContext';
import useObjectGesture from './useObjectGesture';

export default function WritingSet({ deskRef }) {
  const { openEditor, setWritingInteracting, editorLauncher } = useScene();
  const element = useRef(null);
  const description = useId();
  const gesture = useObjectGesture({
    primary: event => openEditor(event.currentTarget),
    onInteraction: active => setWritingInteracting(active || document.activeElement === element.current),
    bounds: () => {
      const desk = deskRef.current?.getBoundingClientRect();
      const object = element.current?.getBoundingClientRect();
      if (!desk || !object) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      // Keep the inkwell within the inner tabletop; the feather rises above it.
      const { x, y } = gesture.position;
      return {
        minX: x + desk.left + desk.width * .2 - object.left,
        maxX: x + desk.right - desk.width * .2 - object.right,
        minY: y + desk.top + desk.height * .35 - object.bottom,
        maxY: y + desk.top + desk.height * .85 - object.bottom,
      };
    },
  });
  const reset = useRef(gesture.reset);
  reset.current = gesture.reset;
  useEffect(() => {
    const resize = () => reset.current();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); setWritingInteracting(false); };
  }, [setWritingInteracting]);
  const { onContextMenu: unusedContextMenu, ...handlers } = gesture.handlers;
  const moved = gesture.position.x !== 0 || gesture.position.y !== 0;
  return <>
    <button ref={node => {element.current = node; editorLauncher.current = node;}} className="landing-writing-set" aria-label="Open text editor with the quill" aria-describedby={description}
      style={{ transform: `translateX(-50%) translate(${gesture.position.x}px, ${gesture.position.y}px)` }} {...handlers}
      onFocus={() => setWritingInteracting(true)} onBlur={() => setWritingInteracting(false)}
      onKeyDown={event => {
        handlers.onKeyDown(event);
        const direction = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
        if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); gesture.moveBy(...direction); }
      }}>
      <img className="landing-quill" src={quill} alt="" width="400" height="600" draggable="false" />
      <img className="landing-inkwell" src={inkwell} alt="" width="240" height="240" draggable="false" />
    </button>
    <span id={description} className="sr-only">Activate to write. Drag to move the feather and inkwell together, or use the arrow keys while focused.</span>
    {moved && <button className="landing-writing-reset" onClick={gesture.reset}>Reset writing set position</button>}
  </>;
}
