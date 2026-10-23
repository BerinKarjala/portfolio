import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { blankDocument, readDocument, saveDocument, validateDocument } from './writingDocument';
import { richPlainText } from '../page-builder/domain/richText';
const WritingContext = createContext(null);
export function WritingProvider({ children }) {
  const [state, setState] = useState(() => ({ model: blankDocument(), past: [], future: [], initialized: false, saved: false, signature: JSON.stringify(blankDocument()), error: '', blocked: false }));
  const current = useRef(state);
  current.current = state;
  const selection = useRef({ start: 0, end: 0 });
  const loaded = useRef(false);
  const group = useRef(null);
  const publish = next => { current.current = next; setState(next); };
  const initialize = useCallback(() => {
    if (loaded.current) return;
    loaded.current = true;
    let result;
    try { result = readDocument(window.localStorage); }
    catch { result = { document: blankDocument(), blocked: true, warning: 'Browser storage is unavailable. You can still write and download this draft.' }; }
    const previous = current.current;
    const next = { ...previous, model: result.document, signature: JSON.stringify(result.document), initialized: true, saved: !!result.saved, error: result.warning || '', blocked: !!result.blocked };
    current.current = next;
    setState(next);
  }, []);
  const dirty = JSON.stringify(state.model) !== state.signature;
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(model, key, ranges) {
    validateDocument(model);
    const previous = current.current;
    if (JSON.stringify(model) === JSON.stringify(previous.model)) return;
    // A paragraph boundary gets its own undo step, separate from nearby typing.
    if (key === 'typing' && richPlainText(model.body).split('\n').length !== richPlainText(previous.model.body).split('\n').length) key = undefined;
    const now = Date.now();
    const join = key && group.current?.key === key && now - group.current.time < 750 && (key === 'title' || (ranges?.before.start === ranges?.before.end && ranges?.before.start === group.current.end));
    const entry = { model: previous.model, range: ranges?.before || selection.current };
    publish({ ...previous, model, past: join ? previous.past : [...previous.past, entry].slice(-50), future: [], error: previous.blocked ? previous.error : '' });
    selection.current = ranges?.after || selection.current;
    group.current = key ? { key, time: now, end: selection.current.end } : null;
  }
  function history(direction, range) {
    const previous = current.current;
    const undo = direction === 'UNDO';
    const source = undo ? previous.past : previous.future;
    if (!source.length) return selection.current;
    const target = source.at(-1);
    const entry = { model: previous.model, range: range || selection.current };
    publish({ ...previous, model: target.model, past: undo ? source.slice(0, -1) : [...previous.past, entry].slice(-50), future: undo ? [...previous.future, entry].slice(-50) : source.slice(0, -1), error: previous.blocked ? previous.error : '' });
    selection.current = target.range;
    group.current = null;
    return target.range;
  }
  function save() {
    const previous = current.current;
    if (previous.blocked) return;
    try {
      saveDocument(window.localStorage, previous.model);
      publish({ ...previous, signature: JSON.stringify(previous.model), saved: true, error: '' });
    } catch { publish({ ...previous, error: 'Could not save in this browser. Your draft is still here; use Download to keep a copy.' }); }
  }
  return <WritingContext.Provider value={{ ...state, dirty, initialize, change, history, save, selection }}>{children}</WritingContext.Provider>;
}
export const useWriting = () => useContext(WritingContext);
