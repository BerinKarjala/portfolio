/* @vitest-environment jsdom */
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import WritingSet from './WritingSet';
import {SceneContext} from './SceneContext';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('innerWidth', 1000);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  vi.stubGlobal('requestAnimationFrame', callback => setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', id => clearTimeout(id));
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    constructor(type, options) { super(type, options); Object.assign(this, {pointerId: options.pointerId ?? 1, pointerType: options.pointerType ?? 'mouse'}); }
  });
});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();});

function scene() {
  const openEditor = vi.fn(), onSteer = vi.fn();
  const desk = {current: {getBoundingClientRect: () => ({left: 0, right: 1000, top: 500, bottom: 800, width: 1000, height: 300})}};
  render(<SceneContext.Provider value={{openEditor, setWritingInteracting: vi.fn(), editorLauncher: {current: null}}}><WritingSet deskRef={desk} onSteer={onSteer} /></SceneContext.Provider>);
  const object = screen.getByRole('button', {name: 'Open text editor with the inkwell'});
  object.setPointerCapture = vi.fn(); object.releasePointerCapture = vi.fn(); object.hasPointerCapture = () => true;
  object.getBoundingClientRect = () => {
    const match = object.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/);
    const x = Number(match?.[1] || 0), y = Number(match?.[2] || 0);
    return {left: 600 + x, right: 700 + x, top: 575 + y, bottom: 675 + y, width: 100, height: 100};
  };
  return {object, inkwell: object.querySelector('.landing-inkwell'), openEditor, onSteer};
}
const pointer = (x, type = 'mouse') => ({pointerId: 1, pointerType: type, button: 0, buttons: 1, clientX: x, clientY: 625});

it('opens the editor on a double click, but not a single pointer click', () => {
  const {inkwell, openEditor} = scene();
  fireEvent.click(inkwell, {detail: 1});
  expect(openEditor).not.toHaveBeenCalled();
  fireEvent.doubleClick(inkwell, {detail: 2});
  expect(openEditor).toHaveBeenCalledOnce();
});

it('opens the editor on a double touch tap and keeps keyboard activation available', () => {
  const {object, inkwell, openEditor} = scene();
  fireEvent.pointerDown(inkwell, pointer(650, 'touch')); fireEvent.pointerUp(inkwell, pointer(650, 'touch'));
  act(() => vi.advanceTimersByTime(100));
  fireEvent.pointerDown(inkwell, pointer(650, 'touch')); fireEvent.pointerUp(inkwell, pointer(650, 'touch'));
  expect(openEditor).toHaveBeenCalledOnce();
  fireEvent.keyDown(object, {key: 'Enter'}); fireEvent.click(object, {detail: 0});
  expect(openEditor).toHaveBeenCalledTimes(2);
});

it('steers toward both screen edges and returns to the desk after release', () => {
  const {object, inkwell, openEditor, onSteer} = scene();
  fireEvent.pointerDown(inkwell, pointer(650));
  fireEvent.pointerMove(inkwell, pointer(950));
  expect(onSteer).toHaveBeenLastCalledWith(1);
  fireEvent.pointerMove(inkwell, pointer(50));
  expect(onSteer).toHaveBeenLastCalledWith(-1);
  expect(openEditor).not.toHaveBeenCalled();
  fireEvent.pointerUp(inkwell, pointer(50));
  expect(onSteer).toHaveBeenLastCalledWith(null);
  act(() => vi.advanceTimersByTime(1300));
  expect(object.style.transform).toContain('translate(0px, 0px)');
});

it('resumes an interrupted return after a stationary tap', () => {
  const {object, inkwell} = scene();
  fireEvent.pointerDown(inkwell, pointer(650));
  fireEvent.pointerMove(inkwell, pointer(950));
  fireEvent.pointerUp(inkwell, pointer(950));
  act(() => vi.advanceTimersByTime(400));
  fireEvent.pointerDown(inkwell, pointer(850));
  fireEvent.pointerUp(inkwell, pointer(850));
  act(() => vi.advanceTimersByTime(1800));
  expect(object.style.transform).toContain('translate(0px, 0px)');
});

it('finishes an ongoing return immediately when reduced motion is enabled', () => {
  const media = new EventTarget(); media.matches = false;
  vi.stubGlobal('matchMedia', () => media);
  const {object, inkwell} = scene();
  fireEvent.pointerDown(inkwell, pointer(650));
  fireEvent.pointerMove(inkwell, pointer(950));
  fireEvent.pointerUp(inkwell, pointer(950));
  act(() => vi.advanceTimersByTime(100));
  act(() => {media.matches = true; media.dispatchEvent(new Event('change'));});
  expect(object.style.transform).toContain('translate(0px, 0px)');
});

it('stops steering when a second touch interrupts a drag', () => {
  const {inkwell, onSteer, openEditor} = scene();
  fireEvent.pointerDown(inkwell, pointer(650, 'touch'));
  fireEvent.pointerMove(inkwell, pointer(900, 'touch'));
  fireEvent.pointerDown(inkwell, {...pointer(850, 'touch'), pointerId: 2});
  expect(onSteer).toHaveBeenLastCalledWith(null);
  fireEvent.pointerUp(inkwell, pointer(900, 'touch'));
  fireEvent.pointerUp(inkwell, {...pointer(850, 'touch'), pointerId: 2});
  expect(onSteer).toHaveBeenLastCalledWith(null);
  expect(openEditor).not.toHaveBeenCalled();
});
