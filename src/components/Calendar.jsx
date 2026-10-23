import { useLayoutEffect, useRef, useState } from 'react';
import useMinuteClock from '../features/landing-scene/useMinuteClock';
const label = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const agendaLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const key = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const noon = date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);

function inZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const number = type => Number(parts.find(part => part.type === type).value);
  return new Date(number('year'), number('month') - 1, number('day'), 12);
}
export default function Calendar({ today, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone }) {
  const clock = useMinuteClock();
  today = inZone(today || clock, timeZone);
  const [selected, setSelected] = useState(() => noon(today));
  const [focused, setFocused] = useState(() => noon(today));
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const focusDate = useRef(false);
  const dates = useRef(null);
  useLayoutEffect(() => {
    if (focusDate.current) {
      dates.current?.querySelector('[tabindex="0"]')?.focus();
      focusDate.current = false;
    }
  }, [focused, month]);
  const navigate = date => {
    setFocused(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  };
  function moveMonth(delta) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
    setMonth(next);
    setFocused(next);
  }
  function onDateKey(event, date) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const next = noon(date);
    switch (event.key) {
      case 'ArrowLeft': next.setDate(next.getDate() - 1); break;
      case 'ArrowRight': next.setDate(next.getDate() + 1); break;
      case 'ArrowUp': next.setDate(next.getDate() - 7); break;
      case 'ArrowDown': next.setDate(next.getDate() + 7); break;
      case 'Home': next.setDate(next.getDate() - next.getDay()); break;
      case 'End': next.setDate(next.getDate() + 6 - next.getDay()); break;
      default: return;
    }
    event.preventDefault();
    focusDate.current = true;
    navigate(next);
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay(), 12);
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i, 12));
  return <div className="landing-calendar">
    <div className="calendar-month-controls">
      <button aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
      <h3 aria-live="polite">{monthLabel.format(month)}</h3>
      <button aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
      <button onClick={() => { const now = noon(today); setSelected(now); navigate(now); }}>Today</button>
    </div>
    <div className="calendar-dates" ref={dates}>
      <table aria-label={monthLabel.format(month)}>
        <thead><tr>{weekdays.map(day => <th key={day} scope="col" abbr={day}>{day.slice(0, 3)}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>
          {days.slice(week * 7, week * 7 + 7).map(date => <td key={key(date)}>
            <button
              aria-label={label.format(date)} aria-pressed={key(date) === key(selected)}
              aria-current={key(date) === key(today) ? 'date' : undefined}
              tabIndex={key(date) === key(focused) ? 0 : -1}
              className={date.getMonth() !== month.getMonth() ? 'calendar-other-month' : undefined}
              onKeyDown={event => onDateKey(event, date)}
              onClick={() => { setSelected(date); navigate(date); }}
            >{date.getDate()}</button>
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="calendar-selected"><h3>{agendaLabel.format(selected)}</h3><p>Date browsing only. Events are not connected.</p></div>
  </div>;
}
