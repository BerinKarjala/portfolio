/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { fetchWeather } from './features/landing-scene/weather';

vi.mock('./components/Home', () => ({ default: () => <main>Home page</main> }));
vi.mock('./components/About', () => ({ default: () => <main>About page</main> }));
vi.mock('./components/Project', () => ({ default: () => <main>Projects page</main> }));
vi.mock('./components/projects/Minesweeper', () => ({ default: () => <main>Game page</main> }));
vi.mock('./features/landing-scene/weather', async original => ({ ...await original(), fetchWeather: vi.fn() }));
vi.mock('./features/css-studio/Studio', () => ({
  StudioProvider: ({ children }) => <>{children}</>,
  MoonLauncher: () => <button>Theme Studio</button>,
  StudioLauncher: () => <button>Theme Studio</button>,
  useStudioControls: () => null,
  useStudioOpen: () => false,
}));

let locate;
beforeEach(() => {
  window.history.pushState({}, '', '/');
  locate = vi.fn();
  fetchWeather.mockReset();
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: locate } });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(['/', '/project', '/about'])('mounts a single floating moon outside the header at %s', async path => {
  window.history.pushState({}, '', path);
  render(<App />);
  const moon = await screen.findByRole('button', { name: 'Moon and weather' });
  expect(screen.getAllByRole('button', { name: 'Moon and weather' })).toHaveLength(1);
  expect(moon.closest('header')).toBeNull();
  expect(locate).not.toHaveBeenCalled();
  fireEvent.click(moon);
  const details = screen.getByRole('region', { name: 'Moon and weather details' });
  expect(within(details).getByRole('button', { name: 'Use my location' })).toBeTruthy();
  expect(within(details).getByRole('button', { name: 'Calendar' })).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Theme Studio tools' })).toBeNull();
});

it('does not display the moon on project application routes', async () => {
  window.history.pushState({}, '', '/projects/Minesweeper');
  render(<App />);
  await screen.findByText('Game page');
  expect(screen.queryByRole('button', { name: 'Moon and weather' })).toBeNull();
});

it('opens and closes the calendar on the same page and restores moon focus', async () => {
  window.history.pushState({}, '', '/about');
  render(<App />);
  const moon = await screen.findByRole('button', { name: 'Moon and weather' });
  fireEvent.click(moon);
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
  const calendar = screen.getByRole('dialog', { name: 'Calendar' });
  expect(within(calendar).getByRole('button', { name: 'Today' })).toBeTruthy();
  fireEvent.click(within(calendar).getByRole('button', { name: 'Close calendar' }));
  await waitFor(() => expect(document.activeElement).toBe(moon));
  expect(window.location.pathname).toBe('/about');
});

it('requests weather only after consent and shares it between supported routes', async () => {
  fetchWeather.mockResolvedValue({ temperature: 15, code: 61, daytime: true, timezone: 'America/New_York', observedAt: Date.now(), fetchedAt: Date.now() });
  render(<App />);
  const moon = await screen.findByRole('button', { name: 'Moon and weather' });
  expect(fetchWeather).not.toHaveBeenCalled();
  expect(moon.querySelector('[data-weather-layer]')).toBeNull();
  fireEvent.click(moon);
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(locate).toHaveBeenCalledOnce();
  await act(async () => locate.mock.calls[0][0]({ coords: { latitude: -33.8, longitude: 151.2 } }));
  expect(await screen.findByText('59°F · Rain')).toBeTruthy();
  expect(moon.querySelector('[data-weather-layer="rain"]')).toBeTruthy();
  expect(moon.querySelector('[data-weather-layer="sun"]')).toBeTruthy();
  expect(moon.querySelector('[data-moon-orientation]').getAttribute('transform')).toBe('translate(32 0) scale(-1 1)');
  fireEvent.click(screen.getByRole('link', { name: 'Projects' }));
  await screen.findByText('Projects page');
  expect(screen.getByText('59°F · Rain')).toBeTruthy();
  expect(locate).toHaveBeenCalledOnce();
  expect(fetchWeather).toHaveBeenCalledOnce();
});

it('leaves the moon visible without weather layers if permission is denied', async () => {
  render(<App />);
  const moon = await screen.findByRole('button', { name: 'Moon and weather' });
  fireEvent.click(moon);
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  act(() => locate.mock.calls[0][1]({ code: 1 }));
  expect(screen.getByText(/location permission was denied/i)).toBeTruthy();
  expect(moon.querySelector('[data-weather-layer]')).toBeNull();
  expect(fetchWeather).not.toHaveBeenCalled();
});

it.each(['/', '/project', '/about'])('opens the calendar with the moon shortcut at %s', async path => {
  window.history.pushState({}, '', path);
  render(<App />);
  const moon = await screen.findByRole('button', { name: 'Moon and weather' });
  fireEvent.contextMenu(moon);
  const calendar = screen.getByRole('dialog', { name: 'Calendar' });
  fireEvent(calendar, new Event('cancel', { bubbles: false, cancelable: true }));
  await waitFor(() => expect(document.activeElement).toBe(moon));
  expect(window.location.pathname).toBe(path);
});
