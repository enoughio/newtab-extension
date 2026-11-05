import './widgets/index.js';
import './themes/index.js';
import './icon-packs/index.js';
import { COLS, ROWS, cellsFree, hasPosition, minSpanFor, spanFor, stampPositions } from './grid.js';
import { initDrawer } from './drawer.js';
import { initCustomize } from './customize.js';
import { initAddSheet } from './add-sheet.js';
import { loadBackgroundBlob, loadLayout, normalizeHttpUrl, saveLayout, uid } from './store.js';
import { getTheme } from './themes/registry.js';
import { getWidget } from './widgets/registry.js';
import { shortcutIconSrc, shortcutMonogram } from './icon-packs/registry.js';
import { loadNx, onNx, patchNx } from './widgets/kit.js';
import { resetWeather } from './widgets/weather.js';

const APPEARANCE_KEY = 'toggle-dark-mode';

const FLIP_MS = 200;
const FOLDER_MS = 280;

const els = {};
const cleanups = new Map();
let layout = null;
let drawerApi = null;
let drag = null;
let resize = null;
let suppressClick = false;
let openFolderId = null;
let folderReturn = null;
let gridMetrics = null;
let stageSize = null;
let wallpaperUrl = null;
let wallpaperToken = 0;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function chipLabel(item) {
  if (!item) return 'Item';
  if (item.title) return item.title;
  if (item.type === 'widget') return getWidget(item.kind)?.name || 'Widget';
  if (item.type === 'folder') return 'Folder';
  return 'Shortcut';
}

function monogramColor(text) {
  const palette = ['#3d6f8a', '#3f7d6a', '#8a5a3d', '#6d4c7d', '#3d5f8a', '#8a3d4d'];
  let hash = 0;
  const source = text || '?';
  for (let i = 0; i < source.length; i += 1) hash = (hash + source.charCodeAt(i)) % palette.length;
  return palette[hash];
}

function makeMonogram(shortcut, className) {
  const mark = document.createElement('span');
  mark.className = `${className} monogram`;
  mark.textContent = shortcutMonogram(shortcut);
  mark.style.background = monogramColor(shortcut.title || shortcut.url || '?');
  return mark;
}

function makeShortcutVisual(shortcut, className) {
  const src = shortcutIconSrc(shortcut);
  if (!src) return makeMonogram(shortcut, className);
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.draggable = false;
  img.src = src;
  img.addEventListener('error', () => {
    img.replaceWith(makeMonogram(shortcut, className));
  }, { once: true });
  return img;
}

function makeLabel(text) {
  const label = document.createElement('span');
  label.className = 'tile-label';
  label.textContent = text;
  return label;
}

const MENU_ICON_RENAME = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M13.2 5.8 18.2 10.8M4 20l1.1-4.4L15.6 5.1a2 2 0 0 1 2.8 2.8L7.9 18.4 4 20z"/></svg>';
const MENU_ICON_REMOVE = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4.5 7.5h15M9.2 7.5V5.6A1.1 1.1 0 0 1 10.3 4.5h3.4a1.1 1.1 0 0 1 1.1 1.1v1.9M7.2 7.5l.7 11.1a1.4 1.4 0 0 0 1.4 1.3h5.4a1.4 1.4 0 0 0 1.4-1.3l.7-11.1"/></svg>';

let itemMenu = null;

function findItem(id) {
  for (const item of layout?.items || []) {
    if (item.id === id) return item;
    if (item.type === 'folder') {
      const child = item.children?.find((entry) => entry.id === id);
      if (child) return child;
    }
  }
  return null;
}

function closeItemMenu() {
  if (!itemMenu) return;
  const { node, button } = itemMenu;
  itemMenu = null;
  node.remove();
  if (button?.isConnected) button.setAttribute('aria-expanded', 'false');
}

function placeItemMenu(menu, anchor) {
  const anchorBox = anchor.getBoundingClientRect();
  const pad = 8;
  menu.style.top = `${anchorBox.bottom + 4}px`;
  const box = menu.getBoundingClientRect();
  let left = anchorBox.right - box.width;
  let top = anchorBox.bottom + 4;
  if (left + box.width > window.innerWidth - pad) left = window.innerWidth - pad - box.width;
  if (left < pad) left = pad;
  if (top + box.height > window.innerHeight - pad) top = Math.max(pad, anchorBox.top - 4 - box.height);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function showRenameField(menu, renameButton, item) {
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 40;
  input.value = item.title || chipLabel(item);
  input.placeholder = 'Name';
  input.setAttribute('aria-label', `Rename ${chipLabel(item)}`);
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    commitRename(item.id, input.value);
  });
  input.addEventListener('pointerdown', (event) => event.stopPropagation());
  input.addEventListener('click', (event) => event.stopPropagation());
  renameButton.replaceWith(input);
  placeItemMenu(menu, itemMenu.button);
  input.focus();
  input.select();
}

async function commitRename(id, raw) {
  closeItemMenu();
  const title = String(raw || '').trim().slice(0, 40);
  if (!title) return;
  const item = findItem(id);
  if (!item || item.title === title) return;
  item.title = title;
  try {
    await saveLayout(layout);
  } catch (error) {
    console.error(error);
  }
  renderHome();
}

function openItemMenu(id, button) {
  const item = findItem(id);
  if (!item) return;
  const menu = document.createElement('div');
  menu.className = 'tile-menu';
  menu.setAttribute('role', 'menu');

  const rename = document.createElement('button');
  rename.type = 'button';
  rename.className = 'tile-menu-rename';
  rename.setAttribute('role', 'menuitem');
  rename.innerHTML = `${MENU_ICON_RENAME}<span>Rename</span>`;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'tile-menu-remove';
  remove.setAttribute('role', 'menuitem');
  remove.innerHTML = `${MENU_ICON_REMOVE}<span>Remove</span>`;

  const keepOpen = (event) => event.stopPropagation();
  rename.addEventListener('pointerdown', keepOpen);
  remove.addEventListener('pointerdown', keepOpen);
  rename.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!itemMenu) return;
    showRenameField(menu, rename, item);
  });
  remove.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeItemMenu();
    removeById(id);
  });

  menu.append(rename, remove);
  document.body.append(menu);
  button.setAttribute('aria-expanded', 'true');
  itemMenu = { node: menu, button, id };
  placeItemMenu(menu, button);
}

function toggleItemMenu(id, button) {
  if (itemMenu?.button === button) {
    closeItemMenu();
    return;
  }
  closeItemMenu();
  openItemMenu(id, button);
}

function makeMore(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile-more';
  button.setAttribute('aria-label', `${chipLabel(item)} options`);
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><span></span><span></span>';
  const stop = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    stop(event);
    toggleItemMenu(item.id, button);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.stopPropagation();
  });
  return button;
}

function faceSignature(item) {
  if (item.type === 'shortcut') return `s|${item.title}|${item.url}|${item.iconId || ''}`;
  if (item.type === 'folder') {
    const children = item.children.map((child) => `${child.id}|${child.iconId || ''}|${child.url}|${child.title}`).join(';');
    return `f|${item.title}|${children}`;
  }
  return '';
}

function makeFolderVisual(folder) {
  const blob = document.createElement('div');
  blob.className = 'folder-blob';
  const children = folder.children.slice(0, 4);
  if (!children.length) {
    blob.classList.add('is-empty');
    blob.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l1.4 1.6H18.5A2.5 2.5 0 0 1 21 9.1v8.4A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"/></svg>';
    return blob;
  }
  for (const child of children) blob.append(makeShortcutVisual(child, 'mini'));
  return blob;
}

function ensureFace(el, item) {
  const signature = faceSignature(item);
  if (el.dataset.face === signature) return;
  el.dataset.face = signature;
  const face = el.querySelector('.shortcut-face');
  if (!face) return;
  face.replaceChildren();
  if (item.type === 'shortcut') {
    el.setAttribute('aria-label', item.title);
    face.append(makeShortcutVisual(item, 'shortcut-icon'), makeLabel(item.title));
    return;
  }
  el.setAttribute('aria-label', item.title || 'Folder');
  face.append(makeFolderVisual(item), makeLabel(item.title || 'Folder'));
}

function destroyTile(el) {
  const cleanup = cleanups.get(el.dataset.id);
  if (cleanup) {
    try { cleanup(); } catch (error) { console.error(error); }
    cleanups.delete(el.dataset.id);
  }
  el.remove();
}

function resizeHandles(id) {
  const modes = [
    ['e', 'Resize width'],
    ['s', 'Resize height'],
    ['se', 'Resize widget'],
  ];
  return modes.map(([mode, label]) => {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${mode}`;
    if (mode === 'se') {
      handle.setAttribute('role', 'button');
      handle.setAttribute('aria-label', label);
      handle.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.2 10.6 10.6 7.2M4.4 10.6 10.6 4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    } else {
      handle.setAttribute('aria-hidden', 'true');
    }
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      startResize(id, mode, event);
    });
    return handle;
  });
}

function createTile(item) {
  const el = document.createElement('div');
  el.className = `tile tile-${item.type}`;
  el.dataset.id = item.id;
  el.dataset.type = item.type;
  el.draggable = false;
  if (item.type === 'widget') {
    const grip = document.createElement('div');
    grip.className = 'grip';
    grip.setAttribute('aria-hidden', 'true');
    const host = document.createElement('div');
    host.className = 'widget-host';
    el.append(grip, host, makeMore(item), ...resizeHandles(item.id));
    const widget = getWidget(item.kind);
    if (!widget) {
      host.textContent = 'This widget is not installed.';
    } else {
      try {
        const cleanup = widget.mount(host);
        if (typeof cleanup === 'function') cleanups.set(item.id, cleanup);
      } catch (error) {
        console.error(error);
        host.textContent = 'This widget failed to open.';
      }
    }
  } else {
    const face = document.createElement('div');
    face.className = 'shortcut-face';
    el.append(face, makeMore(item));
    el.tabIndex = 0;
    if (item.type === 'shortcut') el.setAttribute('role', 'link');
    else {
      el.setAttribute('role', 'button');
      el.setAttribute('aria-haspopup', 'dialog');
    }
    ensureFace(el, item);
    el.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('input, textarea, select, a, .tile-more, .tile-menu')) return;
      event.preventDefault();
      activateTile(item.id);
    });
  }
  el.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('input, textarea, select, a, .tile-more, .tile-menu, .resize-handle')) return;
    if (el.dataset.type === 'widget' && event.target.closest('button')) return;
    trackPointer(event, { type: 'grid', id: item.id });
  });
  el.addEventListener('click', () => activateTile(item.id));
  return el;
}

function activateTile(id) {
  if (suppressClick) return;
  const item = layout.items.find((entry) => entry.id === id);
  if (!item || item.type === 'widget') return;
  if (item.type === 'shortcut') openUrl(item.url);
  if (item.type === 'folder') {
    const tile = els.grid.querySelector(`.tile[data-id="${CSS.escape(id)}"]`);
    openFolder(id, tile);
  }
}

function openUrl(url) {
  const safe = normalizeHttpUrl(url);
  if (safe) location.href = safe;
}

function placeTile(el, spot) {
  el.style.gridColumn = `${spot.x + 1} / span ${spot.w}`;
  el.style.gridRow = `${spot.y + 1} / span ${spot.h}`;
}

function animateFlip(el, start, end) {
  const dx = start.left - end.left;
  const dy = start.top - end.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: 'translate(0, 0)' },
    ],
    { duration: FLIP_MS, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
  );
}

function syncGrid(placed, { hideId = null, ghost = null, nestId = null } = {}) {
  const grid = els.grid;
  const reduced = prefersReducedMotion();
  const tiles = [...grid.querySelectorAll(':scope > .tile[data-id]')];
  const first = new Map(tiles.map((el) => [el.dataset.id, el.getBoundingClientRect()]));
  const ghostNode = grid.querySelector(':scope > .tile-ghost');
  const ghostFirst = ghostNode ? ghostNode.getBoundingClientRect() : null;
  for (const el of tiles) el.getAnimations().forEach((animation) => animation.cancel());
  ghostNode?.getAnimations().forEach((animation) => animation.cancel());

  const seen = new Set();
  const byId = new Map(tiles.map((el) => [el.dataset.id, el]));
  for (const spot of placed) {
    let el = byId.get(spot.item.id);
    if (!el) {
      if (spot.item.id === hideId) continue;
      el = createTile(spot.item);
      grid.append(el);
    }
    seen.add(spot.item.id);
    placeTile(el, spot);
    const more = el.querySelector(':scope > .tile-more');
    if (more) more.setAttribute('aria-label', `${chipLabel(spot.item)} options`);
    el.classList.toggle('is-lifted', spot.item.id === hideId);
    el.classList.toggle('is-nest', spot.item.id === nestId);
    if (spot.item.type !== 'widget') ensureFace(el, spot.item);
  }
  for (const el of [...grid.querySelectorAll(':scope > .tile[data-id]')]) {
    if (!seen.has(el.dataset.id)) destroyTile(el);
  }

  let ghostEl = grid.querySelector(':scope > .tile-ghost');
  if (!ghost) {
    ghostEl?.remove();
    ghostEl = null;
  } else {
    if (!ghostEl) {
      ghostEl = document.createElement('div');
      ghostEl.className = 'tile-ghost';
      grid.append(ghostEl);
    }
    ghostEl.style.gridColumn = `${ghost.x + 1} / span ${ghost.w}`;
    ghostEl.style.gridRow = `${ghost.y + 1} / span ${ghost.h}`;
    ghostEl.textContent = ghost.label || '';
  }

  if (reduced) return;
  for (const el of grid.querySelectorAll(':scope > .tile[data-id]')) {
    const start = first.get(el.dataset.id);
    if (!start || el.dataset.id === hideId) continue;
    animateFlip(el, start, el.getBoundingClientRect());
  }
  if (ghost && ghostEl && ghostFirst && ghostFirst.width) {
    animateFlip(ghostEl, ghostFirst, ghostEl.getBoundingClientRect());
  }
}

function applyGridShape() {
  const root = document.documentElement;
  root.style.setProperty('--cols', String(COLS));
  root.style.setProperty('--rows', String(ROWS));
  if (!els.grid) return;
  els.grid.style.gridTemplateColumns = `repeat(${COLS}, minmax(0, 1fr))`;
  els.grid.style.gridTemplateRows = `repeat(${ROWS}, minmax(0, 1fr))`;
}

function reservedCells() {
  const corner = els.corner;
  if (!corner) return [];
  const box = metrics();
  if (box.cellW < 1 || box.cellH < 1) return [];
  const cluster = corner.getBoundingClientRect();
  const left = cluster.left - 2;
  const top = cluster.top - 2;
  const right = cluster.right + 2;
  const bottom = cluster.bottom + 2;
  const cells = [];
  const strideX = box.cellW + box.colGap;
  const strideY = box.cellH + box.rowGap;
  for (let row = 0; row < ROWS; row += 1) {
    const y = box.rect.top + row * strideY;
    if (y + box.cellH <= top || y >= bottom) continue;
    for (let col = 0; col < COLS; col += 1) {
      const x = box.rect.left + col * strideX;
      if (x + box.cellW <= left || x >= right) continue;
      cells.push({ x: col, y: row });
    }
  }
  return cells;
}

function placedItems(items = layout.items) {
  return stampPositions(items, COLS, ROWS).placed;
}

function renderHome(options = {}) {
  if (resize) return;
  closeItemMenu();
  const hideId = options.hideId || null;
  syncGrid(placedItems().filter((spot) => spot.item.id !== hideId), {
    hideId,
    ghost: options.ghost || null,
    nestId: options.nestId || null,
  });
  if (openFolderId && !els.folderLayer.hidden && !drag) renderFolderBody();
}

function applyAppearance(dark) {
  const tone = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = tone;
  document.documentElement.style.colorScheme = tone;
}

function applyDim() {
  const dim = clamp(Number(layout.dim) || 0, 0, 0.85);
  els.dim.style.opacity = String(dim);
}

function applyGlass() {
  const raw = Number(layout?.glass);
  const amount = clamp(Number.isFinite(raw) ? raw : 0.6, 0, 1);
  const alpha = 0.78 - amount * 0.53;
  const root = document.documentElement;
  root.style.setProperty('--glass-blur', `${Math.round(amount * 30)}px`);
  root.style.setProperty('--glass-saturate', `${Math.round(100 + amount * 100)}%`);
  root.style.setProperty('--glass-alpha', alpha.toFixed(3));
  root.style.setProperty('--glass-strong-alpha', Math.min(0.92, alpha + 0.22).toFixed(3));
}

function applySurface() {
  applyDim();
  applyGlass();
}

function paintThemeWallpaper() {
  const theme = getTheme(layout.themeId) || getTheme('harbor') || { background: '#07141c' };
  els.wallpaper.style.background = theme.background;
  if (!wallpaperUrl) return;
  const previous = wallpaperUrl;
  wallpaperUrl = null;
  URL.revokeObjectURL(previous);
}

function paintImageWallpaper(blob) {
  const next = URL.createObjectURL(blob);
  els.wallpaper.style.background = `#07141c center / cover no-repeat url("${next}")`;
  const previous = wallpaperUrl;
  wallpaperUrl = next;
  if (previous) URL.revokeObjectURL(previous);
}

async function applyThemeFromLayout() {
  const token = ++wallpaperToken;
  applySurface();
  if (!layout.backgroundImage) {
    paintThemeWallpaper();
    return;
  }
  let blob = null;
  try {
    blob = await loadBackgroundBlob();
  } catch (error) {
    console.error(error);
  }
  if (token !== wallpaperToken) return;
  if (!blob) {
    layout.backgroundImage = false;
    saveLayout(layout).catch((error) => console.error(error));
    paintThemeWallpaper();
    return;
  }
  paintImageWallpaper(blob);
}

function fitGrid() {
  const rect = els.stage?.getBoundingClientRect();
  const width = rect?.width || 0;
  const height = rect?.height || 0;
  const changed = !stageSize
    || Math.abs(stageSize.width - width) > 0.5
    || Math.abs(stageSize.height - height) > 0.5;
  stageSize = { width, height };
  gridMetrics = null;
  if (changed && layout && !drag && !resize) renderHome();
}

function metrics() {
  if (gridMetrics) return gridMetrics;
  const rect = els.grid.getBoundingClientRect();
  const styles = getComputedStyle(els.grid);
  const colGap = parseFloat(styles.columnGap) || 0;
  const rowGap = parseFloat(styles.rowGap) || 0;
  gridMetrics = {
    rect,
    colGap,
    rowGap,
    cellW: (rect.width - colGap * (COLS - 1)) / COLS,
    cellH: (rect.height - rowGap * (ROWS - 1)) / ROWS,
  };
  return gridMetrics;
}

function pointIn(el, x, y) {
  const rect = el.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function cellFromPointer(x, y) {
  const box = metrics();
  const strideX = box.cellW + box.colGap;
  const strideY = box.cellH + box.rowGap;
  const localX = clamp(x, box.rect.left, box.rect.right - 0.01) - box.rect.left;
  const localY = clamp(y, box.rect.top, box.rect.bottom - 0.01) - box.rect.top;
  return {
    col: clamp(Math.floor(localX / (strideX || 1)), 0, COLS - 1),
    row: clamp(Math.floor(localY / (strideY || 1)), 0, ROWS - 1),
  };
}

function folderIconBox(spot) {
  const tile = els.grid.querySelector(`.tile[data-id="${CSS.escape(spot.item.id)}"]`);
  const blob = tile?.querySelector('.folder-blob');
  if (blob) {
    const rect = blob.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  const box = metrics();
  const left = box.rect.left + spot.x * (box.cellW + box.colGap);
  const top = box.rect.top + spot.y * (box.cellH + box.rowGap);
  const size = Math.min(box.cellW * 0.667, box.cellH * 0.736);
  return {
    left: left + (box.cellW - size) / 2,
    top: top + Math.max(0, (box.cellH - size) / 2),
    width: size,
    height: size,
  };
}

function folderAtPoint(x, y) {
  if (!drag || drag.item.type !== 'shortcut') return null;
  for (const spot of placedItems()) {
    if (spot.item.type !== 'folder') continue;
    const icon = folderIconBox(spot);
    const inside = x >= icon.left && x <= icon.left + icon.width && y >= icon.top && y <= icon.top + icon.height;
    if (!inside) continue;
    if (drag.source === 'folder' && drag.folderId === spot.item.id) return 'cancel';
    return spot.item.id;
  }
  return null;
}

function showBadge(x, y) {
  els.prohibit.hidden = false;
  els.prohibit.style.left = `${x}px`;
  els.prohibit.style.top = `${y}px`;
}

function hideBadge() {
  els.prohibit.hidden = true;
}

function positionChip(x, y) {
  els.chip.style.left = `${x}px`;
  els.chip.style.top = `${y}px`;
}

function trackPointer(event, source) {
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  let listening = true;

  function move(ev) {
    if (!listening || ev.pointerId !== pointerId) return;
    if (resize) return;
    if (drag) {
      ev.preventDefault();
      updateDrag(ev);
      return;
    }
    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
    ev.preventDefault();
    startDrag(source, ev);
  }

  function end(ev) {
    if (ev.pointerId !== pointerId) return;
    listening = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    if (drag) finishDrag();
  }

  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

function startResize(id, mode, event) {
  if (drag || resize) return;
  const item = layout.items.find((entry) => entry.id === id && entry.type === 'widget');
  if (!item || !hasPosition(item)) return;
  const span = spanFor(item);
  const min = minSpanFor(item);
  resize = {
    id,
    mode,
    x: item.x,
    y: item.y,
    legalW: span.w,
    legalH: span.h,
    minW: clamp(min.w, 1, span.w),
    minH: clamp(min.h, 1, span.h),
    pointerId: event.pointerId,
  };
  gridMetrics = null;
  document.body.classList.add('is-resizing');
  document.body.dataset.resize = mode;
  els.grid.querySelector(`.tile[data-id="${CSS.escape(id)}"]`)?.classList.add('is-resizing');
  if (event.currentTarget?.setPointerCapture) {
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* window listeners still track the gesture */ }
  }
  window.addEventListener('pointermove', onResizeMove, { passive: false });
  window.addEventListener('pointerup', finishResize);
  window.addEventListener('pointercancel', finishResize);
}

function onResizeMove(event) {
  if (!resize || event.pointerId !== resize.pointerId) return;
  event.preventDefault();
  const cell = cellFromPointer(event.clientX, event.clientY);
  const roomW = Math.max(1, COLS - resize.x);
  const roomH = Math.max(1, ROWS - resize.y);
  let wantW = resize.legalW;
  let wantH = resize.legalH;
  if (resize.mode === 'e' || resize.mode === 'se') {
    wantW = clamp(cell.col - resize.x + 1, Math.min(resize.minW, roomW), roomW);
  }
  if (resize.mode === 's' || resize.mode === 'se') {
    wantH = clamp(cell.row - resize.y + 1, Math.min(resize.minH, roomH), roomH);
  }
  const blocked = reservedCells();
  const others = layout.items.filter((entry) => entry.id !== resize.id);
  const free = (w, h) => cellsFree(others, resize.x, resize.y, w, h, COLS, ROWS, blocked);
  let nextW = resize.legalW;
  let nextH = resize.legalH;
  if (free(wantW, wantH)) {
    nextW = wantW;
    nextH = wantH;
    hideBadge();
  } else {
    const stepW = Math.sign(wantW - nextW);
    const stepH = Math.sign(wantH - nextH);
    let guard = 0;
    while ((nextW !== wantW || nextH !== wantH) && guard < COLS + ROWS) {
      guard += 1;
      const growW = nextW === wantW ? nextW : nextW + stepW;
      const growH = nextH === wantH ? nextH : nextH + stepH;
      if (growW !== nextW && growH !== nextH && free(growW, growH)) {
        nextW = growW;
        nextH = growH;
        continue;
      }
      let moved = false;
      if (growW !== nextW && free(growW, nextH)) {
        nextW = growW;
        moved = true;
      }
      if (growH !== nextH && free(nextW, growH)) {
        nextH = growH;
        moved = true;
      }
      if (!moved) break;
    }
    showBadge(event.clientX, event.clientY);
  }
  if (nextW === resize.legalW && nextH === resize.legalH) return;
  resize.legalW = nextW;
  resize.legalH = nextH;
  const tile = els.grid.querySelector(`.tile[data-id="${CSS.escape(resize.id)}"]`);
  if (tile) placeTile(tile, { x: resize.x, y: resize.y, w: nextW, h: nextH });
}

async function finishResize(event) {
  if (!resize || event.pointerId !== resize.pointerId) return;
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', finishResize);
  window.removeEventListener('pointercancel', finishResize);
  const current = resize;
  resize = null;
  document.body.classList.remove('is-resizing');
  delete document.body.dataset.resize;
  for (const el of els.grid.querySelectorAll('.tile.is-resizing')) el.classList.remove('is-resizing');
  hideBadge();
  suppressClick = true;
  try {
    await commitDrop(() => {
      const item = layout.items.find((entry) => entry.id === current.id && entry.type === 'widget');
      if (!item) return;
      item.w = current.legalW;
      item.h = current.legalH;
    });
  } catch (error) {
    console.error(error);
    renderHome();
  }
}

function startDrag(source, event) {
  if (resize) return;
  gridMetrics = null;
  let item = null;
  if (source.type === 'drawer') {
    item = { id: uid(), type: 'widget', kind: source.kind };
  } else if (source.type === 'grid') {
    item = layout.items.find((entry) => entry.id === source.id) || null;
  } else if (source.type === 'folder') {
    const folder = layout.items.find((entry) => entry.id === source.folderId);
    item = folder?.children.find((entry) => entry.id === source.id) || null;
    closeFolder({ restore: false });
  }
  if (!item) return;
  drag = {
    source: source.type,
    folderId: source.folderId || null,
    item,
    signature: '',
    valid: false,
    mode: 'none',
    x: 0,
    y: 0,
    nestId: null,
    grab: grabOffset(item, source.type, event),
  };
  document.body.classList.add('is-dragging');
  els.chip.hidden = false;
  els.chip.textContent = chipLabel(item);
  updateDrag(event);
}

function updateDrag(event) {
  if (!drag) return;
  positionChip(event.clientX, event.clientY);
  const overHome = pointIn(els.grid, event.clientX, event.clientY);

  if (!overHome) {
    hideBadge();
    drag.mode = 'none';
    drag.valid = false;
    if (drag.signature !== 'away') {
      drag.signature = 'away';
      renderHome();
    }
    return;
  }

  const nestHit = folderAtPoint(event.clientX, event.clientY);
  if (nestHit === 'cancel') {
    hideBadge();
    drag.mode = 'none';
    drag.valid = false;
    if (drag.signature !== 'folder-cancel') {
      drag.signature = 'folder-cancel';
      renderHome();
    }
    return;
  }
  if (nestHit) {
    hideBadge();
    drag.mode = 'nest';
    drag.valid = true;
    drag.nestId = nestHit;
    const signature = `nest|${nestHit}`;
    if (drag.signature !== signature) {
      drag.signature = signature;
      renderHome({
        nestId: nestHit,
        hideId: drag.source === 'grid' ? drag.item.id : null,
      });
    }
    return;
  }

  const spot = dropSpot(drag.item, event.clientX, event.clientY, drag.grab);
  const others = layout.items.filter((item) => item.id !== drag.item.id);
  if (!cellsFree(others, spot.x, spot.y, spot.w, spot.h, COLS, ROWS, reservedCells())) {
    showBadge(event.clientX, event.clientY);
    drag.mode = 'invalid';
    drag.valid = false;
    if (drag.signature !== 'blocked') {
      drag.signature = 'blocked';
      renderHome({ hideId: drag.source === 'drawer' ? null : drag.item.id });
    }
    return;
  }

  hideBadge();
  drag.mode = 'grid';
  drag.valid = true;
  drag.x = spot.x;
  drag.y = spot.y;
  const signature = `grid|${spot.x}|${spot.y}`;
  if (drag.signature !== signature) {
    drag.signature = signature;
    renderHome({
      hideId: drag.item.id,
      ghost: { ...spot, label: chipLabel(drag.item) },
    });
  }
}

function grabOffset(item, source, event) {
  const span = spanFor(item);
  if (source === 'grid' && hasPosition(item)) {
    const cell = cellFromPointer(event.clientX, event.clientY);
    return {
      x: clamp(cell.col - item.x, 0, span.w - 1),
      y: clamp(cell.row - item.y, 0, span.h - 1),
    };
  }
  return {
    x: Math.floor((span.w - 1) / 2),
    y: Math.floor((span.h - 1) / 2),
  };
}

function dropSpot(item, clientX, clientY, grab) {
  const span = spanFor(item);
  const cell = cellFromPointer(clientX, clientY);
  return {
    x: clamp(cell.col - (grab?.x || 0), 0, COLS - span.w),
    y: clamp(cell.row - (grab?.y || 0), 0, ROWS - span.h),
    w: span.w,
    h: span.h,
  };
}

function detach(current) {
  if (current.source === 'drawer') return current.item;
  if (current.source === 'grid') {
    const index = layout.items.findIndex((item) => item.id === current.item.id);
    if (index < 0) return null;
    return layout.items.splice(index, 1)[0];
  }
  if (current.source === 'folder') {
    const folder = layout.items.find((item) => item.id === current.folderId && item.type === 'folder');
    if (!folder) return null;
    const index = folder.children.findIndex((item) => item.id === current.item.id);
    if (index < 0) return null;
    return folder.children.splice(index, 1)[0];
  }
  return null;
}

async function commitDrop(mutate) {
  const snapshot = structuredClone(layout);
  mutate();
  if (!stampPositions(layout.items, COLS, ROWS).ok) {
    layout = snapshot;
    renderHome();
    return;
  }
  await saveLayout(layout);
  renderHome();
}

async function finishDrag() {
  const current = drag;
  drag = null;
  document.body.classList.remove('is-dragging');
  els.chip.hidden = true;
  hideBadge();
  suppressClick = true;
  try {
    if (current?.mode === 'grid' && current.valid) {
      await commitDrop(() => {
        const moving = current.source === 'grid'
          ? layout.items.find((item) => item.id === current.item.id)
          : detach(current);
        if (!moving) return;
        moving.x = current.x;
        moving.y = current.y;
        if (!layout.items.includes(moving)) layout.items.push(moving);
      });
      return;
    }
    if (current?.mode === 'nest' && current.valid) {
      await commitDrop(() => {
        const folder = layout.items.find((item) => item.id === current.nestId && item.type === 'folder');
        if (!folder) return;
        const moving = detach(current);
        if (!moving || moving.type !== 'shortcut') return;
        folder.children.push(moving);
      });
      return;
    }
  } catch (error) {
    console.error(error);
  }
  renderHome();
}

function widgetKinds(items) {
  const kinds = new Set();
  for (const item of items) {
    if (item?.type === 'widget' && item.kind) kinds.add(item.kind);
  }
  return kinds;
}

const WEATHER_KINDS = ['weather-compact', 'weather', 'weather-now', 'weather-range', 'sunny'];

function hasWeather(kinds) {
  return WEATHER_KINDS.some((kind) => kinds.has(kind));
}

async function resetRemovedWidgets(previous, next) {
  const patch = {};
  if (previous.has('timer') && !next.has('timer')) {
    patch.timer = { base: 0, running: false, startedAt: 0 };
  }
  if (previous.has('stopwatch') && !next.has('stopwatch')) {
    patch.stopwatch = { base: 0, running: false, startedAt: 0 };
  }
  if (previous.has('coords') && !next.has('coords')) patch.coords = null;
  const jobs = [];
  if (Object.keys(patch).length) jobs.push(patchNx(patch));
  if (previous.has('focus') && !next.has('focus')) {
    jobs.push(chrome.runtime.sendMessage({ type: 'focus-stop' }).catch(() => {}));
  }
  if (hasWeather(previous) && !hasWeather(next)) jobs.push(resetWeather());
  await Promise.all(jobs);
}

async function removeById(id) {
  const previous = widgetKinds(layout.items);
  layout.items = layout.items
    .filter((item) => item.id !== id)
    .map((item) => (item.type === 'folder'
      ? { ...item, children: item.children.filter((child) => child.id !== id) }
      : item));
  if (openFolderId === id) closeFolder({ restore: false });
  await saveLayout(layout);
  await resetRemovedWidgets(previous, widgetKinds(layout.items));
  renderHome();
}

function parkNewItem(item) {
  const span = spanFor(item);
  const blocked = reservedCells();
  for (let y = 0; y <= ROWS - span.h; y += 1) {
    for (let x = 0; x <= COLS - span.w; x += 1) {
      if (!cellsFree(layout.items, x, y, span.w, span.h, COLS, ROWS, blocked)) continue;
      item.x = x;
      item.y = y;
      layout.items.push(item);
      return true;
    }
  }
  return false;
}

async function createItem(spec) {
  if (spec.type === 'folder') {
    const item = { id: uid(), type: 'folder', title: spec.title, children: [] };
    if (!parkNewItem(item)) return { error: 'The home screen is full.' };
  } else {
    const url = normalizeHttpUrl(spec.url);
    if (!url) return { error: 'Use an http or https address.' };
    const item = { id: uid(), type: 'shortcut', title: spec.title, url };
    if (spec.iconId) item.iconId = spec.iconId;
    if (!parkNewItem(item)) return { error: 'The home screen is full.' };
  }
  await saveLayout(layout);
  renderHome();
  return { ok: true };
}

function renderFolderBody() {
  const folder = layout.items.find((item) => item.id === openFolderId && item.type === 'folder');
  if (!folder) {
    closeFolder({ restore: false });
    return;
  }
  els.folderTitle.textContent = folder.title || 'Folder';
  els.folderBody.replaceChildren();
  if (!folder.children.length) {
    const empty = document.createElement('p');
    empty.className = 'folder-empty';
    empty.textContent = 'Drop shortcuts onto this folder.';
    els.folderBody.append(empty);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'folder-icons';
  for (const child of folder.children) {
    const wrap = document.createElement('div');
    wrap.className = 'folder-icon';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'folder-open';
    open.append(makeShortcutVisual(child, 'shortcut-icon'), makeLabel(child.title));
    open.addEventListener('click', () => {
      if (!suppressClick) openUrl(child.url);
    });
    wrap.append(open, makeMore(child));
    wrap.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('.tile-more, .tile-menu')) return;
      trackPointer(event, { type: 'folder', folderId: folder.id, id: child.id });
    });
    grid.append(wrap);
  }
  els.folderBody.append(grid);
}

function openFolder(id, originEl) {
  const folder = layout.items.find((item) => item.id === id && item.type === 'folder');
  if (!folder) return;
  openFolderId = id;
  folderReturn = originEl || null;
  renderFolderBody();
  els.folderLayer.hidden = false;
  els.folderClose.focus();
  if (prefersReducedMotion()) return;
  const originNode = originEl?.querySelector?.('.folder-blob, .shortcut-icon, .monogram') || originEl;
  requestAnimationFrame(() => {
    if (!originNode || els.folderLayer.hidden) return;
    const origin = originNode.getBoundingClientRect();
    const final = els.folderPanel.getBoundingClientRect();
    if (!final.width || !final.height || !origin.width) return;
    const dx = origin.left + origin.width / 2 - (final.left + final.width / 2);
    const dy = origin.top + origin.height / 2 - (final.top + final.height / 2);
    const sx = Math.max(0.05, origin.width / final.width);
    const sy = Math.max(0.05, origin.height / final.height);
    els.folderPanel.getAnimations().forEach((animation) => animation.cancel());
    els.folderPanel.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.4 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      { duration: FOLDER_MS, easing: 'cubic-bezier(.2,.85,.2,1)', fill: 'both' },
    );
  });
}

function closeFolder({ restore = true } = {}) {
  els.folderPanel.getAnimations().forEach((animation) => animation.cancel());
  els.folderLayer.hidden = true;
  openFolderId = null;
  if (restore && folderReturn?.isConnected) folderReturn.focus();
  folderReturn = null;
}

function closeSheets() {
  customizeApi?.close();
  addSheetApi?.close();
  els.sheetBack.hidden = true;
}

let customizeApi = null;
let addSheetApi = null;

function wire() {
  drawerApi = initDrawer({
    button: els.widgetsBtn,
    panel: els.drawer,
    backdrop: els.drawerBack,
    list: els.drawerList,
  }, {
    onCardPointerDown(event, widget) {
      trackPointer(event, { type: 'drawer', kind: widget.kind });
    },
  });

  customizeApi = initCustomize(els.customize, {
    getLayout: () => layout,
    apply(patch) {
      const wallpaperChanged = Object.prototype.hasOwnProperty.call(patch, 'themeId')
        || Object.prototype.hasOwnProperty.call(patch, 'backgroundImage');
      layout = { ...layout, ...patch };
      if (wallpaperChanged) applyThemeFromLayout();
      else applySurface();
      saveLayout(layout).catch((error) => console.error(error));
    },
    onClose: closeSheets,
  });

  addSheetApi = initAddSheet(els.addSheet, {
    onCreate: createItem,
    onClose: closeSheets,
  });

  els.gear.addEventListener('click', () => {
    addSheetApi.close();
    customizeApi.open();
    els.sheetBack.hidden = false;
    drawerApi.close();
  });
  els.add.addEventListener('click', () => {
    customizeApi.close();
    addSheetApi.open();
    els.sheetBack.hidden = false;
    drawerApi.close();
  });
  els.sheetBack.addEventListener('click', closeSheets);
  els.hintDismiss.addEventListener('click', async () => {
    layout.hintSeen = true;
    els.hint.hidden = true;
    await saveLayout(layout);
  });
  els.folderClose.addEventListener('click', () => closeFolder());
  els.folderLayer.addEventListener('click', (event) => {
    if (event.target === els.folderLayer) closeFolder();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!itemMenu) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (itemMenu.node.contains(target) || itemMenu.button.contains(target)) return;
    const openingAnother = Boolean(target.closest('.tile-more'));
    closeItemMenu();
    if (openingAnother) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  document.addEventListener('scroll', () => {
    if (itemMenu) closeItemMenu();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (itemMenu) {
      event.preventDefault();
      closeItemMenu();
      return;
    }
    if (!els.folderLayer.hidden) {
      closeFolder();
      return;
    }
    if (!els.sheetBack.hidden) {
      closeSheets();
      return;
    }
    drawerApi.close();
  });
  document.addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  document.addEventListener('pointerdown', () => {
    suppressClick = false;
  }, true);
  new ResizeObserver(() => fitGrid()).observe(els.stage);
}

function cacheElements() {
  els.wallpaper = document.getElementById('wallpaper');
  els.dim = document.getElementById('dim');
  els.hint = document.getElementById('hint');
  els.hintText = document.getElementById('hint-text');
  els.hintDismiss = document.getElementById('hint-dismiss');
  els.widgetsBtn = document.getElementById('widgets-btn');
  els.add = document.getElementById('add-btn');
  els.gear = document.getElementById('gear-btn');
  els.stage = document.getElementById('stage');
  els.grid = document.getElementById('grid');
  els.corner = document.querySelector('.corner-actions');
  els.drawer = document.getElementById('drawer');
  els.drawerBack = document.getElementById('drawer-back');
  els.drawerList = document.getElementById('drawer-list');
  els.sheetBack = document.getElementById('sheet-back');
  els.customize = document.getElementById('customize-sheet');
  els.addSheet = document.getElementById('add-sheet');
  els.folderLayer = document.getElementById('folder-layer');
  els.folderPanel = document.getElementById('folder-panel');
  els.folderTitle = document.getElementById('folder-title');
  els.folderBody = document.getElementById('folder-body');
  els.folderClose = document.getElementById('folder-close');
  els.chip = document.getElementById('drag-chip');
  els.prohibit = document.getElementById('prohibit');
}

async function boot() {
  cacheElements();
  applyGridShape();
  fitGrid();
  onNx((state) => applyAppearance(state[APPEARANCE_KEY] !== false));
  layout = await loadLayout();
  const kept = layout.items.filter((item) => item.type !== 'widget' || getWidget(item.kind));
  if (kept.length !== layout.items.length) {
    layout.items = kept;
    await saveLayout(layout);
  }
  applyThemeFromLayout();
  const appearance = await loadNx();
  if (typeof appearance[APPEARANCE_KEY] !== 'boolean') {
    await patchNx({ [APPEARANCE_KEY]: true });
  }
  applyAppearance(appearance[APPEARANCE_KEY] !== false);
  els.hint.hidden = Boolean(layout.hintSeen);
  wire();
  renderHome();
  requestAnimationFrame(fitGrid);
}

boot().catch((error) => {
  console.error(error);
  const hint = document.getElementById('hint');
  const text = document.getElementById('hint-text');
  if (hint && text) {
    hint.hidden = false;
    text.textContent = 'Open this folder with Load unpacked, then use a new tab.';
  }
});
