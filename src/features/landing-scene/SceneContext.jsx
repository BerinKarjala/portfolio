import { createContext, useContext, useRef, useState } from 'react';
import { WritingProvider } from './WritingContext';
export const SceneContext = createContext(null);
export function SceneProvider({ children }) {
  const [utility, setUtility] = useState(null);
  const [interacting, setInteracting] = useState(false);
  const [writingInteracting, setWritingInteracting] = useState(false);
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const launcher = useRef(null);
  const calendarLauncher = useRef(null);
  const editorLauncher = useRef(null);
  const openCalendar = element => { launcher.current = element; setUtility('calendar'); };
  const openEditor = element => { launcher.current = element; setUtility('editor'); };
  const closeUtility = () => {
    setUtility(null);
    const usable = element => element?.isConnected && !element.closest('[inert],[hidden]') && !element.disabled;
    const fallback = utility === 'editor' ? editorLauncher.current : calendarLauncher.current;
    (usable(launcher.current) ? launcher.current : usable(fallback) ? fallback : null)?.focus({preventScroll: true});
  };
  return <SceneContext.Provider value={{ utility, openCalendar, openEditor, closeUtility, interacting: interacting || writingInteracting, setInteracting, setWritingInteracting, timeZone, setTimeZone, calendarLauncher, editorLauncher }}><WritingProvider>{children}</WritingProvider></SceneContext.Provider>;
}
export const useScene = () => useContext(SceneContext);
