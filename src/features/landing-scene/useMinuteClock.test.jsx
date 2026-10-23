/* @vitest-environment jsdom */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import useMinuteClock from './useMinuteClock';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('crosses midnight on the minute and catches up after sleep/resume', () => {
  vi.useFakeTimers(); vi.setSystemTime('2024-02-29T23:59:50Z');
  const { result, unmount } = renderHook(() => useMinuteClock());
  act(() => vi.advanceTimersByTime(10000));
  expect(result.current.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  vi.setSystemTime('2024-03-02T09:12:00Z');
  act(() => window.dispatchEvent(new Event('pageshow')));
  expect(result.current.toISOString()).toBe('2024-03-02T09:12:00.000Z');
  unmount(); expect(vi.getTimerCount()).toBe(0);
});
it('formats a DST boundary correctly and suspends timers while hidden', () => {
  vi.useFakeTimers(); vi.setSystemTime('2024-03-10T06:59:50Z');
  const { result } = renderHook(() => useMinuteClock());
  const format = date => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(date);
  expect(format(result.current)).toBe('1:59 AM');
  act(() => vi.advanceTimersByTime(10000));
  expect(format(result.current)).toBe('3:00 AM');
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(vi.getTimerCount()).toBe(0);
  vi.setSystemTime('2024-03-11T12:00:00Z');
  visibility.mockReturnValue('visible');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current.toISOString()).toBe('2024-03-11T12:00:00.000Z');
});
