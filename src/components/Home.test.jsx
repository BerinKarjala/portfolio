/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../client.js', () => ({ default: { fetch: vi.fn().mockRejectedValue(new Error('offline')) } }));
import HomePage from './Home';
import { SceneProvider, useScene } from '../features/landing-scene/SceneContext';
function Home() { return <SceneProvider><HomePage /></SceneProvider>; }
import sanityClient from '../client.js';
afterEach(cleanup);
it('keeps bundled projects usable offline and exposes only the center destination', async () => {
  render(<HelmetProvider><MemoryRouter><Home /></MemoryRouter></HelmetProvider>);
  expect(screen.getByRole('heading', { level: 1, name: 'Berin Karjala' })).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Open Sudoku Solver' }).getAttribute('href')).toBe('/projects/SudokuSolver');
  expect(screen.queryByRole('link', { name: 'Open Minesweeper' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Next project' }));
  expect(screen.getByRole('link', { name: 'Open Minesweeper' }).getAttribute('href')).toBe('/projects/Minesweeper');
  fireEvent.click(screen.getByRole('button', { name: 'Previous project' }));
  expect(screen.getByRole('link', { name: 'Open Sudoku Solver' })).not.toBeNull();
  expect(await screen.findByText(/latest project content is unavailable/i)).not.toBeNull();
  expect(screen.queryByText('Core Strengths')).toBeNull();
});

it('normalizes local application URLs and rejects unsafe CMS destinations', async () => {
  sanityClient.fetch.mockResolvedValueOnce([
    { name: 'CMS Sudoku', description: '<script>untrusted text</script>', link: 'https://berinkarjala.netlify.app/projects/SudokuSolver/' },
    { name: 'Unsafe entry', link: 'javascript:alert(1)' },
  ]);
  render(<HelmetProvider><MemoryRouter><Home /></MemoryRouter></HelmetProvider>);
  const entry = await screen.findByRole('link', { name: 'Open CMS Sudoku' });
  expect(entry.getAttribute('href')).toBe('/projects/SudokuSolver');
  expect(screen.getByText('<script>untrusted text</script>')).not.toBeNull();
  expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
  expect(screen.queryByText('Unsafe entry')).toBeNull();
});

// Rotation runs only while the scene is idle. Studio is a real nonmodal utility.
import { act } from '@testing-library/react';
import { beforeEach, describe } from 'vitest';
import { StudioProvider, MoonLauncher } from '../features/css-studio/Studio';
vi.mock('../utils/idleCallback', () => ({ runWhenIdle: callback => { callback(); return 1; }, cancelIdle: vi.fn() }));

describe('idle carousel rotation', () => {
  let motion;
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    motion = new EventTarget();
    motion.matches = false;
    vi.stubGlobal('matchMedia', vi.fn(query => query.includes('reduced-motion') ? motion : { matches: false, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  async function scene() {
    render(<HelmetProvider><MemoryRouter><StudioProvider><MoonLauncher /><Home /><button>Outside scene</button></StudioProvider></MemoryRouter></HelmetProvider>);
    await act(async () => {});
  }
  const advance = milliseconds => act(() => vi.advanceTimersByTime(milliseconds));
  const centered = name => expect(screen.getByRole('link', { name: `Open ${name}` })).not.toBeNull();

  it('advances while idle, keeps the center fixed throughout a Studio session, then waits a full interval', async () => {
    await scene();
    advance(8000);
    centered('Minesweeper');
    fireEvent.click(screen.getByRole('button', { name: 'Theme Studio' }));
    fireEvent.focus(screen.getByRole('button', { name: 'Outside scene' }));
    advance(60000);
    centered('Minesweeper');
    expect(screen.getByRole('button', { name: 'Next project' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close tools' }));
    advance(7999);
    centered('Minesweeper');
    advance(1);
    centered('HTML Page Builder');
  });

  it('supports an explicit pause and keeps keyboard interaction stable until rotation is restarted', async () => {
    await scene();
    fireEvent.click(screen.getByRole('button', { name: 'Pause carousel' }));
    advance(16000);
    centered('Sudoku Solver');
    fireEvent.click(screen.getByRole('button', { name: 'Start carousel' }));
    advance(8000);
    centered('Minesweeper');
    fireEvent.focus(screen.getByRole('link', { name: 'Open Minesweeper' }));
    fireEvent.blur(screen.getByRole('link', { name: 'Open Minesweeper' }));
    advance(16000);
    centered('Minesweeper');
  });

  it('pauses for hover and hidden tabs and restarts with a fresh delay', async () => {
    await scene();
    const gallery = screen.getByRole('region', { name: 'Project gallery' });
    fireEvent.pointerEnter(gallery, { pointerType: 'mouse' });
    advance(16000);
    centered('Sudoku Solver');
    fireEvent.pointerLeave(gallery, { pointerType: 'mouse' });
    advance(8000);
    centered('Minesweeper');
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    advance(16000);
    centered('Minesweeper');
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    advance(8000);
    centered('HTML Page Builder');
    visibility.mockRestore();
  });

  it('honors changing reduced-motion preferences, retaining usable manual controls', async () => {
    await scene();
    motion.matches = true;
    act(() => motion.dispatchEvent(new Event('change')));
    advance(16000);
    centered('Sudoku Solver');
    expect(screen.getByRole('button', { name: 'Start carousel' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next project' }));
    centered('Minesweeper');
  });

  it('holds a calendar in the center until Close and restores its launcher focus', async () => {
    await scene();
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('heading', { name: 'Calendar', exact: true })).not.toBeNull();
    advance(24000);
    expect(screen.getByRole('heading', { name: 'Calendar', exact: true })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Next project' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close calendar' }));
    centered('Sudoku Solver');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.queryByRole('heading', { name: 'Calendar', exact: true })).toBeNull();
  });

  it('removes the rotation timer on unmount', async () => {
    await scene();
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it('restores focus to the inline calendar launcher if the original launcher is gone', () => {
  function RemovedLauncher() {
    const scene = useScene();
    return <button onClick={() => scene.openCalendar(document.createElement('button'))}>Simulate removed launcher</button>;
  }
  render(<HelmetProvider><MemoryRouter><SceneProvider><HomePage /><RemovedLauncher /></SceneProvider></MemoryRouter></HelmetProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Simulate removed launcher' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close calendar' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open calendar' }));
});
it('keeps the Studio card centered and its launcher reachable when late CMS projects arrive', async () => {
  let resolve;
  sanityClient.fetch.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  render(<HelmetProvider><MemoryRouter><StudioProvider><Home /></StudioProvider></MemoryRouter></HelmetProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Previous project' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Theme Studio' }));
  await act(async () => resolve([{ name: 'Extra project', link: 'https://example.com/project' }]));
  expect(screen.getByRole('heading', { name: 'CSS Theme Studio', level: 2 })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close tools' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open Theme Studio' }));
});
it('opens the text editor in the center and retains drafts while switching utilities', () => {
  localStorage.clear();
  render(<HelmetProvider><MemoryRouter><StudioProvider><Home /></StudioProvider></MemoryRouter></HelmetProvider>);
  const launcher = screen.getByRole('button', { name: 'Open text editor', exact: true });
  fireEvent.click(launcher);
  expect(screen.getByRole('heading', { name: 'Text Editor', exact: true })).not.toBeNull();
  fireEvent.change(screen.getByRole('textbox', { name: 'Document title' }), { target: { value: 'Keep my draft' } });
  fireEvent.paste(screen.getByRole('textbox', { name: 'Writing area' }), { clipboardData: { getData: () => 'A quiet forest' } });
  fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
  expect(screen.queryByRole('textbox', { name: 'Writing area' })).toBeNull();
  fireEvent.click(launcher);
  expect(screen.getByRole('textbox', { name: 'Document title' }).value).toBe('Keep my draft');
  expect(screen.getByRole('textbox', { name: 'Writing area' }).textContent).toBe('A quiet forest');
  expect(screen.getByRole('button', { name: 'Next project' }).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Close text editor' }));
  expect(document.activeElement).toBe(launcher);
  expect(screen.getByRole('link', { name: 'Open Sudoku Solver' })).not.toBeNull();
});
