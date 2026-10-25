import {useLayoutEffect, useRef} from 'react';

// Native top-layer modality preserves the same stateful DOM and inherited theme.
export default function CardPresentation({expanded, title, onExpand, onExit, children}) {
  const dialog = useRef(null);
  const expandButton = useRef(null);
  const exitButton = useRef(null);
  const restore = useRef(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!expanded) {
      if (restore.current) {
        element.scrollTop = restore.current.contentScroll;
        expandButton.current?.focus({preventScroll: true});
        window.scrollTo(restore.current.position);
        restore.current = null;
      }
      return;
    }
    const overflow = document.body.style.overflow;
    const position = {left: window.scrollX, top: window.scrollY};
    const contentScroll = element.scrollTop;
    element.removeAttribute('open');
    element.showModal();
    document.body.style.overflow = 'hidden';
    exitButton.current?.focus({preventScroll: true});
    return () => {
      element.close();
      element.setAttribute('open', '');
      document.body.style.overflow = overflow;
      // Focus only in the next setup, after React has unhidden Expand. A layout
      // cleanup may run while it is still hidden (notably in Firefox).
      restore.current = {position, contentScroll};
    };
  }, [expanded]);
  const exit = () => {dialog.current.close(); onExit();};
  return <dialog ref={dialog} open={expanded ? undefined : true}
    className={`landing-card-surface${expanded ? ' landing-card-surface--expanded' : ''}`}
    aria-label={title} aria-modal={expanded ? true : undefined}
    onCancel={event => {event.preventDefault(); exit();}}
    onKeyDownCapture={event => {
      if (expanded && event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); exit();}
    }}
    onKeyDown={event => {
      if (!expanded) return;
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const controls = [...dialog.current.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"],[contenteditable="true"]')]
          .filter(node => !node.disabled && !node.closest('[inert]') && !node.hidden && node.tabIndex >= 0
            && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
      }
    }}>
    <div className="landing-card-chrome" data-card-gesture>
      <button ref={expandButton} hidden={expanded} className="landing-expand" onClick={onExpand} aria-label={`Expand ${title}`}>Expand <span aria-hidden="true">⤢</span></button>
      <button ref={exitButton} hidden={!expanded} className="landing-exit" onClick={exit} aria-label="Exit full screen">Exit full screen <span aria-hidden="true">×</span></button>
    </div>
    {children}
  </dialog>;
}
