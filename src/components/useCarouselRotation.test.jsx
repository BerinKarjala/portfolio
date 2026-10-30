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
  function Harness({blocked = false, count = 4}) {
    const rotation = useCarouselRotation({blocked, count, advance});
    return <div {...rotation.interactions} data-carousel-stage data-motion={rotation.autoMotion}>
      <button data-rotation-control onClick={() => rotation.command?.(-1)}>Previous</button>
      <button data-rotation-control onClick={() => rotation.command?.(1)}>Next</button>
      <button data-carousel-card onClick={() => rotation.hold?.()}>Card</button>
    </div>;
  }
  return {advance, ...render(<Harness {...props}/>), Harness};
}
it('uses a twelve-second slide-start cadence', () => {
  expect(ROTATION_INTERVAL).toBe(12000);
  const {advance} = setup();
  tick(11999); expect(advance).not.toHaveBeenCalled();
  tick(1); expect(advance).toHaveBeenLastCalledWith(1);
  tick(12000); expect(advance).toHaveBeenCalledTimes(2);
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
