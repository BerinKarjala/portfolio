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

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function() {this.open = true;};
  HTMLDialogElement.prototype.close = function() {this.open = false;};
});
afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
async function scene() {
  render(<HelmetProvider><MemoryRouter><SceneProvider><WeatherWidget/><Home/></SceneProvider></MemoryRouter></HelmetProvider>);
  await act(async () => {});
}
it('removes bottom control groups, ends scene flow with the desk, and keeps real launchers', async () => {
  await scene();
  expect(screen.queryByRole('button', {name: 'Open calendar', exact: true})).toBeNull();
  expect(screen.queryByRole('button', {name: /^(Start|Pause) carousel$/})).toBeNull();
  expect(document.querySelector('.landing-gallery').lastElementChild.classList.contains('landing-desk')).toBe(true);
  expect(screen.getByRole('button', {name: 'Calendar', exact: true})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Open text editor with the quill'})).toBeTruthy();
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
  expect(screen.queryByRole('dialog', {name: 'Calendar'})).toBeNull();
  expect(screen.getByRole('table').getAttribute('aria-label')).toBe(month);
  expect(date.isConnected).toBe(true);
  expect(date.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(expand);
  expect(document.body.style.overflow).toBe('');
});
it('keeps the exact editor DOM, draft and undo history through expansion and Escape', async () => {
  await scene();
  fireEvent.click(screen.getByRole('button', {name: 'Open text editor with the quill'}));
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
  expect(screen.queryByRole('dialog', {name: 'Text Editor'})).toBeNull();
  expect(title.value).toBe('Keep this draft');
  expect(sheet.textContent).toBe('A quiet forest');
  expect(screen.getByRole('button', {name: 'Undo'}).disabled).toBe(false);
});
it('expands only eligible card chrome on double click, preserving explicit project actions', async () => {
  await scene();
  fireEvent.doubleClick(screen.getByRole('link', {name: 'Open Sudoku Solver'}));
  expect(screen.queryByRole('dialog', {name: 'Sudoku Solver'})).toBeNull();
  fireEvent.doubleClick(screen.getByRole('heading', {name: 'Sudoku Solver'}));
  expect(screen.queryByRole('dialog', {name: 'Sudoku Solver'})).not.toBeNull();
});
