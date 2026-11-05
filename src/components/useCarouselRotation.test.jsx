/* @vitest-environment jsdom */
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import useCarouselRotation, {ROTATION_INTERVAL} from './useCarouselRotation';

let media;
beforeEach(() => {
  vi.useFakeTimers();
  media = new EventTarget();
  media.matches = false;
  vi.stubGlobal('matchMedia', () => media);
});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();});
const tick = ms => act(() => vi.advanceTimersByTime(ms));
function setup(props = {}) {
  const advance = vi.fn();
  function Harness({blocked = false, count = 4, steering = null, preserveWritingHome = false}) {
    const rotation = useCarouselRotation({blocked, count, advance, steering, preserveWritingHome});
    return <div ref={rotation.stageRef} {...rotation.interactions} data-carousel-stage data-motion={rotation.autoMotion} data-writing-home={rotation.writingHomeOffset}>
      <button data-rotation-control onClick={() => rotation.command?.(-1)}>Previous</button>
      <button data-rotation-control onClick={() => rotation.command?.(1)}>Next</button>
      <button data-carousel-card onClick={() => rotation.hold?.()}>Card</button>
    </div>;
  }
  return {advance, ...render(<Harness {...props}/>), Harness};
}
it('places the writing set to the right for leftward motion and to the left for rightward motion', () => {
  const {container} = setup();
  const stage = container.querySelector('[data-carousel-stage]');
  expect(Number(stage.dataset.writingHome)).toBeGreaterThan(0);
  fireEvent.click(screen.getByText('Previous'));
  expect(Number(stage.dataset.writingHome)).toBeLessThan(0);
  tick(1600);
  fireEvent.focus(screen.getByText('Card'));
  expect(Number(stage.dataset.writingHome)).toBe(0);
});
it('uses a twelve-second slide-start cadence', () => {
  expect(ROTATION_INTERVAL).toBe(12000);
  const {advance} = setup();
  tick(11999); expect(advance).not.toHaveBeenCalled();
  tick(1); expect(advance).toHaveBeenLastCalledWith(1);
  tick(12000); expect(advance).toHaveBeenCalledTimes(2);
});
it('steers smoothly in either direction at up to four times idle speed', () => {
  const {advance, rerender, Harness} = setup();
  rerender(<Harness steering={1}/>);
  tick(1500);
  expect(advance).not.toHaveBeenCalled();
  // Reversing from halfway through a leftward step retraces that distance
  // before reaching the next rightward card; it must not jump on direction change.
  rerender(<Harness steering={-1}/>);
  tick(4499); expect(advance).not.toHaveBeenCalled();
  tick(1); expect(advance).toHaveBeenLastCalledWith(-1);
  rerender(<Harness steering={null}/>);
  tick(11999); expect(advance).toHaveBeenCalledTimes(1);
  tick(1); expect(advance).toHaveBeenCalledTimes(2);
  expect(advance).toHaveBeenLastCalledWith(-1);
});
it.each([
  [1, 3000, 1], [.5, 4800, 1], [0, 12000, 1], [-.5, 4800, -1], [-1, 3000, -1],
])('uses position %s to set direction and %sms cadence', (steering, interval, direction) => {
  const {advance} = setup({steering});
  tick(interval - 1); expect(advance).not.toHaveBeenCalled();
  tick(1); expect(advance).toHaveBeenLastCalledWith(direction);
});
it('holds a selected card through blur and resumes left immediately and on later cycles', () => {
  const {advance} = setup();
  fireEvent.click(screen.getByText('Card'));
  fireEvent.blur(screen.getByText('Card'));
  tick(36000); expect(advance).not.toHaveBeenCalled();
  fireEvent.focus(screen.getByText('Previous'));
  fireEvent.click(screen.getByText('Previous'));
  expect(advance).toHaveBeenLastCalledWith(-1);
  tick(1600);
  tick(12000); expect(advance).toHaveBeenCalledTimes(2);
  expect(advance).toHaveBeenLastCalledWith(-1);
});
it('keyboard focus on card content holds until an arrow command', () => {
  const {advance} = setup();
  fireEvent.focus(screen.getByText('Card'));
  fireEvent.blur(screen.getByText('Card'));
  tick(24000); expect(advance).not.toHaveBeenCalled();
  fireEvent.focus(screen.getByText('Next'));
  fireEvent.click(screen.getByText('Next'));
  tick(1600);
  tick(12000); expect(advance.mock.calls).toEqual([[1], [1]]);
});
it('bounds rapid direction changes to the current step and latest pending step', () => {
  const {advance} = setup();
  fireEvent.click(screen.getByText('Next'));
  fireEvent.click(screen.getByText('Next'));
  fireEvent.click(screen.getByText('Previous'));
  fireEvent.click(screen.getByText('Previous'));
  expect(advance.mock.calls).toEqual([[1]]);
  tick(1600); expect(advance.mock.calls).toEqual([[1], [-1]]);
  tick(1600);
  tick(12000); expect(advance.mock.calls).toEqual([[1], [-1], [-1]]);
});
it('does not let pointer hover on an arrow cancel its own command', () => {
  const {advance} = setup();
  fireEvent.pointerEnter(screen.getByText('Next'), {pointerType: 'mouse'});
  fireEvent.click(screen.getByText('Next'));
  tick(1600);
  tick(12000); expect(advance.mock.calls).toEqual([[1], [1]]);
});
it('pauses the current automatic cycle on hover and resumes the remaining time', () => {
  const {advance} = setup();
  tick(5000);
  fireEvent.pointerOver(screen.getByText('Card'), {pointerType: 'mouse'});
  tick(20000); expect(advance).not.toHaveBeenCalled();
  fireEvent.pointerOut(screen.getByText('Card'), {pointerType: 'mouse'});
  tick(6999); expect(advance).not.toHaveBeenCalled();
  tick(1); expect(advance).toHaveBeenCalledOnce();
});
it('keeps the writing set in place while hovering temporarily pauses the carousel', () => {
  const {container} = setup();
  const stage = container.querySelector('[data-carousel-stage]');
  const restingPosition = stage.dataset.writingHome;
  fireEvent.pointerOver(stage, {pointerType: 'mouse'});
  expect(stage.dataset.motion).toBe('paused');
  expect(stage.dataset.writingHome).toBe(restingPosition);
  fireEvent.pointerOut(stage, {pointerType: 'mouse'});
  expect(stage.dataset.motion).toBe('running');
  expect(stage.dataset.writingHome).toBe(restingPosition);
});
it('pauses when the pointer enters the stage before it reaches a moving card', () => {
  const {advance, container} = setup();
  const stage = container.querySelector('[data-carousel-stage]');
  tick(5000);
  fireEvent.pointerOver(stage, {pointerType: 'mouse'});
  tick(20000); expect(advance).not.toHaveBeenCalled();
  fireEvent.pointerOut(screen.getByText('Card'), {pointerType: 'mouse', relatedTarget: screen.getByText('Next')});
  tick(2000); expect(advance).not.toHaveBeenCalled();
  fireEvent.pointerOut(stage, {pointerType: 'mouse'});
  tick(7000); expect(advance).toHaveBeenCalledOnce();
});
it('keeps a pointer-focused card in place until its click can select it', () => {
  const {container} = setup();
  const stage = container.querySelector('[data-carousel-stage]');
  const card = screen.getByText('Card');
  tick(5000);
  fireEvent.pointerOver(stage, {pointerType: 'mouse'});
  fireEvent.pointerDown(card, {pointerType: 'mouse', button: 0});
  fireEvent.focus(card);
  expect(stage.dataset.motion).toBe('paused');
  fireEvent.pointerUp(window, {pointerType: 'mouse'});
  fireEvent.click(card);
  expect(stage.dataset.motion).toBe('off');
});
it('blocks manual and automatic movement for a tool and starts a fresh delay afterwards', () => {
  const {advance, rerender, Harness} = setup({blocked: true});
  fireEvent.click(screen.getByText('Next'));
  tick(36000); expect(advance).not.toHaveBeenCalled();
  rerender(<Harness blocked={false}/>);
  tick(11999); expect(advance).not.toHaveBeenCalled();
  tick(1); expect(advance).toHaveBeenCalledOnce();
});
it.each([1, -1])('preserves the writing set position when interaction blocks rotation in direction %i', direction => {
  const {advance, container, rerender, Harness} = setup();
  if (direction < 0) {
    fireEvent.click(screen.getByText('Previous'));
    tick(1600);
  }
  const stage = container.querySelector('[data-carousel-stage]');
  const restingPosition = stage.dataset.writingHome;
  expect(Math.sign(Number(restingPosition))).toBe(direction);
  advance.mockClear();
  rerender(<Harness blocked preserveWritingHome />);
  expect(stage.dataset.motion).toBe('off');
  expect(stage.dataset.writingHome).toBe(restingPosition);
  tick(24000);
  expect(advance).not.toHaveBeenCalled();
  expect(stage.dataset.writingHome).toBe(restingPosition);
  rerender(<Harness blocked={false} />);
  expect(stage.dataset.motion).toBe('running');
  expect(stage.dataset.writingHome).toBe(restingPosition);
});
it('centers the writing set when a tool blocks rotation', () => {
  const {container, rerender, Harness} = setup();
  const stage = container.querySelector('[data-carousel-stage]');
  expect(Number(stage.dataset.writingHome)).not.toBe(0);
  rerender(<Harness blocked />);
  expect(stage.dataset.motion).toBe('off');
  expect(Number(stage.dataset.writingHome)).toBe(0);
});
it('honors live reduced-motion changes while retaining immediate manual stepping', () => {
  const {advance} = setup();
  act(() => {media.matches = true; media.dispatchEvent(new Event('change'));});
  tick(36000); expect(advance).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Previous'));
  fireEvent.click(screen.getByText('Next'));
  expect(advance.mock.calls).toEqual([[-1], [1]]);
  act(() => {media.matches = false; media.dispatchEvent(new Event('change'));});
  tick(12000); expect(advance).toHaveBeenCalledTimes(3);
});
it('cleans all scheduler and transition timers on unmount', () => {
  const {unmount} = setup();
  fireEvent.click(screen.getByText('Next'));
  unmount(); expect(vi.getTimerCount()).toBe(0);
});
it.each([0, 1])('does not schedule or step a %i-card gallery', count => {
  const {advance} = setup({count});
  fireEvent.click(screen.getByText('Next'));
  tick(36000); expect(advance).not.toHaveBeenCalled();
});
