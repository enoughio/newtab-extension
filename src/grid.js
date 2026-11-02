import { getWidget } from './widgets/registry.js';

export const COLS = 24;
export const ROWS = 14;

function registrySpan(item) {
  const widget = getWidget(item?.kind);
  return {
    w: Math.max(1, Number(widget?.span?.w) || 1),
    h: Math.max(1, Number(widget?.span?.h) || 1),
  };
}

function positiveCell(value, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 0;
  return Math.min(max, n);
}

export function spanFor(item) {
  if (item?.type === 'widget') {
    const base = registrySpan(item);
    return {
      w: positiveCell(item.w, COLS) || base.w,
      h: positiveCell(item.h, ROWS) || base.h,
    };
  }
  return { w: 1, h: 1 };
}

// Widgets larger than 2×2 by default cannot shrink below 2×2. Smaller widgets
// can shrink to a single cell, and nothing shrinks below 1×1.
export function minSpanFor(item) {
  if (item?.type !== 'widget') return { w: 1, h: 1 };
  const base = registrySpan(item);
  if (base.w > 2 && base.h > 2) return { w: 2, h: 2 };
  return { w: 1, h: 1 };
}

export function pack(items, cols = COLS, rows = ROWS, blocked = []) {
  const occ = Array.from({ length: rows }, () => Array(cols).fill(-1));
  for (const cell of blocked) {
    const x = cell?.x | 0;
    const y = cell?.y | 0;
    if (y >= 0 && y < rows && x >= 0 && x < cols) occ[y][x] = -2;
  }
  const placed = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const span = spanFor(item);
    if (span.w > cols || span.h > rows) return { ok: false, placed, occ };
    const slot = findSlot(occ, span.w, span.h, cols, rows);
    if (!slot) return { ok: false, placed, occ };
    for (let y = slot.y; y < slot.y + span.h; y += 1) {
      for (let x = slot.x; x < slot.x + span.w; x += 1) occ[y][x] = index;
    }
    placed.push({ item, index, x: slot.x, y: slot.y, w: span.w, h: span.h });
  }
  return { ok: true, placed, occ };
}

function findSlot(occ, w, h, cols, rows) {
  for (let y = 0; y <= rows - h; y += 1) {
    for (let x = 0; x <= cols - w; x += 1) {
      if (fits(occ, x, y, w, h)) return { x, y };
    }
  }
  return null;
}

function fits(occ, x, y, w, h) {
  const rows = occ.length;
  const cols = occ[0]?.length || 0;
  if (x < 0 || y < 0 || x + w > cols || y + h > rows) return false;
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      if (occ[row][col] !== -1) return false;
    }
  }
  return true;
}

function writeOcc(occ, x, y, w, h, value) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) occ[row][col] = value;
  }
}

function blankOcc(cols, rows, blocked = []) {
  const occ = Array.from({ length: rows }, () => Array(cols).fill(-1));
  for (const cell of blocked) {
    const x = cell?.x | 0;
    const y = cell?.y | 0;
    if (y >= 0 && y < rows && x >= 0 && x < cols) occ[y][x] = -2;
  }
  return occ;
}

export function hasPosition(item) {
  return Number.isInteger(item?.x) && item.x >= 0 && Number.isInteger(item?.y) && item.y >= 0;
}

// Keep each item where it was saved. Only items with no spot, or a spot that
// collides, receive the next open cell. Other items are not pushed aside.
export function stampPositions(items, cols = COLS, rows = ROWS, blocked = []) {
  const occ = blankOcc(cols, rows, blocked);
  const placed = [];
  const pending = [];
  items.forEach((item, index) => {
    const span = spanFor(item);
    if (span.w > cols || span.h > rows) {
      pending.push({ item, index, span, forced: true });
      return;
    }
    if (hasPosition(item) && fits(occ, item.x, item.y, span.w, span.h)) {
      writeOcc(occ, item.x, item.y, span.w, span.h, index);
      placed.push({ item, index, x: item.x, y: item.y, w: span.w, h: span.h });
      return;
    }
    pending.push({ item, index, span, forced: false });
  });
  for (const entry of pending) {
    if (entry.forced) return { ok: false, placed, occ };
    const slot = findSlot(occ, entry.span.w, entry.span.h, cols, rows);
    if (!slot) return { ok: false, placed, occ };
    entry.item.x = slot.x;
    entry.item.y = slot.y;
    writeOcc(occ, slot.x, slot.y, entry.span.w, entry.span.h, entry.index);
    placed.push({ item: entry.item, index: entry.index, x: slot.x, y: slot.y, w: entry.span.w, h: entry.span.h });
  }
  return { ok: true, placed, occ };
}

export function cellsFree(items, x, y, w, h, cols = COLS, rows = ROWS, blocked = []) {
  const occ = blankOcc(cols, rows, blocked);
  for (const item of items) {
    const span = spanFor(item);
    if (!hasPosition(item)) continue;
    if (!fits(occ, item.x, item.y, span.w, span.h)) continue;
    writeOcc(occ, item.x, item.y, span.w, span.h, 1);
  }
  return fits(occ, x, y, w, h);
}

export function insertionIndex(packed, col, row) {
  if (!packed?.occ?.[row]) return packed?.placed?.length || 0;
  const hit = packed.occ[row][col];
  if (typeof hit === 'number' && hit >= 0) return hit;
  const width = packed.occ[row].length || COLS;
  const key = row * width + col;
  let best = null;
  for (const spot of packed.placed) {
    const origin = spot.y * width + spot.x;
    if (origin > key && (!best || origin < best.origin)) best = { origin, index: spot.index };
  }
  return best ? best.index : packed.placed.length;
}
