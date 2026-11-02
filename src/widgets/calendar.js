import { registerWidget } from './registry.js';
import { everySecond, formatGMT } from './kit.js';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function navButton(label, direction) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cal-nav';
  button.setAttribute('aria-label', label);
  const path = direction === 'prev'
    ? 'M14.5 6.5 9 12l5.5 5.5'
    : 'M9.5 6.5 15 12l-5.5 5.5';
  button.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  return button;
}

function mountMonth(host) {
  const root = document.createElement('div');
  root.className = 'calendar-widget';
  const head = document.createElement('div');
  head.className = 'cal-head';
  const title = document.createElement('div');
  title.className = 'cal-title';
  const navs = document.createElement('div');
  navs.className = 'cal-navs';
  const prev = navButton('Previous month', 'prev');
  const next = navButton('Next month', 'next');
  navs.append(prev, next);
  head.append(title, navs);
  const grid = document.createElement('div');
  grid.className = 'cal-grid';
  grid.setAttribute('role', 'grid');
  root.append(head, grid);
  host.append(root);

  const now = new Date();
  let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  let selected = dayKey(now);
  let todayKey = selected;

  function render() {
    title.textContent = cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
    grid.replaceChildren();
    for (const name of WEEKDAYS) {
      const cell = document.createElement('div');
      cell.className = 'cal-dow';
      cell.textContent = name;
      grid.append(cell);
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    for (let index = 0; index < 42; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cal-day';
      button.textContent = String(day.getDate());
      const key = dayKey(day);
      const outside = day.getMonth() !== cursor.getMonth();
      if (outside) button.classList.add('is-outside');
      if (key === todayKey) button.classList.add('is-today');
      if (key === selected) {
        button.classList.add('is-selected');
        button.setAttribute('aria-selected', 'true');
      }
      button.setAttribute('aria-label', day.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }));
      button.addEventListener('click', () => {
        selected = key;
        if (outside) cursor = new Date(day.getFullYear(), day.getMonth(), 1);
        render();
      });
      grid.append(button);
    }
  }

  prev.addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    render();
  });
  next.addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    render();
  });
  render();

  return everySecond(() => {
    const nextToday = dayKey(new Date());
    if (nextToday === todayKey) return;
    todayKey = nextToday;
    render();
  });
}

function mountWeekday(host) {
  const root = document.createElement('div');
  root.className = 'clock-widget';
  const kicker = document.createElement('div');
  kicker.className = 'clock-kicker';
  kicker.textContent = 'Weekday';
  const value = document.createElement('div');
  value.className = 'clock-time clock-time-md';
  const sub = document.createElement('div');
  sub.className = 'clock-date';
  root.append(kicker, value, sub);
  host.append(root);
  return everySecond(() => {
    const date = new Date();
    value.textContent = date.toLocaleDateString([], { weekday: 'long' });
    sub.textContent = formatGMT(date);
  });
}

function mountDay(host) {
  const root = document.createElement('div');
  root.className = 'clock-widget';
  const kicker = document.createElement('div');
  kicker.className = 'clock-kicker';
  kicker.textContent = 'Day';
  const value = document.createElement('div');
  value.className = 'clock-time';
  const sub = document.createElement('div');
  sub.className = 'clock-date';
  root.append(kicker, value, sub);
  host.append(root);
  return everySecond(() => {
    const date = new Date();
    value.textContent = String(date.getDate());
    sub.textContent = date.toLocaleDateString([], { month: 'long' });
  });
}

registerWidget({
  kind: 'calendar',
  name: 'Calendar',
  description: 'Month, with today outlined',
  span: { w: 8, h: 7 },
  mount: mountMonth,
});

registerWidget({
  kind: 'weekday',
  name: 'Weekday',
  description: 'Weekday and GMT offset',
  span: { w: 4, h: 4 },
  mount: mountWeekday,
});

registerWidget({
  kind: 'day',
  name: 'Day',
  description: 'Today’s date',
  span: { w: 4, h: 4 },
  mount: mountDay,
});
