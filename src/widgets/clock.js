import { registerWidget } from './registry.js';
import { everySecond } from './kit.js';

const NS = 'http://www.w3.org/2000/svg';

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDateLine(date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function card(host, kickerText, { analog = false } = {}) {
  const root = document.createElement('div');
  root.className = analog ? 'clock-widget clock-widget-analog' : 'clock-widget';
  const kicker = document.createElement('div');
  kicker.className = 'clock-kicker';
  kicker.textContent = kickerText;
  root.append(kicker);
  host.append(root);
  return root;
}

function mountDate(host) {
  const root = card(host, 'Date');
  const value = document.createElement('div');
  value.className = 'clock-time clock-time-md';
  const sub = document.createElement('div');
  sub.className = 'clock-date';
  root.append(value, sub);
  return everySecond(() => {
    const now = new Date();
    value.textContent = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    sub.textContent = now.toLocaleDateString([], { weekday: 'long' });
  });
}

function mountLarge(host) {
  const root = card(host, 'Local time');
  const time = document.createElement('div');
  time.className = 'clock-time';
  const hm = document.createElement('span');
  hm.className = 'clock-hm';
  const sec = document.createElement('span');
  sec.className = 'clock-sec';
  time.append(hm, sec);
  const date = document.createElement('div');
  date.className = 'clock-date';
  root.append(time, date);
  return everySecond(() => {
    const now = new Date();
    hm.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    sec.textContent = String(now.getSeconds()).padStart(2, '0');
    date.textContent = formatDateLine(now);
  });
}

function svgLine(y1, y2, width) {
  const line = document.createElementNS(NS, 'line');
  line.setAttribute('x1', '50');
  line.setAttribute('x2', '50');
  line.setAttribute('y1', String(y1));
  line.setAttribute('y2', String(y2));
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', String(width));
  line.setAttribute('stroke-linecap', 'round');
  return line;
}

function mountAnalog(host) {
  const root = card(host, 'Analog', { analog: true });
  const faceWrap = document.createElement('div');
  faceWrap.className = 'analog-face';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('cx', '50');
  face.setAttribute('cy', '50');
  face.setAttribute('r', '46');
  face.setAttribute('fill', 'transparent');
  face.setAttribute('stroke', 'currentColor');
  face.setAttribute('stroke-opacity', '0.18');
  face.setAttribute('stroke-width', '1');
  svg.append(face);
  for (let i = 0; i < 60; i += 1) {
    const major = i % 5 === 0;
    const tick = svgLine(major ? 8 : 10, major ? 16 : 14, major ? 1.6 : 0.7);
    tick.setAttribute('stroke-opacity', major ? '0.8' : '0.35');
    tick.setAttribute('transform', `rotate(${i * 6} 50 50)`);
    svg.append(tick);
  }
  const hour = svgLine(50, 28, 2.6);
  const minute = svgLine(50, 18, 1.7);
  const second = svgLine(58, 16, 1);
  second.setAttribute('stroke-opacity', '0.55');
  const cap = document.createElementNS(NS, 'circle');
  cap.setAttribute('cx', '50');
  cap.setAttribute('cy', '50');
  cap.setAttribute('r', '2');
  cap.setAttribute('fill', 'currentColor');
  svg.append(hour, minute, second, cap);
  faceWrap.append(svg);
  const sub = document.createElement('div');
  sub.className = 'clock-date';
  root.append(faceWrap, sub);
  return everySecond(() => {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours() % 12;
    hour.setAttribute('transform', `rotate(${hours * 30 + minutes * 0.5} 50 50)`);
    minute.setAttribute('transform', `rotate(${minutes * 6 + seconds * 0.1} 50 50)`);
    second.setAttribute('transform', `rotate(${seconds * 6} 50 50)`);
    sub.textContent = formatTime(now);
  });
}

registerWidget({
  kind: 'clock-date',
  name: 'Date',
  description: 'Month and day',
  span: { w: 4, h: 4 },
  mount: mountDate,
});

registerWidget({
  kind: 'clock',
  name: 'Clock',
  description: 'Large local time',
  span: { w: 4, h: 4 },
  mount: mountLarge,
});

registerWidget({
  kind: 'clock-analog',
  name: 'Analog',
  description: 'Clock face with a second hand',
  span: { w: 4, h: 4 },
  mount: mountAnalog,
});
