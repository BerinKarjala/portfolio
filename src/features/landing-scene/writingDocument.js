import { textDocument, richPlainText, validateRichText } from '../page-builder/domain/richText';
import { ensure, object, text } from '../page-builder/domain/validation';
export const DOCUMENT_KEY = 'portfolio:writing-document:v1';
export const LINE_TYPES = ['paragraph', 'heading1', 'heading2', 'bullet', 'number'];
export const blankDocument = () => ({ version: 1, title: 'Untitled document', body: textDocument(''), lineTypes: ['paragraph'] });
const lineAt = (value, offset) => value.slice(0, offset).split('\n').length - 1;
export function validateDocument(doc) {
  object(doc, ['version', 'title', 'body', 'lineTypes'], 'Writing document');
  ensure(doc.version === 1, 'Unsupported document version.');
  text(doc.title, 160, 'document title');
  validateRichText(doc.body);
  ensure(doc.body.nodes.every(node => node.type === 'break' || (node.type === 'text' && node.marks.every(mark => ['bold', 'italic', 'underline'].includes(mark)) && Object.keys(node.styles).length === 0)), 'Unsupported writing format.');
  const plain = richPlainText(doc.body);
  ensure(plain.length <= 20000, 'Documents support up to 20,000 characters.');
  ensure(Array.isArray(doc.lineTypes) && doc.lineTypes.length === plain.split('\n').length && doc.lineTypes.every(type => LINE_TYPES.includes(type)), 'Invalid paragraph styles.');
  return doc;
}
export function updateBody(doc, body) {
  const before = richPlainText(doc.body), after = richPlainText(body);
  if (before === after) return validateDocument({ ...doc, body });
  let start = 0, tail = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  while (tail < before.length - start && tail < after.length - start && before.at(-1 - tail) === after.at(-1 - tail)) tail++;
  const first = lineAt(before, start), last = lineAt(before, before.length - tail);
  const added = after.slice(start, after.length - tail).split('\n').length;
  const lineTypes = [...doc.lineTypes];
  lineTypes.splice(first, last - first + 1, ...Array(added).fill(doc.lineTypes[first] || 'paragraph'));
  return validateDocument({ ...doc, body, lineTypes });
}
export function styleLines(doc, { start, end }, type, toggle = false) {
  ensure(LINE_TYPES.includes(type), 'Unknown paragraph style.');
  const plain = richPlainText(doc.body);
  const first = lineAt(plain, start), last = lineAt(plain, end > start ? end - 1 : end);
  const nextType = toggle && doc.lineTypes.slice(first, last + 1).every(value => value === type) ? 'paragraph' : type;
  return validateDocument({ ...doc, lineTypes: doc.lineTypes.map((value, index) => index >= first && index <= last ? nextType : value) });
}
export function plainExport(doc) {
  let number = 0;
  return richPlainText(doc.body).split('\n').map((line, index) => {
    const type = doc.lineTypes[index];
    number = type === 'number' ? number + 1 : 0;
    return (type === 'bullet' ? '- ' : type === 'number' ? `${number}. ` : '') + line;
  }).join('\n');
}
export function readDocument(storage) {
  try {
    const raw = storage.getItem(DOCUMENT_KEY);
    if (raw === null) return { document: blankDocument(), saved: false };
    ensure(raw.length <= 524288, 'Saved document is too large.');
    return { document: validateDocument(JSON.parse(raw)), saved: true };
  } catch {
    return { document: blankDocument(), saved: false, blocked: true, warning: 'Saved text could not be read. It has been left untouched. You can still write and download this draft.' };
  }
}
export function saveDocument(storage, doc) {
  const serialized = JSON.stringify(validateDocument(doc));
  ensure(serialized.length <= 524288, 'Document is too large to save.');
  storage.setItem(DOCUMENT_KEY, serialized);
}
export const downloadName = title => `${title.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '').trim().replace(/[. ]+$/g, '').slice(0, 100) || 'Untitled document'}.txt`;
