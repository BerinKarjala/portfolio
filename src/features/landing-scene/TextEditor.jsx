import { useEffect, useState } from 'react';
import { RichText, RichTextEditor } from '../page-builder/components/RichText';
import { richPlainText } from '../page-builder/domain/richText';
import { saveDownload } from '../css-studio/useGeneratedImages';
import { useWriting } from './WritingContext';
import { downloadName, plainExport, styleLines, updateBody } from './writingDocument';
import './writing.css';

function Lines({ document, types }) {
  const lines = [[]];
  for (const node of document.nodes) {
    if (node.type === 'break') lines.push([]);
    else node.text.split('\n').forEach((part, index) => {
      if (index) lines.push([]);
      lines.at(-1).push({ ...node, text: part });
    });
  }
  const result = [];
  for (let i = 0; i < lines.length;) {
    const kind = types[i] || 'paragraph';
    const content = index => <><RichText document={{ version: 2, nodes: lines[index] }} />{index < lines.length - 1 && <br />}</>;
    if (kind === 'bullet' || kind === 'number') {
      const start = i, children = [];
      while (i < lines.length && types[i] === kind) {
        const index = i++;
        children.push(<li key={index} data-writing-line>{content(index)}</li>);
      }
      const List = kind === 'bullet' ? 'ul' : 'ol';
      result.push(<List key={start}>{children}</List>);
    } else {
      // Visual heading levels belong to the document, below the utility heading.
      result.push(<div key={i} data-writing-line className={`writing-line--${kind}`}>{content(i)}</div>);
      i++;
    }
  }
  return result;
}
export default function TextEditor({ onClose }) {
  const writing = useWriting();
  const { model, initialize } = writing;
  const [downloadError, setDownloadError] = useState('');
  const [selectionStart, setSelectionStart] = useState(writing.selection.current.start);
  useEffect(initialize, [initialize]);
  const words = richPlainText(model.body).trim().split(/\s+/u).filter(Boolean).length;
  function download() {
    try {
      saveDownload(new Blob([plainExport(model)], { type: 'text/plain;charset=utf-8' }), downloadName(model.title));
      setDownloadError('');
    } catch { setDownloadError('Download could not start. Your draft is still here.'); }
  }
  return <div className="writing-editor" onKeyDownCapture={event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); writing.save(); }
  }}>
    <input className="writing-title" aria-label="Document title" maxLength={160} value={model.title} onChange={event => writing.change({ ...model, title: event.target.value }, 'title')} />
    <RichTextEditor
      document={model.body} inlineToolbar autoFocus={false} hideHelp plainTextDrop
      disabled={!writing.initialized} surfaceLabel="Writing area" placeholder="Start writing…"
      initialSelection={writing.selection.current}
      onSelectionChange={range => { writing.selection.current = range; setSelectionStart(range.start); }}
      onChange={(body, key, ranges) => writing.change(updateBody(model, body), key, ranges)}
      onHistory={writing.history} onDone={() => onClose?.()}
      renderDocument={body => <Lines document={body} types={model.lineTypes} />}
      renderToolbar={({ format, history, preserveSelection }) => <div className="writing-toolbar" role="toolbar" aria-label="Document formatting">
        <button aria-label="Undo" disabled={!writing.past.length} onMouseDown={event => event.preventDefault()} onClick={() => history('UNDO')}>↶</button>
        <button aria-label="Redo" disabled={!writing.future.length} onMouseDown={event => event.preventDefault()} onClick={() => history('REDO')}>↷</button>
        <select aria-label="Paragraph style" value={model.lineTypes[richPlainText(model.body).slice(0, selectionStart).split('\n').length - 1] || 'paragraph'} onChange={event => preserveSelection(range => writing.change(styleLines(model, range, event.target.value)))}>
          <option value="paragraph">Paragraph</option><option value="heading1">Heading 1</option><option value="heading2">Heading 2</option>
          <option value="bullet">Bulleted list</option><option value="number">Numbered list</option>
        </select>
        {[['bold', 'Bold', 'B'], ['italic', 'Italic', 'I'], ['underline', 'Underline', 'U']].map(([mark, label, icon]) => <button key={mark} aria-label={label} className={`writing-mark--${mark}`} onMouseDown={event => event.preventDefault()} onClick={() => format({ mark })}>{icon}</button>)}
        <button aria-label="Bulleted list" onMouseDown={event => event.preventDefault()} onClick={() => preserveSelection(range => writing.change(styleLines(model, range, 'bullet', true)))}>☷</button>
        <button className="writing-numbered" aria-label="Numbered list" onMouseDown={event => event.preventDefault()} onClick={() => preserveSelection(range => writing.change(styleLines(model, range, 'number', true)))}>≡</button>
      </div>}
    />
    <div className="writing-footer"><span>{words} {words === 1 ? 'word' : 'words'}</span><button onClick={writing.save} disabled={writing.blocked || !writing.initialized}>Save</button><button onClick={download}>Download</button></div>
    <p className="writing-save-status" role="status">{writing.dirty ? 'Unsaved changes.' : writing.saved ? 'Saved in this browser.' : 'Not saved yet.'}</p>
    {(writing.error || downloadError) && <p role="alert">{writing.error || downloadError}</p>}
    <p className="writing-help">Close keeps your draft until reload. Save stores it in this browser. Downloads are plain text.</p>
  </div>;
}
