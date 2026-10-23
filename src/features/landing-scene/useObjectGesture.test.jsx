/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useObjectGesture from './useObjectGesture';
beforeEach(() => {
  vi.stubGlobal('PointerEvent', class extends MouseEvent { constructor(type, options) { super(type, options); Object.assign(this, { pointerId: options.pointerId ?? 1, pointerType: options.pointerType ?? 'mouse' }); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function scene() {
  const primary = vi.fn(), secondary = vi.fn();
  function Target() {
    const gesture = useObjectGesture({ primary, secondary, bounds: () => ({ minX: -10, maxX: 100, minY: -10, maxY: 100 }) });
    return <button {...gesture.handlers} style={{ transform: `translate(${gesture.position.x}px, ${gesture.position.y}px)` }}>Object</button>;
  }
  render(<Target />);
  const target = screen.getByRole('button');
  target.setPointerCapture = vi.fn(); target.releasePointerCapture = vi.fn(); target.hasPointerCapture = () => true;
  return { target, primary, secondary };
}
const pointer = (id, x, y, type = 'touch') => ({ pointerId: id, clientX: x, clientY: y, pointerType: type, button: 0 });
it('distinguishes a click from a bounded drag and suppresses the follow-up click', () => {
  const { target, primary } = scene();
  fireEvent.pointerDown(target, pointer(1, 0, 0, 'mouse'));
  fireEvent.pointerUp(target, pointer(1, 1, 1, 'mouse'));
  fireEvent.click(target); expect(primary).toHaveBeenCalledOnce();
  fireEvent.pointerDown(target, pointer(1, 0, 0, 'mouse'));
  fireEvent.pointerMove(target, pointer(1, 200, 50, 'mouse'));
  expect(target.style.transform).toBe('translate(100px, 50px)');
  fireEvent.pointerMove(target, pointer(1, 2, 2, 'mouse'));
  fireEvent.pointerUp(target, pointer(1, 2, 2, 'mouse'));
  fireEvent.click(target);
  expect(target.style.transform).toBe('translate(2px, 2px)');
  expect(primary).toHaveBeenCalledOnce();
});
it('cancels movement on pointer cancellation without opening anything', () => {
  const { target, primary, secondary } = scene();
  fireEvent.pointerDown(target, pointer(1, 0, 0));
  fireEvent.pointerMove(target, pointer(1, 50, 50));
  fireEvent.pointerCancel(target, pointer(1, 50, 50));
  fireEvent.click(target);
  expect(target.style.transform).toBe('translate(0px, 0px)');
  expect(primary).not.toHaveBeenCalled(); expect(secondary).not.toHaveBeenCalled();
});
it('opens the secondary action only after both stationary contacts finish', () => {
  const { target, primary, secondary } = scene();
  fireEvent.pointerDown(target, pointer(1, 0, 0));
  fireEvent.pointerDown(target, pointer(2, 30, 0));
  fireEvent.pointerUp(target, pointer(1, 0, 0));
  expect(secondary).not.toHaveBeenCalled();
  fireEvent.pointerUp(target, pointer(2, 30, 0));
  fireEvent.click(target);
  expect(secondary).toHaveBeenCalledOnce(); expect(primary).not.toHaveBeenCalled();
});
it('rejects pinch motion, a drag followed by a second contact, and cancelled two-touch sequences', () => {
  for (const sequence of ['pinch', 'drag', 'cancel']) {
    const { target, primary, secondary } = scene();
    fireEvent.pointerDown(target, pointer(1, 0, 0));
    if (sequence === 'drag') fireEvent.pointerMove(target, pointer(1, 50, 0));
    fireEvent.pointerDown(target, pointer(2, 30, 0));
    if (sequence === 'pinch') fireEvent.pointerMove(target, pointer(2, 60, 0));
    if (sequence === 'cancel') fireEvent.pointerCancel(target, pointer(1, 0, 0));
    else fireEvent.pointerUp(target, pointer(1, 0, 0));
    fireEvent.pointerUp(target, pointer(2, 30, 0)); fireEvent.click(target);
    expect(primary).not.toHaveBeenCalled(); expect(secondary).not.toHaveBeenCalled();
    cleanup();
  }
});
it('keeps right-click and keyboard activation separate', () => {
  const { target, primary, secondary } = scene();
  fireEvent.contextMenu(target); fireEvent.click(target);
  expect(secondary).toHaveBeenCalledOnce(); expect(primary).not.toHaveBeenCalled();
  fireEvent.keyDown(target, { key: 'Enter' }); fireEvent.click(target);
  expect(primary).toHaveBeenCalledOnce();
});
it('rejects mixed pointer types and touch long-press context menus', () => {
  const { target, primary, secondary } = scene();
  fireEvent.pointerDown(target, pointer(1, 0, 0, 'mouse'));
  fireEvent.pointerDown(target, pointer(2, 30, 0));
  fireEvent.pointerUp(target, pointer(1, 0, 0, 'mouse'));
  fireEvent.pointerUp(target, pointer(2, 30, 0));
  expect(secondary).not.toHaveBeenCalled();
  fireEvent.pointerDown(target, pointer(1, 0, 0));
  fireEvent.contextMenu(target);
  fireEvent.pointerUp(target, pointer(1, 0, 0)); fireEvent.click(target);
  expect(secondary).not.toHaveBeenCalled(); expect(primary).not.toHaveBeenCalled();
});
