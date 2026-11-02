import { registerWidget } from './registry.js';
import { bindPress, loadNx, onNx, patchNx } from './kit.js';

const LIMIT = 30 * 60 * 1000;

function elapsedOf(state, now) {
  const base = Number(state?.base) || 0;
  if (!state?.running || !state.startedAt) return base;
  return base + Math.max(0, now - state.startedAt);
}

function durationLabel(ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatStop(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function mountTimer(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-ink nx-timer';
  const mins = document.createElement('div');
  mins.className = 'mins';
  const cap = document.createElement('div');
  cap.className = 'cap';
  const foot = document.createElement('div');
  foot.className = 'foot';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'nx-reset';
  reset.textContent = 'Reset';
  root.append(mins, cap, foot, reset);
  host.append(root);

  let state = { base: 0, running: false, startedAt: 0 };

  function paint() {
    const ms = elapsedOf(state, Date.now());
    const over = ms >= LIMIT;
    const shown = over ? ms - LIMIT : LIMIT - ms;
    const minutes = over ? Math.floor(shown / 60000) : Math.ceil(shown / 60000);
    mins.textContent = `${Math.max(over ? 0 : 0, minutes)}m`;
    if (!state.running && ms === 0) cap.textContent = 'TIMER';
    else cap.textContent = over ? 'OVER LIMIT' : 'LEFT';
    cap.classList.toggle('is-hot', over);
    foot.textContent = durationLabel(ms);
    reset.hidden = state.running || ms === 0;
    root.setAttribute('aria-label', state.running ? 'Pause timer' : 'Start timer');
  }

  function apply(next) {
    state = next?.timer && typeof next.timer === 'object'
      ? next.timer
      : { base: 0, running: false, startedAt: 0 };
    paint();
  }

  bindPress(root, () => {
    const now = Date.now();
    const base = elapsedOf(state, now);
    state = state.running
      ? { base, running: false, startedAt: 0 }
      : { base, running: true, startedAt: now };
    paint();
    patchNx({ timer: state });
  });
  reset.addEventListener('click', (event) => {
    event.stopPropagation();
    state = { base: 0, running: false, startedAt: 0 };
    paint();
    patchNx({ timer: state });
  });

  loadNx().then(apply).catch((error) => console.error(error));
  const stopWatch = onNx(apply);
  const ticker = setInterval(paint, 1000);
  return () => {
    stopWatch();
    clearInterval(ticker);
  };
}

function mountStopwatch(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-paper nx-stop';
  const dot = document.createElement('i');
  const time = document.createElement('b');
  time.textContent = '00:00:00';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'nx-reset';
  reset.textContent = 'Reset';
  root.append(dot, time, reset);
  host.append(root);

  let state = { base: 0, running: false, startedAt: 0 };

  function paint() {
    const ms = elapsedOf(state, Date.now());
    time.textContent = formatStop(ms);
    dot.classList.toggle('is-on', Boolean(state.running));
    reset.hidden = state.running || ms === 0;
    root.setAttribute('aria-label', state.running ? 'Stop stopwatch' : 'Start stopwatch');
  }

  function apply(next) {
    state = next?.stopwatch && typeof next.stopwatch === 'object'
      ? next.stopwatch
      : { base: 0, running: false, startedAt: 0 };
    paint();
  }

  bindPress(root, () => {
    const now = Date.now();
    const base = elapsedOf(state, now);
    state = state.running
      ? { base, running: false, startedAt: 0 }
      : { base, running: true, startedAt: now };
    paint();
    patchNx({ stopwatch: state });
  });
  reset.addEventListener('click', (event) => {
    event.stopPropagation();
    state = { base: 0, running: false, startedAt: 0 };
    paint();
    patchNx({ stopwatch: state });
  });

  loadNx().then(apply).catch((error) => console.error(error));
  const stopWatch = onNx(apply);
  const ticker = setInterval(paint, 250);
  return () => {
    stopWatch();
    clearInterval(ticker);
  };
}

registerWidget({
  kind: 'timer',
  name: 'Timer',
  description: '30 minutes, then over limit',
  span: { w: 3, h: 5 },
  mount: mountTimer,
});

registerWidget({
  kind: 'stopwatch',
  name: 'Stopwatch',
  description: 'Start, stop, and reset',
  span: { w: 5, h: 3 },
  mount: mountStopwatch,
});
