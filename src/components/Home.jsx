import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {flushSync} from 'react-dom';
import sanityClient from '../client.js';
import { cancelIdle, runWhenIdle } from '../utils/idleCallback';
import { StudioGalleryEntry, useStudioOpen } from '../features/css-studio/Studio';
import { includePageBuilder } from '../features/page-builder/gallery';
import Seo, { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL_LINKS } from './Seo';
import sudoku from '../assets/sudoku-solver-preview.svg';
import mines from '../assets/minesweeper-preview.svg';
import desk from '../assets/landing/walnut-desk.webp';
import WritingSet from '../features/landing-scene/WritingSet';
import TextEditor from '../features/landing-scene/TextEditor';
import './landing-scene.css';
import useCarouselRotation, {SLIDE_DURATION} from './useCarouselRotation';
import CardPresentation from '../features/landing-scene/CardPresentation';
import useCardGesture from '../features/landing-scene/useCardGesture';
import Calendar from './Calendar';
import { useScene } from '../features/landing-scene/SceneContext';

const bundled = [
  { name: 'Sudoku Solver', link: '/projects/SudokuSolver', description: 'Solve Sudoku puzzles with clarity.', thumbnail: { asset: { url: sudoku } } },
  { name: 'Minesweeper', link: '/projects/Minesweeper', description: 'A classic mine-finding puzzle.', thumbnail: { asset: { url: mines } } },
];
function safeProject(project) {
  if (typeof project?.name !== 'string' || typeof project.link !== 'string') return false;
  try { return ['https:', 'http:'].includes(new URL(project.link, SITE_URL).protocol); }
  catch { return false; }
}
function localRoute(link, route) {
  const url = new URL(link, SITE_URL);
  return url.origin === SITE_URL && url.pathname.replace(/\/$/, '').toLowerCase() === route.toLowerCase();
}
function gallery(data) {
  const projects = includePageBuilder(data.filter(safeProject));
  // Normalize owned routes so trailing slashes and absolute CMS links cannot
  // create duplicate application cards or lose the selected project's preview.
  const applications = bundled.map(fallback => {
    const cms = projects.find(project => localRoute(project.link, fallback.link));
    return { ...fallback, ...cms, link: fallback.link, thumbnail: fallback.thumbnail };
  });
  return [...applications, ...projects.filter(project => !bundled.some(fallback => localRoute(project.link, fallback.link)))];
}
function SceneCard({cardKey, position, active, title, blocked, expanded, onSelect, onExpand, onExit, children}) {
  const element = useRef(null);
  const visible = ['center', 'left', 'right'].includes(position);
  const select = () => {onSelect(cardKey); element.current?.focus({preventScroll: true});};
  const gesture = useCardGesture({select, expand: () => onExpand(cardKey), disabled: (!active && blocked) || expanded || !visible});
  return <div ref={element} className={`landing-card landing-card--${position}`} data-carousel-card data-card-key={cardKey}
    tabIndex={-1} aria-hidden={!visible ? true : undefined} inert={!visible ? true : undefined} {...gesture}>
    <div inert={!active ? true : undefined} aria-hidden={!active ? true : undefined}>
      <CardPresentation title={title} expanded={expanded} onExpand={() => onExpand(cardKey)} onExit={onExit}>{children}</CardPresentation>
    </div>
    {!active && visible && !blocked && <button className="landing-select-preview" data-card-select data-card-gesture aria-label={`Select ${title}`} onClick={select}/>}
  </div>;
}
export default function Home() {
  const [projects, setProjects] = useState(() => gallery([]));
  const [selectedKey, setSelectedKey] = useState('/projects/SudokuSolver');
  const [status, setStatus] = useState('Loading latest project content…');
  useEffect(() => {
    let active = true;
    const idle = runWhenIdle(() => {
      sanityClient.fetch('*[_type == "project"]{name,description,link,thumbnail{asset->{url},alt}}')
        .then(data => { if (active) { setProjects(gallery(Array.isArray(data) ? data : [])); setStatus(''); } })
        .catch(() => { if (active) setStatus('Latest project content is unavailable. Bundled projects remain available.'); });
    });
    return () => { active = false; cancelIdle(idle); };
  }, []);
  const { utility, closeUtility, interacting, timeZone } = useScene();
  const deskRef = useRef(null);
  const sceneRef = useRef(null);
  const utilityHeading = useRef(null);
  const selectedRef = useRef(selectedKey);
  const [travel, setTravel] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const keys = useMemo(() => [...projects.map(project => project.link), 'studio'], [projects]);
  const count = keys.length;
  const selected = Math.max(0, keys.indexOf(selectedKey));
  const move = useCallback(delta => {
    // Prepare invisible entrants on the correct side before changing slots.
    // This also makes a reversed command an adjacent slide rather than a sweep.
    sceneRef.current?.style.setProperty('--landing-hidden-x', delta < 0 ? '-230%' : '130%');
    void sceneRef.current?.offsetWidth;
    const from = selectedRef.current;
    const next = keys[(Math.max(0, keys.indexOf(from)) + delta + keys.length) % keys.length];
    setTravel({from, direction: delta});
    selectedRef.current = next;
    setSelectedKey(next);
  }, [keys]);
  const studioOpen = useStudioOpen();
  const utilityOpen = studioOpen || utility !== null;
  const rotation = useCarouselRotation({ blocked: utilityOpen || interacting || expanded !== null, count, advance: move });
  useEffect(() => {if (utility) {rotation.hold(); utilityHeading.current?.focus();}}, [utility, rotation.hold]);
  useEffect(() => {if (expanded && expanded.utility !== utility) setExpanded(null);}, [utility, expanded]);
  useLayoutEffect(() => {
    const header = document.querySelector('header');
    const measure = () => sceneRef.current?.style.setProperty('--landing-header-height', `${header?.getBoundingClientRect().height || 0}px`);
    measure();
    const observer = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (header) observer?.observe(header);
    window.addEventListener('resize', measure);
    return () => {observer?.disconnect(); window.removeEventListener('resize', measure);};
  }, []);
  const selectCard = key => {
    if (utilityOpen || expanded) return;
    rotation.hold();
    setTravel(null);
    selectedRef.current = key;
    setSelectedKey(key);
  };
  const expandCard = key => {
    if ((studioOpen || utility) && key !== selectedKey) return;
    rotation.hold();
    selectedRef.current = key;
    setSelectedKey(key);
    setExpanded({key, utility});
  };
  const closeTool = () => {if (expanded) flushSync(() => setExpanded(null)); closeUtility();};
  return <>
    <Seo title={SITE_NAME} description={DEFAULT_DESCRIPTION} path="/" jsonLd={{ '@context': 'https://schema.org', '@type': 'Person', name: SITE_NAME, url: SITE_URL, sameAs: SOCIAL_LINKS }} />
    <main ref={sceneRef} className="landing-scene forest-bg" style={{'--landing-slide-duration': `${SLIDE_DURATION}ms`}}>
      <h1 className="sr-only">Berin Karjala</h1>
      <section className="landing-gallery" aria-label="Project gallery" aria-roledescription="carousel" {...rotation.interactions}>
        <div className={`landing-stage-frame${utility ? ' landing-stage-frame--utility' : ''}`}>
        <div className="landing-stage" data-moving={rotation.moving && !rotation.reducedMotion ? 'true' : 'false'}>
          {Array.from({ length: count }, (_, index) => {
            const offset = (index - selected + count) % count;
            let position = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === count - 1 ? 'left' : 'hidden';
            // The outgoing edge continues off its own side, never across the
            // center. It is repositioned invisibly only after the step settles.
            if (position === 'hidden' && rotation.moving && travel) {
              const previousOffset = (index - keys.indexOf(travel.from) + count) % count;
              if (travel.direction > 0 && previousOffset === count - 1) position = 'exit-left';
              if (travel.direction < 0 && previousOffset === 1) position = 'exit-right';
            }
            const project = projects[index];
            const key = project?.link || 'studio';
            const title = offset === 0 && utility ? utility === 'calendar' ? 'Calendar' : 'Text Editor' : project?.name || 'CSS Theme Studio';
            return <SceneCard key={key} cardKey={key} position={position} active={offset === 0} title={title}
              blocked={utilityOpen} expanded={expanded?.key === key && expanded.utility === utility}
              onSelect={selectCard} onExpand={expandCard} onExit={() => setExpanded(null)}>
              {offset === 0 && utility ? <section aria-label={utility === 'calendar' ? 'Calendar utility' : 'Text editor utility'} className="landing-utility">
                <div className="landing-utility-heading" data-card-gesture><h2 ref={utilityHeading} tabIndex={-1}>{utility === 'calendar' ? 'Calendar' : 'Text Editor'}</h2><button onClick={closeTool} aria-label={utility === 'calendar' ? 'Close calendar' : 'Close text editor'}>×</button></div>
                {utility === 'calendar' ? <Calendar timeZone={timeZone} /> : <TextEditor onClose={closeTool} />}
              </section> : project ? <article>
                <div className="landing-preview" data-card-gesture>{project.thumbnail?.asset?.url ? <img src={project.thumbnail.asset.url} alt={project.thumbnail.alt || `${project.name} preview`} width="640" height="360" loading={offset === 0 ? 'eager' : 'lazy'} decoding="async" /> : <p>Preview unavailable</p>}</div>
                <h2 data-card-gesture>{project.name}</h2>
                <p>{project.description || 'Explore this portfolio project.'}</p>
                <a href={project.link} onClick={() => {if (expanded) flushSync(() => setExpanded(null));}}>Open {project.name} <span aria-hidden="true">↗</span></a>
              </article> : <div data-card-gesture onClickCapture={event => {if (expanded && event.target.closest('button')) flushSync(() => setExpanded(null));}}><StudioGalleryEntry headingAs="h2" /></div>}
            </SceneCard>;
          })}
        </div>
        <div className="landing-controls">
          <button data-rotation-control disabled={utilityOpen} aria-label="Previous project" onClick={() => rotation.command(-1)}>←</button>
          <button data-rotation-control disabled={utilityOpen} aria-label="Next project" onClick={() => rotation.command(1)}>→</button>
        </div>
        <div className="landing-gallery-status" aria-live={rotation.rotating ? 'off' : 'polite'} aria-atomic="true">
          <span className="sr-only">Project {selected + 1} of {count}.</span>
          {status && <p className="landing-status" role="status">{status}</p>}
        </div>
        </div>
        <div className="landing-desk" ref={deskRef}>
          <img src={desk} alt="" width="2172" height="724" decoding="async" />
          <WritingSet deskRef={deskRef} />
        </div>
      </section>
    </main>
  </>;
}
