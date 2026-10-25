/* @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import useCardGesture from './useCardGesture';
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    constructor(type, options) {super(type, options); Object.assign(this, {pointerId: options.pointerId ?? 1, pointerType: options.pointerType ?? 'touch'});}
  });
});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();});
function setup() {
  const select = vi.fn(), expand = vi.fn();
  function Card() {
    const handlers = useCardGesture({select, expand});
    return <div data-testid="card" {...handlers}><h2 data-card-gesture>Card preview</h2><a href="/project">Project action</a><input aria-label="Title"/><div contentEditable suppressContentEditableWarning>Editor text</div><div className="landing-calendar"><button>Date</button></div></div>;
  }
  render(<Card/>);
  return {card: screen.getByTestId('card'), preview: screen.getByText('Card preview'), select, expand};
}
const pointer = (id, x, y) => ({pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y});
function tap(target, id = 1, x = 20, y = 100) {fireEvent.pointerDown(target, pointer(id, x, y)); fireEvent.pointerUp(target, pointer(id, x, y));}
it('single tap selects; two sequential stationary taps expand exactly once and suppress compatibility clicks', () => {
  const {preview, card, select, expand} = setup();
  tap(preview); expect(select).toHaveBeenCalledOnce(); expect(expand).not.toHaveBeenCalled();
  fireEvent.lostPointerCapture(card, pointer(1, 20, 100));
  vi.advanceTimersByTime(250);
  tap(preview, 2); fireEvent.click(preview); fireEvent.doubleClick(preview);
  expect(expand).toHaveBeenCalledOnce(); expect(select).toHaveBeenCalledOnce();
});
it('accepts an upward swipe at the distance and time boundary', () => {
  const {preview, expand, select} = setup();
  fireEvent.pointerDown(preview, pointer(1, 20, 100));
  vi.advanceTimersByTime(500);
  fireEvent.pointerUp(preview, pointer(1, 20, 40));
  fireEvent.click(preview);
  expect(expand).toHaveBeenCalledOnce(); expect(select).not.toHaveBeenCalled();
});
it.each([
  ['small', 20, 41, 200], ['downward', 20, 180, 200], ['horizontal', 100, 30, 200], ['slow', 20, 20, 501],
])('rejects a %s swipe and its synthetic activation', (name, x, y, time) => {
  const {preview, expand, select} = setup();
  fireEvent.pointerDown(preview, pointer(1, 20, 100)); vi.advanceTimersByTime(time);
  fireEvent.pointerUp(preview, pointer(1, x, y)); fireEvent.click(preview);
  expect(expand).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
});
it('rejects a pinch/third contact until every contact is released', () => {
  const {preview, expand} = setup();
  fireEvent.pointerDown(preview, pointer(1, 20, 100));
  fireEvent.pointerDown(preview, pointer(2, 40, 100));
  fireEvent.pointerUp(preview, pointer(1, 20, 20));
  fireEvent.pointerDown(preview, pointer(3, 20, 100));
  fireEvent.pointerUp(preview, pointer(3, 20, 20));
  fireEvent.pointerUp(preview, pointer(2, 40, 100));
  expect(expand).not.toHaveBeenCalled();
  fireEvent.pointerDown(preview, pointer(4, 20, 100));
  fireEvent.pointerUp(preview, pointer(4, 20, 20));
  expect(expand).toHaveBeenCalledOnce();
});
it('rejects cancellation and a lost capture before pointerup', () => {
  const {preview, card, expand, select} = setup();
  fireEvent.pointerDown(preview, pointer(1, 20, 100));
  fireEvent.pointerCancel(preview, pointer(1, 20, 30)); fireEvent.click(preview);
  fireEvent.pointerDown(preview, pointer(2, 20, 100));
  fireEvent.lostPointerCapture(card, pointer(2, 20, 30));
  fireEvent.pointerUp(preview, pointer(2, 20, 30));
  expect(expand).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
});
it('does not reinterpret a drag returning to its starting point as a tap', () => {
  const {preview, expand, select} = setup();
  fireEvent.pointerDown(preview, pointer(1, 20, 100));
  fireEvent.pointerMove(preview, pointer(1, 120, 100));
  fireEvent.pointerUp(preview, pointer(1, 20, 100));
  fireEvent.click(preview);
  expect(expand).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
});
it('does not turn editor, calendar, form or explicit project actions into selection/expansion', () => {
  const {select, expand} = setup();
  for (const target of [screen.getByRole('link'), screen.getByRole('textbox'), screen.getByText('Editor text'), screen.getByRole('button', {name: 'Date'})]) {
    tap(target); vi.advanceTimersByTime(100); tap(target, 2); fireEvent.doubleClick(target);
  }
  expect(select).not.toHaveBeenCalled(); expect(expand).not.toHaveBeenCalled();
});
it('rejects double taps separated by too much time or spatial drift', () => {
  const {preview, expand, select} = setup();
  tap(preview); vi.advanceTimersByTime(301); tap(preview, 2);
  vi.advanceTimersByTime(100); tap(preview, 3, 60, 100);
  expect(expand).not.toHaveBeenCalled(); expect(select).toHaveBeenCalledTimes(3);
});
