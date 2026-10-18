import { validateProject, plainText } from '../domain/project';
import { resolveStyles, colorToHex } from '../domain/styles';

export function visibleElements(project) {
  const result=[];
  function visit(id) {
    const e=project.page.elements[id];
    if (e.visibility.globalHidden) return;
    result.push(e); e.children.forEach(visit);
  }
  project.page.rootElementIds.forEach(visit);
  return result;
}
function luminance(color) {
  try {
    const h=colorToHex(color); if(h.length!==7) return null;
    const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    return .2126*v[0]+.7152*v[1]+.0722*v[2];
  } catch {return null;}
}
export function preflight(project, observedFailures=[]) {
  const errors=[],warnings=[];
  try { validateProject(project); } catch(error) {
    errors.push({code:'invalid-project',message:error.message,elementId:null});
    return {errors,warnings};
  }
  const nodes=visibleElements(project), htmlIds=new Set(nodes.map(e=>e.htmlId).filter(Boolean));
  let heading=0;
  const warn=(code,message,e)=>warnings.push({code,message,elementId:e?.id || null});
  if (!nodes.length) warn('empty-page','This page has no visible content.');
  if (!project.page.metadata.description) warn('missing-description','Add a page description in Page settings.');
  for(const e of nodes) {
    const p=e.props, s=resolveStyles(project,e.id);
    if(e.type==='image' && !e.accessibility.decorative && !p.alt.trim()) warn('missing-alt','Add alternative text or mark this image decorative.',e);
    if(e.type==='gallery' && p.images.some(i=>!i.alt.trim())) warn('missing-alt','Add alternative text to each gallery image.',e);
    if(e.type==='heading') {
      if(p.level>heading+1) warn('heading-order','Heading levels skip a level. Review the page outline.',e);
      if(!plainText(e).trim()) warn('empty-heading','This heading has no text.',e);
      heading=p.level;
    }
    const links=[p.href,...(p.document?.nodes || []).filter(n=>n.type==='link').map(n=>n.href)].filter(Boolean);
    if(links.some(h=>h.startsWith('#')&&!htmlIds.has(h.slice(1)))) warn('missing-anchor','An internal link points to a missing or globally hidden section.',e);
    if(e.type==='form' && p.method==='GET') warn('form-privacy','GET puts submitted values in the URL. Use POST for personal information.',e);
    if(p.autoplay) warn('autoplay','Browsers may block autoplay. Keep native controls available.',e);
    if(['video','audio'].includes(e.type) && !p.controls) warn('media-controls','This media has no native controls.',e);
    if(e.type==='video' && !p.captions) warn('missing-captions','Add captions for meaningful video audio.',e);
    if(s.backgroundImage) warn('background-contrast','Check text contrast over this external background. Its load status is unknown.',e);
    let bg=s.backgroundColor;
    let at=e;
    while(!bg && at.parentId) { at=project.page.elements[at.parentId]; bg=resolveStyles(project,at.id).backgroundColor; }
    bg ||= project.globalStyles.backgroundColor;
    const a=luminance(s.color),b=luminance(bg);
    if(a!==null && b!==null && (Math.max(a,b)+.05)/(Math.min(a,b)+.05)<4.5) warn('contrast','Text and background may have insufficient contrast. Review at every breakpoint.',e);
    if(e.positionMode==='absolute' && (e.geometry.x<0 || e.geometry.y<0 || e.geometry.x+e.geometry.width>100 || e.geometry.y+e.geometry.height>100)) warn('overflow','Free-form content extends outside its parent; check clipping at each width.',e);
    if(e.layout.overflowX==='hidden' || e.layout.overflowY==='hidden' || s.whiteSpace==='nowrap') warn('clipping','Overflow settings or unwrapped text can clip content at narrow widths.',e);
    const urls=[p.src,p.poster,p.captions,p.url,s.backgroundImage,...(p.images || []).map(i=>i.src)];
    if(observedFailures.some(f=>f.elementId===e.id && urls.includes(f.url))) warn('resource-failed','An external resource failed in the editor. Check its URL in Content. Other remote resource statuses are unknown.',e);
  }
  return {errors,warnings};
}
// No author content, URLs, record keys, stack traces, or browser credentials.
export function diagnosticSummary(result) {
  return JSON.stringify({feature:'page-builder-export',errors:result.errors.map(d=>d.code),warnings:result.warnings.map(d=>d.code)},null,2);
}
