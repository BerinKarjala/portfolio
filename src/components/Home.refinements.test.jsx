/* @vitest-environment jsdom */
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {HelmetProvider} from 'react-helmet-async';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
vi.mock('../client.js', () => ({default: {fetch: vi.fn().mockResolvedValue([])}}));
vi.mock('../utils/idleCallback', () => ({runWhenIdle: callback => {callback(); return 1;}, cancelIdle: vi.fn()}));
import Home from './Home';
import {SceneProvider} from '../features/landing-scene/SceneContext';
import WeatherWidget from '../features/landing-scene/WeatherWidget';
import sanityClient from '../client.js';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function() {this.open = true;};
  HTMLDialogElement.prototype.close = function() {this.open = false;};
});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
async function scene() {
  render(<HelmetProvider><MemoryRouter><SceneProvider><WeatherWidget/><Home/></SceneProvider></MemoryRouter></HelmetProvider>);
  await act(async () => {});
}
const modal = name => {
  const element = screen.queryByRole('dialog', {name});
  return element?.getAttribute('aria-modal') === 'true' ? element : null;
};
it('removes bottom control groups, ends scene flow with the desk, and keeps real launchers', async () => {
  await scene();
  expect(screen.queryByRole('button', {name: 'Open calendar', exact: true})).toBeNull();
  expect(screen.queryByRole('button', {name: /^(Start|Pause) carousel$/})).toBeNull();
  expect(document.querySelector('.landing-gallery').lastElementChild.classList.contains('landing-desk')).toBe(true);
  expect(screen.getByRole('button', {name: 'Calendar', exact: true})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Open text editor with the inkwell'})).toBeTruthy();
});
it('selects an adjacent preview without exposing its nested project link', async () => {
  await scene();
  expect(screen.queryByRole('link', {name: 'Open Minesweeper'})).toBeNull();
  const preview = screen.queryByRole('button', {name: 'Select Minesweeper'});
  expect(preview).not.toBeNull();
  fireEvent.click(preview);
  expect(screen.getByRole('link', {name: 'Open Minesweeper'})).toBeTruthy();
  expect(document.activeElement.closest('[data-card-key]').dataset.cardKey).toBe('/projects/Minesweeper');
});
it('expands and exits the same calendar instance, preserving viewed month and selected date', async () => {
  await scene();
  fireEvent.click(screen.getByRole('button', {name: 'Calendar', exact: true}));
  fireEvent.click(screen.getByRole('button', {name: 'Next month'}));
  const month = screen.getByRole('table').getAttribute('aria-label');
  const date = screen.getByRole('table').querySelector('button[tabindex="0"]');
  fireEvent.click(date);
  const expand = screen.queryByRole('button', {name: 'Expand Calendar'});
  expect(expand).not.toBeNull();
  fireEvent.click(expand);
  expect(screen.getByRole('dialog', {name: 'Calendar'})).toBeTruthy();
  expect(screen.getAllByRole('table')).toHaveLength(1);
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.click(screen.getByRole('button', {name: 'Exit full screen'}));
  expect(modal('Calendar')).toBeNull();
  expect(screen.getByRole('table').getAttribute('aria-label')).toBe(month);
  expect(date.isConnected).toBe(true);
  expect(date.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(expand);
  expect(document.body.style.overflow).toBe('');
});
it('keeps the exact editor DOM, draft and undo history through expansion and Escape', async () => {
  await scene();
  fireEvent.click(screen.getByRole('button', {name: 'Open text editor with the inkwell'}));
  const title = screen.getByRole('textbox', {name: 'Document title'});
  fireEvent.change(title, {target: {value: 'Keep this draft'}});
  const sheet = screen.getByRole('textbox', {name: 'Writing area'});
  fireEvent.paste(sheet, {clipboardData: {getData: () => 'A quiet forest'}});
  const expand = screen.queryByRole('button', {name: 'Expand Text Editor'});
  expect(expand).not.toBeNull();
  fireEvent.click(expand);
  const dialog = screen.getByRole('dialog', {name: 'Text Editor'});
  expect(screen.getByRole('textbox', {name: 'Writing area'})).toBe(sheet);
  expect(screen.getAllByRole('textbox', {name: 'Writing area'})).toHaveLength(1);
  fireEvent.keyDown(dialog, {key: 'Escape'});
  expect(modal('Text Editor')).toBeNull();
  expect(title.value).toBe('Keep this draft');
  expect(sheet.textContent).toBe('A quiet forest');
  expect(screen.getByRole('button', {name: 'Undo'}).disabled).toBe(false);
});
it('expands only eligible card chrome on double click, preserving explicit project actions', async () => {
  await scene();
  fireEvent.doubleClick(screen.getByRole('link', {name: 'Open Sudoku Solver'}));
  expect(modal('Sudoku Solver')).toBeNull();
  fireEvent.doubleClick(screen.getByRole('heading', {name: 'Sudoku Solver'}));
  expect(modal('Sudoku Solver')).not.toBeNull();
});
it('retains an expanded Studio identity when late CMS projects change its index', async () => {
  let resolve;
  sanityClient.fetch.mockImplementationOnce(() => new Promise(done => {resolve = done;}));
  await scene();
  fireEvent.click(screen.getByRole('button', {name: 'Previous project'}));
  fireEvent.click(screen.getByRole('button', {name: 'Expand CSS Theme Studio'}));
  const dialog = modal('CSS Theme Studio');
  expect(dialog).not.toBeNull();
  await act(async () => resolve([{name: 'Late project', link: 'https://example.com/late'}]));
  expect(modal('CSS Theme Studio')).toBe(dialog);
  expect(dialog.closest('[data-card-key]').dataset.cardKey).toBe('studio');
  fireEvent.click(screen.getByRole('button', {name: 'Exit full screen'}));
});
it('makes an outgoing edge inert immediately, before its animation finishes', async () => {
  vi.useFakeTimers();
  await scene();
  fireEvent.click(screen.getByRole('button', {name: 'Next project'}));
  const edge = document.querySelector('.landing-card--exit-left');
  expect(edge).not.toBeNull();
  expect(edge.hasAttribute('inert')).toBe(true);
  expect(edge.querySelector('[data-card-select]')).toBeNull();
  act(() => vi.advanceTimersByTime(1600));
  expect(edge.classList.contains('landing-card--hidden')).toBe(true);
});
it('leaves modified Tab shortcuts to the browser while a card is expanded', async () => {
  await scene();
  fireEvent.click(screen.getByRole('button', {name: 'Expand Sudoku Solver'}));
  const dialog = modal('Sudoku Solver');
  const exit = screen.getByRole('button', {name: 'Exit full screen'});
  exit.focus();
  const shortcut = new KeyboardEvent('keydown', {key: 'Tab', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true});
  dialog.dispatchEvent(shortcut);
  expect(shortcut.defaultPrevented).toBe(false);
});
