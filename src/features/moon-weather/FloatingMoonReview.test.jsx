/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FloatingMoonReview from './FloatingMoonReview';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows clearly labeled weather samples without requesting location', () => {
  const locate = vi.fn();
  vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: locate } });
  render(<FloatingMoonReview />);
  expect(screen.getByText(/weather samples are illustrative/i)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Weather sample'), { target: { value: '45' } });
  const moon = screen.getByRole('button', { name: 'Moon and weather' });
  expect(within(moon).getByRole('img', { name: /sunlight through fog/i })).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Daytime'));
  expect(within(moon).getByRole('img', { name: /fog/i }).getAttribute('aria-label')).not.toMatch(/sunlight/i);
  fireEvent.click(moon);
  expect(screen.getByText(/fog.*sample/i)).toBeTruthy();
  expect(locate).not.toHaveBeenCalled();
});

it('opens the calendar and returns focus to the moon after closing it', () => {
  render(<FloatingMoonReview />);
  const moon = screen.getByRole('button', { name: 'Moon and weather' });
  fireEvent.click(moon);
  fireEvent.click(screen.getByRole('button', { name: 'Calendar', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Calendar' });
  expect(within(dialog).getByRole('button', { name: 'Today' })).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close calendar' }));
  expect(screen.queryByRole('dialog', { name: 'Calendar' })).toBeNull();
  expect(document.activeElement).toBe(moon);
});
