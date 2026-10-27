/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FloatingMoon from './FloatingMoon';

let frame, now, reduced;
const pointer = (id, x, y, type = 'mouse') => ({ pointerId: id, clientX: x, clientY: y, pointerType: type, button: 0, buttons: 1 });

beforeEach(() => {
  now = 0; frame = null; reduced = false;
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    constructor(type, options) { super(type, options); Object.assign(this, { pointerId: options.pointerId ?? 1, pointerType: options.pointerType ?? 'mouse' }); }
  });
  vi.stubGlobal('innerWidth', 320); vi.stubGlobal('innerHeight', 740);
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', callback => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function show() {
  const calendar = vi.fn();
  render(<><header><a href="/">Home</a></header><FloatingMoon onCalendar={calendar}><p>Weather unavailable</p></FloatingMoon></>);
  const moon = screen.getByRole('button', { name: /moon and weather/i });
  const box = moon.closest('[data-floating-moon]');
  moon.setPointerCapture = vi.fn(); moon.releasePointerCapture = vi.fn(); moon.hasPointerCapture = () => true;
  box.getBoundingClientRect = () => {
    const [x, y] = position(box);
    return { left: window.innerWidth - 136 + x, top: 8 + y, right: window.innerWidth - 8 + x, bottom: 136 + y, width: 128, height: 128 };
  };
  return { moon, box, calendar };
}
function position(box) {
  const match = box.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/);
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
}
function tick(time) {
  now = time;
  const callback = frame; frame = null;
  if (callback) act(() => callback(time));
}
function drag(moon, dx, dy) {
  fireEvent.pointerDown(moon, pointer(1, 250, 60));
  fireEvent.pointerMove(moon, pointer(1, 250 + dx, 60 + dy));
  fireEvent.pointerUp(moon, pointer(1, 250 + dx, 60 + dy));
}

it('opens an attached callout outside the header and supports calendar activation', () => {
  const { moon, calendar } = show();
  expect(moon.closest('header')).toBeNull();
  expect(screen.queryByText('Weather unavailable')).toBeNull();
  expect(moon.hasAttribute('aria-controls')).toBe(false);
  fireEvent.click(moon);
  expect(screen.getByText('Weather unavailable')).toBeTruthy();
  expect(moon.getAttribute('aria-expanded')).toBe('true');
  expect(document.getElementById(moon.getAttribute('aria-controls'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^move moon$/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /return moon to starting position/i })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
  expect(calendar).toHaveBeenCalledOnce();
});

it('bounds a drag, does not activate the callout, and returns over eight seconds', () => {
  const { moon, box } = show();
  drag(moon, -100, 200);
  fireEvent.click(moon);
  expect(screen.queryByText('Weather unavailable')).toBeNull();
  expect(position(box)).toEqual([-100, 200]);
  tick(4000); expect(position(box)).toEqual([-50, 100]);
  tick(8000); expect(position(box)).toEqual([0, 0]);
});

it('lets a callout travel with the returning moon and permits re-dragging without a jump', () => {
  const { moon, box } = show();
  drag(moon, -100, 200); tick(4000);
  fireEvent.keyDown(moon, { key: 'Enter' }); fireEvent.click(moon);
  expect(screen.getByText('Weather unavailable')).toBeTruthy();
  expect(position(box)).toEqual([-50, 100]);
  fireEvent.pointerDown(moon, pointer(1, 180, 160));
  expect(position(box)).toEqual([-50, 100]);
  fireEvent.pointerMove(moon, pointer(1, 150, 180));
  expect(position(box)).toEqual([-80, 120]);
  fireEvent.pointerUp(moon, pointer(1, 150, 180));
  tick(12000); expect(position(box)).toEqual([0, 0]);
  expect(screen.getByText('Weather unavailable')).toBeTruthy();
});

it('allows the focused moon to be reset with Home when reduced motion is enabled', () => {
  reduced = true;
  const { moon, box } = show();
  drag(moon, -90, 100);
  expect(position(box)).toEqual([-90, 100]);
  expect(frame).toBeNull();
  moon.focus();
  fireEvent.keyDown(moon, { key: 'Home' });
  expect(position(box)).toEqual([0, 0]);
  expect(document.activeElement).toBe(moon);
});

it('keeps the moon focused when the return finishes', () => {
  const { moon } = show();
  drag(moon, -90, 100);
  moon.focus();
  tick(8000);
  expect(document.activeElement).toBe(moon);
});

it('distinguishes a two-finger calendar shortcut from pinch movement', () => {
  const { moon, calendar } = show();
  fireEvent.pointerDown(moon, pointer(1, 180, 20, 'touch'));
  fireEvent.pointerDown(moon, pointer(2, 200, 20, 'touch'));
  fireEvent.pointerUp(moon, pointer(1, 180, 20, 'touch'));
  fireEvent.pointerUp(moon, pointer(2, 200, 20, 'touch'));
  expect(calendar).toHaveBeenCalledOnce();
  fireEvent.pointerDown(moon, pointer(1, 180, 20, 'touch'));
  fireEvent.pointerDown(moon, pointer(2, 200, 20, 'touch'));
  fireEvent.pointerMove(moon, pointer(2, 240, 20, 'touch'));
  fireEvent.pointerUp(moon, pointer(1, 180, 20, 'touch'));
  fireEvent.pointerUp(moon, pointer(2, 240, 20, 'touch'));
  expect(calendar).toHaveBeenCalledOnce();
});

it('moves the focused moon with arrow keys and starts returning after the last key is released', () => {
  const { moon, box } = show();
  moon.focus();
  expect(document.getElementById(moon.getAttribute('aria-describedby')).textContent).toMatch(/arrow keys.*home/i);
  fireEvent.keyDown(moon, { key: 'ArrowLeft' });
  fireEvent.keyDown(moon, { key: 'ArrowDown' });
  expect(position(box)).toEqual([-40, 40]);
  fireEvent.keyUp(moon, { key: 'ArrowLeft' });
  expect(frame).toBeNull();
  fireEvent.keyUp(moon, { key: 'ArrowDown' });
  tick(4000);
  expect(position(box)).toEqual([-20, 20]);
  tick(8000);
  expect(position(box)).toEqual([0, 0]);
  expect(document.activeElement).toBe(moon);
});

it('starts returning if focus leaves during keyboard movement and preserves modified arrow shortcuts', () => {
  const { moon, box } = show();
  moon.focus();
  fireEvent.keyDown(moon, { key: 'ArrowLeft', ctrlKey: true });
  expect(position(box)).toEqual([0, 0]);
  fireEvent.keyDown(moon, { key: 'ArrowLeft' });
  expect(position(box)).toEqual([-40, 0]);
  fireEvent.blur(moon);
  tick(8000);
  expect(position(box)).toEqual([0, 0]);
});

it('refits the moon when the viewport narrows during its return', () => {
  const { moon, box } = show();
  drag(moon, -100, 200);
  vi.stubGlobal('innerWidth', 200);
  fireEvent(window, new Event('resize'));
  expect(position(box)).toEqual([-56, 200]);
  tick(8000);
  expect(position(box)).toEqual([0, 0]);
});

it('honors device safe-area insets when dragging to the edges', () => {
  const { moon, box } = show();
  box.style.setProperty('--moon-safe-left', '24px');
  box.style.setProperty('--moon-safe-bottom', '32px');
  drag(moon, -500, 1000);
  expect(position(box)).toEqual([-160, 572]);
});

it('ends an interrupted drag and returns without activating the callout', () => {
  const { moon, box } = show();
  fireEvent.pointerDown(moon, pointer(1, 250, 60));
  fireEvent.pointerMove(moon, pointer(1, 150, 160));
  fireEvent.pointerCancel(moon, pointer(1, 150, 160));
  fireEvent.click(moon);
  expect(screen.queryByText('Weather unavailable')).toBeNull();
  expect(position(box)).toEqual([-100, 100]);
  tick(8000);
  expect(position(box)).toEqual([0, 0]);
});

it('opens the calendar on right click and dismisses the callout with Escape', () => {
  const { moon, calendar } = show();
  fireEvent.contextMenu(moon);
  expect(calendar).toHaveBeenCalledOnce();
  fireEvent.keyDown(moon, { key: 'Enter' }); fireEvent.click(moon);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByText('Weather unavailable')).toBeNull();
  expect(document.activeElement).toBe(moon);
});
