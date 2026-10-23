import { useEffect, useState } from 'react';
export default function useMinuteClock(now = Date.now) {
  const [date, setDate] = useState(() => new Date(now()));
  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      setDate(new Date(now()));
      if (document.visibilityState !== 'hidden') timer = setTimeout(update, 60000 - (now() % 60000));
    };
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pageshow', update);
    };
  }, [now]);
  return date;
}
