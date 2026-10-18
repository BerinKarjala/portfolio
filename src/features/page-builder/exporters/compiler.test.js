// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createProject, documentText } from '../domain/project';
import { applyCommand } from '../domain/structure';
import { compileProject, previewDocument, prepareExport } from './compiler';
import { packageZip } from './zip';

function fixture() {
  let p = createProject({ name: 'Export & learn', templateId: 'blank' });
  for (const type of ['heading', 'paragraph', 'link', 'button', 'divider', 'image', 'nav', 'list', 'form', 'table', 'gallery', 'icon', 'video', 'audio', 'embed', 'card']) {
    p = applyCommand(p, {type:'ADD', component:type, parentId:null}).project;
  }
  return p;
}
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
describe('standalone compiler', () => {
  it('produces deterministic safe HTML and CSS, metadata and native components without a runtime', () => {
    const p = fixture();
    const h = Object.values(p.page.elements).find(e => e.type === 'heading');
    h.props.document = documentText('<script>alert("x")</script> & words');
    const first = compileProject(p), second = compileProject(structuredClone(p));
    expect(first).toEqual(second);
    expect(first.errors).toEqual([]);
    const d = parse(first.html);
    expect(d.querySelector('h2').textContent).toBe('<script>alert("x")</script> & words');
    expect(d.querySelectorAll('script,[onclick],[style]')).toHaveLength(0);
    expect(d.querySelector('link[rel=stylesheet]').getAttribute('href')).toBe('styles.css');
    expect(d.title).toBe('Export & learn');
    expect(d.querySelector('form').getAttribute('method')).toBe('POST');
    expect(d.querySelector('label').htmlFor).toBe(d.querySelector('form input').id);
    for (const tag of ['nav','details','table','th[scope=col]','figure','svg','video','audio','iframe','article']) expect(d.querySelector(tag)).not.toBeNull();
    expect(first.css).toContain('prefers-reduced-motion');
    expect(first.css).toContain('max-width: 599px');
    expect(p).toEqual(structuredClone(p));
  });
  it('blocks executable, invalid layout, duplicate IDs and CSS data before serialization', () => {
    const mutations = [p => p.page.elements[p.page.rootElementIds[0]].props.onclick = 'alert(1)', p => p.globalStyles.backgroundImage = 'javascript:alert(1)', p => p.page.rootElementIds.push(p.page.rootElementIds[0]), p => {const e=Object.values(p.page.elements); e[0].htmlId=e[1].htmlId='same';}];
    for (const mutate of mutations) {
      const p=fixture(); mutate(p); const result=compileProject(p);
      expect(result.errors.length).toBeGreaterThan(0); expect(result.html).toBe(''); expect(result.css).toBe('');
      expect(() => prepareExport(p, {acknowledgeWarnings:true})).toThrow();
    }
  });
  it('omits globally hidden subtrees and retains breakpoint-hidden content with CSS', () => {
    const p=fixture(), nodes=Object.values(p.page.elements);
    nodes[0].visibility.globalHidden=true; nodes[1].visibility.mobile=false;
    const c=compileProject(p), d=parse(c.html);
    expect(d.querySelector('.'+c.classes[nodes[0].id])).toBeNull();
    expect(d.querySelector('.'+c.classes[nodes[1].id])).not.toBeNull();
    expect(c.css).toContain('.'+c.classes[nodes[1].id]+' { display: none !important; }');
    expect(c.css).not.toContain('.'+c.classes[nodes[0].id]+' {');
  });
  it('previews the compiled document in an inert navigation mode while exports retain endpoints', () => {
    const p=fixture(), c=compileProject(p), preview=parse(previewDocument(c));
    expect(preview.querySelector('form').getAttribute('action')).toBeNull();
    expect(preview.querySelector('a').getAttribute('href')).toBeNull();
    expect(preview.querySelector('style').textContent).toBe(c.css);
    expect(preview.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toContain("form-action 'none'");
    expect(preview.querySelector('script')).toBeNull();
    expect(parse(c.html).querySelector('form').getAttribute('action')).toBe('https://example.com/contact');
  });
  it('requires warning acknowledgement for every delivery mode and returns a safe slug', () => {
    const p=fixture(); p.name='../../Résumé <test>';
    const image=Object.values(p.page.elements).find(e=>e.type==='image'); image.props.alt='';
    expect(compileProject(p).warnings.some(w=>w.code==='missing-alt' && w.elementId===image.id)).toBe(true);
    expect(() => prepareExport(p)).toThrow(/warnings/i);
    const c=prepareExport(p,{acknowledgeWarnings:true});
    expect(c.filename).toBe('resume-test.zip');
    expect(Object.keys(c.files)).toEqual(['index.html','styles.css']);
  });
  it('packages exactly two UTF-8 files with valid ZIP headers and CRCs', () => {
    const bytes=packageZip({'index.html':'é🌱','styles.css':'body { color: green; }'});
    const view=new DataView(bytes.buffer); let at=0; const names=[];
    while(view.getUint32(at,true)===0x04034b50) {
      const length=view.getUint32(at+18,true), nameLength=view.getUint16(at+26,true), extra=view.getUint16(at+28,true);
      expect(view.getUint16(at+8,true)).toBe(0);
      names.push(new TextDecoder().decode(bytes.slice(at+30,at+30+nameLength)));
      at+=30+nameLength+extra+length;
    }
    expect(names).toEqual(['index.html','styles.css']); expect(view.getUint32(at,true)).toBe(0x02014b50);
    expect(() => packageZip({'x.js':'bad'})).toThrow();
  });
});
