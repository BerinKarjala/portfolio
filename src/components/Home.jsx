import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import useCarouselRotation from './useCarouselRotation';
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
  const { utility, openCalendar, openEditor, closeUtility, interacting, timeZone, calendarLauncher, editorLauncher } = useScene();
  const deskRef = useRef(null);
  const utilityHeading = useRef(null);
  useEffect(() => { if (utility) utilityHeading.current?.focus(); }, [utility]);
  const keys = useMemo(() => [...projects.map(project => project.link), 'studio'], [projects]);
  const count = keys.length;
  const selected = Math.max(0, keys.indexOf(selectedKey));
  const move = useCallback(delta => setSelectedKey(key => keys[(Math.max(0, keys.indexOf(key)) + delta + keys.length) % keys.length]), [keys]);
  const studioOpen = useStudioOpen();
  const utilityOpen = studioOpen || utility !== null;
  const advance = useCallback(() => move(1), [move]);
  const rotation = useCarouselRotation({ blocked: utilityOpen || interacting, count, advance });
  return <>
    <Seo title={SITE_NAME} description={DEFAULT_DESCRIPTION} path="/" jsonLd={{ '@context': 'https://schema.org', '@type': 'Person', name: SITE_NAME, url: SITE_URL, sameAs: SOCIAL_LINKS }} />
    <main className="landing-scene forest-bg">
      <h1 className="sr-only">Berin Karjala</h1>
      <section className="landing-gallery" aria-label="Project gallery" aria-roledescription="carousel" {...rotation.interactions}>
        <div className="landing-stage">
          {Array.from({ length: count }, (_, index) => {
            const offset = (index - selected + count) % count;
            const position = offset === 0 ? 'center' : offset === 1 ? 'right' : offset === count - 1 ? 'left' : 'hidden';
            const project = projects[index];
            return <div key={project?.link || 'studio'} className={`landing-card landing-card--${position}`} inert={offset !== 0 ? true : undefined} aria-hidden={offset !== 0 ? true : undefined}>
              {offset === 0 && utility ? <section aria-label={utility === 'calendar' ? 'Calendar utility' : 'Text editor utility'} className="landing-utility">
                <div className="landing-utility-heading"><h2 ref={utilityHeading} tabIndex={-1}>{utility === 'calendar' ? 'Calendar' : 'Text Editor'}</h2><button onClick={closeUtility} aria-label={utility === 'calendar' ? 'Close calendar' : 'Close text editor'}>×</button></div>
                {utility === 'calendar' ? <Calendar timeZone={timeZone} /> : <TextEditor onClose={closeUtility} />}
              </section> : project ? <article>
                <div className="landing-preview">{project.thumbnail?.asset?.url ? <img src={project.thumbnail.asset.url} alt={project.thumbnail.alt || `${project.name} preview`} width="640" height="360" loading={offset === 0 ? 'eager' : 'lazy'} decoding="async" /> : <p>Preview unavailable</p>}</div>
                <h2>{project.name}</h2>
                <p>{project.description || 'Explore this portfolio project.'}</p>
                <a href={project.link}>Open {project.name} <span aria-hidden="true">↗</span></a>
              </article> : <StudioGalleryEntry headingAs="h2" />}
            </div>;
          })}
        </div>
        <div className="landing-desk" ref={deskRef}>
          <img src={desk} alt="" width="2172" height="724" decoding="async" />
          <WritingSet deskRef={deskRef} />
        </div>
        <div className="landing-controls">
          <button disabled={utilityOpen} aria-label="Previous project" onClick={() => move(-1)}>←</button>
          <p aria-live={rotation.rotating ? "off" : "polite"} aria-atomic="true">{selected + 1} / {count}</p>
          <button disabled={utilityOpen} aria-label="Next project" onClick={() => move(1)}>→</button>
        </div>
        <div className="landing-utility-launchers">
          <button ref={calendarLauncher} onClick={event => openCalendar(event.currentTarget)}>Open calendar</button>
          <button ref={editorLauncher} onClick={event => openEditor(event.currentTarget)}>Open text editor</button>
        </div>
        <div className="landing-rotation">
          <button data-rotation-control disabled={utilityOpen || rotation.reducedMotion} onClick={rotation.toggle}>
            {rotation.enabled ? 'Pause carousel' : 'Start carousel'}
          </button>
          <p>{utilityOpen ? 'Carousel paused while tools are open.' : rotation.reducedMotion ? 'Reduced motion: use the project arrows.' : 'Keyboard interaction pauses rotation. Use Start carousel to resume.'}</p>
        </div>
        <div className="landing-status-slot">{status && <p className="landing-status" role="status">{status}</p>}</div>
      </section>
    </main>
  </>;
}
