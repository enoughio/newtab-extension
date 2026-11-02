import { registerWidget } from './registry.js';
import { bindPress, loadNx, onNx, patchNx, locate } from './kit.js';

function mountCalculator(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-ink nx-calc';
  const display = document.createElement('div');
  display.className = 'nx-calc-display';
  display.textContent = '0';
  const keys = document.createElement('div');
  keys.className = 'nx-calc-keys';
  root.append(display, keys);
  host.append(root);

  let current = '0';
  let stored = null;
  let operator = null;
  let fresh = false;
  let error = false;

  function paint() {
    display.textContent = current;
  }

  function format(value) {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value * 1e8) / 1e8;
    const text = String(rounded);
    if (text.length <= 10) return text;
    return rounded.toExponential(3);
  }

  function apply(left, right, op) {
    if (op === '+') return left + right;
    if (op === '−') return left - right;
    if (op === '×') return left * right;
    if (op === '÷') return right === 0 ? null : left / right;
    return right;
  }

  function clear() {
    current = '0';
    stored = null;
    operator = null;
    fresh = false;
    error = false;
    paint();
  }

  function digit(char) {
    if (error) clear();
    if (fresh || current === '0') {
      current = char;
      fresh = false;
    } else if (current.replace('-', '').replace('.', '').length < 9) {
      current += char;
    }
    paint();
  }

  function dot() {
    if (error) clear();
    if (fresh) {
      current = '0.';
      fresh = false;
    } else if (!current.includes('.')) {
      current += '.';
    }
    paint();
  }

  function back() {
    if (error || fresh) {
      current = '0';
      fresh = false;
      error = false;
      paint();
      return;
    }
    current = current.length <= 1 ? '0' : current.slice(0, -1);
    if (current === '-' || current === '') current = '0';
    paint();
  }

  function fail() {
    current = 'Error';
    error = true;
    operator = null;
    stored = null;
    fresh = true;
    paint();
  }

  function operate(op) {
    if (error) return;
    const value = Number(current);
    if (operator && !fresh) {
      const result = apply(stored, value, operator);
      const text = result == null ? null : format(result);
      if (text == null) {
        fail();
        return;
      }
      current = text;
      stored = Number(text);
    } else {
      stored = value;
    }
    operator = op;
    fresh = true;
    paint();
  }

  function equals() {
    if (error || operator == null || stored == null) return;
    const result = apply(stored, Number(current), operator);
    const text = result == null ? null : format(result);
    if (text == null) {
      fail();
      return;
    }
    current = text;
    operator = null;
    stored = null;
    fresh = true;
    paint();
  }

  const layout = [
    { label: 'C', col: 1, row: 1, act: clear, kind: 'ghost' },
    { label: '÷', col: 2, row: 1, act: () => operate('÷'), kind: 'op' },
    { label: '×', col: 3, row: 1, act: () => operate('×'), kind: 'op' },
    { label: '⌫', col: 4, row: 1, act: back, kind: 'ghost' },
    { label: '7', col: 1, row: 2, act: () => digit('7') },
    { label: '8', col: 2, row: 2, act: () => digit('8') },
    { label: '9', col: 3, row: 2, act: () => digit('9') },
    { label: '−', col: 4, row: 2, act: () => operate('−'), kind: 'op' },
    { label: '4', col: 1, row: 3, act: () => digit('4') },
    { label: '5', col: 2, row: 3, act: () => digit('5') },
    { label: '6', col: 3, row: 3, act: () => digit('6') },
    { label: '+', col: 4, row: 3, act: () => operate('+'), kind: 'op' },
    { label: '1', col: 1, row: 4, act: () => digit('1') },
    { label: '2', col: 2, row: 4, act: () => digit('2') },
    { label: '3', col: 3, row: 4, act: () => digit('3') },
    { label: '=', col: 4, row: 4, h: 2, act: equals, kind: 'eq' },
    { label: '0', col: 1, row: 5, w: 2, act: () => digit('0') },
    { label: '.', col: 3, row: 5, act: dot },
  ];

  for (const key of layout) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `nx-key${key.kind ? ` is-${key.kind}` : ''}`;
    button.textContent = key.label;
    button.style.gridColumn = `${key.col} / span ${key.w || 1}`;
    button.style.gridRow = `${key.row} / span ${key.h || 1}`;
    button.addEventListener('click', key.act);
    keys.append(button);
  }
}

function toDms(value, positive, negative) {
  const hemi = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
  return `${degrees}°${String(minutes).padStart(2, '0')}'${seconds}"${hemi}`;
}

function mountCoords(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-paper nx-coords';
  const lat = document.createElement('b');
  const lon = document.createElement('b');
  root.append(lat, lon);
  host.append(root);

  function paint(state) {
    const coords = state?.coords;
    if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) {
      lat.textContent = 'Tap to locate';
      lon.textContent = '';
      return;
    }
    lat.textContent = toDms(coords.lat, 'N', 'S');
    lon.textContent = toDms(coords.lon, 'E', 'W');
  }

  bindPress(root, () => {
    lat.textContent = 'Locating…';
    lon.textContent = '';
    locate()
      .then((pos) => patchNx({ coords: pos }))
      .catch(() => {
        lat.textContent = 'Location off';
        lon.textContent = 'Tap to retry';
      });
  });
  root.setAttribute('aria-label', 'Coordinates');
  loadNx().then(paint).catch((error) => console.error(error));
  return onNx(paint);
}

registerWidget({
  kind: 'calculator',
  name: 'Calculator',
  description: 'Add, subtract, multiply, divide',
  span: { w: 5, h: 7 },
  mount: mountCalculator,
});

registerWidget({
  kind: 'coords',
  name: 'Coordinates',
  description: 'Tap to read this device’s location',
  span: { w: 6, h: 2 },
  mount: mountCoords,
});
