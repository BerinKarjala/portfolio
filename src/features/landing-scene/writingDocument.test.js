import { expect, it } from 'vitest';
import { textDocument, formatRange, replaceRange } from '../page-builder/domain/richText';
import { blankDocument, validateDocument, updateBody, styleLines, plainExport, readDocument, saveDocument, DOCUMENT_KEY } from './writingDocument';
it('keeps line styles attached when Enter splits a paragraph and deletion merges lines', () => {
  let doc = blankDocument();
  doc = updateBody(doc, textDocument('First\nSecond'));
  doc = styleLines(doc, { start: 6, end: 12 }, 'bullet');
  doc = updateBody(doc, replaceRange(doc.body, 9, 9, '\n'));
  expect(doc.lineTypes).toEqual(['paragraph', 'bullet', 'bullet']);
  doc = updateBody(doc, replaceRange(doc.body, 5, 6, ''));
  expect(doc.lineTypes).toEqual(['paragraph', 'bullet']);
});
it('exports plain text with list numbering and no HTML formatting', () => {
  let doc = updateBody(blankDocument(), textDocument('Title\nOne\nTwo\nDone'));
  doc = styleLines(doc, { start: 6, end: 13 }, 'number');
  doc.body = formatRange(doc.body, 6, 9, { mark: 'bold' });
  expect(plainExport(doc)).toBe('Title\n1. One\n2. Two\nDone');
});
it('saves validated structured data and never treats markup as executable content', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const doc = updateBody(blankDocument(), textDocument('<script>literal</script>'));
  saveDocument(storage, doc);
  expect(readDocument(storage).document).toEqual(doc);
  expect(plainExport(doc)).toBe('<script>literal</script>');
  expect(() => validateDocument({ ...doc, body: { version: 2, nodes: [{ type: 'link', text: 'bad', href: 'javascript:alert(1)', marks: [], styles: {} }] } })).toThrow();
  expect(() => validateDocument({ ...doc, lineTypes: ['script'] })).toThrow();
  store.set(DOCUMENT_KEY, '{corrupt');
  expect(readDocument(storage).blocked).toBe(true);
  expect(store.get(DOCUMENT_KEY)).toBe('{corrupt');
});
it('reports storage failures instead of claiming a saved document', () => {
  const storage = { setItem: () => { throw new Error('quota'); } };
  expect(() => saveDocument(storage, blankDocument())).toThrow('quota');
});
