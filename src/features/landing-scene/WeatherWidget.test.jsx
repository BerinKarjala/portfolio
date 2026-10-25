/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SceneProvider } from './SceneContext';
import { StudioProvider } from '../css-studio/Studio';
import WeatherWidget from './WeatherWidget';
import { fetchWeather } from './weather';
vi.mock('./weather', async original => ({ ...await original(), fetchWeather: vi.fn() }));
let locate;
beforeEach(() => {
  localStorage.clear();
  locate = vi.fn();
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: locate } });
  fetchWeather.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function widget() { render(<SceneProvider><StudioProvider><WeatherWidget /></StudioProvider></SceneProvider>); }
it('does not turn normal page scroll into weather-object movement during a layout refit', () => {
  let resized;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) {resized = callback;}
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('scrollY', 200);
  widget();
  const weather = screen.getByRole('group', {name: 'Weather and time'});
  weather.getBoundingClientRect = () => ({left: 10, right: 210, top: -100, bottom: 100, width: 200, height: 200});
  act(() => resized());
  expect(weather.style.transform).toBe('translate(0px, 0px)');
});
it('still bounds an on-screen weather object after its content resizes', () => {
  let resized;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) {resized = callback;}
    observe() {}
    disconnect() {}
  });
  widget();
  const weather = screen.getByRole('group', {name: 'Weather and time'});
  weather.getBoundingClientRect = () => ({left: -30, right: 170, top: 20, bottom: 220, width: 200, height: 200});
  act(() => resized());
  expect(weather.style.transform).toBe('translate(30px, 0px)');
});
it('asks for location only after the visitor chooses it and infers units from the returned zone', async () => {
  fetchWeather.mockResolvedValue({ temperature: 15, code: 61, timezone: 'America/New_York', observedAt: Date.now(), fetchedAt: Date.now() });
  widget();
  expect(locate).not.toHaveBeenCalled();
  expect(screen.getByText(/weather needs your permission/i)).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  expect(locate).toHaveBeenCalledOnce();
  await act(async () => locate.mock.calls[0][0]({ coords: { latitude: 40, longitude: -74 } }));
  expect(await screen.findByText('59°F · Rain')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Celsius' }));
  expect(screen.getByText('15°C · Rain')).not.toBeNull();
  expect(fetchWeather).toHaveBeenCalledOnce();
});
it('leaves clock and moon useful when permission is denied', () => {
  widget();
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  act(() => locate.mock.calls[0][1]({ code: 1 }));
  expect(screen.getByText(/location permission was denied/i)).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Theme Studio' })).not.toBeNull();
  expect(document.querySelector('time').getAttribute('datetime')).toBeTruthy();
  expect(fetchWeather).not.toHaveBeenCalled();
});
it('retains an honestly labeled last reading if refresh fails', async () => {
  vi.useFakeTimers();
  fetchWeather.mockResolvedValueOnce({ temperature: 15, code: 0, timezone: 'Europe/Paris', observedAt: Date.now(), fetchedAt: Date.now() }).mockRejectedValueOnce(new Error('offline'));
  widget();
  fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
  await act(async () => locate.mock.calls[0][0]({ coords: { latitude: 48.8, longitude: 2.3 } }));
  await act(async () => vi.advanceTimersByTimeAsync(15 * 60 * 1000));
  expect(screen.getByText(/last reading; update unavailable/i)).not.toBeNull();
  expect(screen.getByText('15°C · Clear skies')).not.toBeNull();
});
it('provides an accessible approximate lunar phase alongside the clock', () => {
  widget();
  const description = screen.getByRole('button', { name: 'Theme Studio' }).getAttribute('aria-describedby');
  expect(document.getElementById(description)?.textContent).toMatch(/moon|crescent|quarter|gibbous/i);
  expect(document.getElementById(description)?.textContent).toMatch(/approx/i);
});
