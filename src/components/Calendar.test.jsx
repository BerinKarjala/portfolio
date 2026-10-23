/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import Calendar from './Calendar';
afterEach(cleanup);
it('browses real months and leap days without event controls', () => {
  render(<Calendar today={new Date(2024, 1, 29, 12)} />);
  expect(screen.getByRole('heading', { name: 'February 2024' })).not.toBeNull();
  const selected = screen.getByRole('button', { name: 'Thursday, February 29, 2024' });
  expect(selected.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('heading', { name: 'March 2024' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Friday, March 1, 2024' }));
  expect(screen.getByText('Friday, March 1')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(screen.getByRole('button', { name: 'Thursday, February 29, 2024' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('button', { name: /add event/i })).toBeNull();
});
it('moves date focus across month and year boundaries with arrow keys', () => {
  render(<Calendar today={new Date(2024, 11, 31, 12)} />);
  const end = screen.getByRole('button', { name: 'Tuesday, December 31, 2024' });
  end.focus();
  fireEvent.keyDown(end, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Wednesday, January 1, 2025' }));
  fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Wednesday, December 25, 2024' }));
});
it('uses the granted location timezone to determine Today near midnight', () => {
  render(<Calendar today={new Date('2024-03-01T01:00:00Z')} timeZone="America/Los_Angeles" />);
  expect(screen.getByRole('button', { name: 'Thursday, February 29, 2024' }).getAttribute('aria-current')).toBe('date');
  expect(screen.getByRole('heading', { name: 'February 2024' })).not.toBeNull();
});
