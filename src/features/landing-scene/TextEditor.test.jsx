/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TextEditor from './TextEditor';
import { WritingProvider } from './WritingContext';
import { DOCUMENT_KEY, plainExport } from './writingDocument';
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function editor() { return render(<WritingProvider><TextEditor /></WritingProvider>); }
function paste(value) {
  fireEvent.paste(screen.getByRole('textbox', { name: 'Writing area' }), { clipboardData: { getData: type => type === 'text/plain' ? value : '<img src=x onerror=alert(1)>' } });
}
it('stores real title/content locally, counts words and preserves literal pasted text', () => {
  editor();
  fireEvent.change(screen.getByRole('textbox', { name: 'Document title' }), { target: { value: 'Forest notes' } });
  paste('Hello <script>literal</script>');
  expect(screen.getByText('2 words')).not.toBeNull();
  expect(document.querySelector('.pb-rich-surface script, .pb-rich-surface img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  const saved = JSON.parse(localStorage.getItem(DOCUMENT_KEY));
  expect(saved.title).toBe('Forest notes');
  expect(plainExport(saved)).toBe('Hello <script>literal</script>');
  expect(screen.getByRole('status').textContent).toBe('Saved in this browser.');
});
it('undoes and redoes document changes without closing the editor', () => {
  editor(); paste('A quiet place');
  fireEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  expect(screen.getByRole('textbox', { name: 'Writing area' }).textContent).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Redo', exact: true }));
  expect(screen.getByRole('textbox', { name: 'Writing area' }).textContent).toBe('A quiet place');
});
it('keeps the draft and reports a failed save honestly', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  editor(); paste('Keep these words');
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(screen.getByRole('alert').textContent).toMatch(/could not save/i);
  expect(screen.getByRole('textbox', { name: 'Writing area' }).textContent).toBe('Keep these words');
  expect(screen.queryByText('Saved in this browser.')).toBeNull();
});
it('preserves unreadable saved data and still permits draft editing/export', () => {
  localStorage.setItem(DOCUMENT_KEY, '{corrupt'); editor();
  expect(screen.getByRole('alert').textContent).toMatch(/left untouched/i);
  expect(screen.getByRole('button', { name: 'Save', exact: true }).disabled).toBe(true);
  paste('Rescue draft');
  expect(screen.getByRole('button', { name: 'Download', exact: true }).disabled).toBe(false);
  expect(localStorage.getItem(DOCUMENT_KEY)).toBe('{corrupt');
});
it.each(['selectionchange', 'keyup', 'pointerup'])('retains the %s formatting selection when modal/toolbar focus collapses the inactive DOM selection', eventType => {
  render(<WritingProvider><TextEditor/><button>Outside editor</button></WritingProvider>);
  paste('A quiet forest');
  const sheet = screen.getByRole('textbox', {name: 'Writing area'});
  const text = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT).nextNode();
  sheet.focus();
  const range = document.createRange();
  range.setStart(text, 8); range.setEnd(text, 14);
  const selection = window.getSelection();
  act(() => {selection.removeAllRanges(); selection.addRange(range);});
  if (eventType === 'selectionchange') act(() => document.dispatchEvent(new Event('selectionchange')));
  else fireEvent(sheet, new Event(eventType, {bubbles: true}));
  screen.getByRole('button', {name: 'Outside editor'}).focus();
  act(() => {selection.collapse(text, 14); document.dispatchEvent(new Event('selectionchange'));});
  fireEvent.click(screen.getByRole('button', {name: 'Bold', exact: true}));
  expect(sheet.querySelector('strong')?.textContent).toBe('forest');
});
