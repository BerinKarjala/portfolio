// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BuilderWorkspace from '../BuilderWorkspace';
import { useBuilder } from '../state/BuilderProvider';
import { createProject } from '../domain/project';
import { createRepository, PROJECT_PREFIX } from '../domain/storage';
import * as files from '../browser/files';
const flags=vi.hoisted(()=>({crash:false}));
vi.mock('./CanvasEditor',()=>({default:function CanvasStub(){
  const {editMetadata}=useBuilder();
  if(flags.crash)throw new Error('private runtime stack');
  return <button type="button" onClick={()=>{flags.crash=true;editMetadata({title:'Unsaved work'});}}>Edit then simulate canvas failure</button>;
}}));
afterEach(()=>{cleanup();localStorage.clear();flags.crash=false;vi.restoreAllMocks();});
it('pauses autosave after a critical canvas failure and offers both saved and in-memory recovery',async()=>{
  const p=createProject({name:'Survivor'}),repository=createRepository(localStorage);repository.create(p);
  const before=localStorage.getItem(PROJECT_PREFIX+p.projectId);
  vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.spyOn(files,'downloadText').mockImplementation(()=>{});
  render(<BuilderWorkspace onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Open Survivor',exact:true}));
  fireEvent.click(screen.getByRole('button',{name:'Edit then simulate canvas failure'}));
  expect(screen.getByRole('alert').textContent).toContain('workspace needs to restart');
  expect(screen.getByRole('alert').textContent).not.toContain('private runtime stack');
  await new Promise(resolve=>setTimeout(resolve,1200));
  expect(localStorage.getItem(PROJECT_PREFIX+p.projectId)).toBe(before);
  fireEvent.click(screen.getByRole('button',{name:'Download stored data',exact:true}));
  expect(JSON.parse(files.downloadText.mock.calls[0][0]).records[0].raw).toBe(before);
  fireEvent.click(screen.getByRole('button',{name:'Download unsaved JSON',exact:true}));
  expect(JSON.parse(files.downloadText.mock.calls[1][0]).project.page.metadata.title).toBe('Unsaved work');
});
