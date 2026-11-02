import './themes/index.js';
import { COLS, ROWS, stampPositions } from './grid.js';
import { getTheme } from './themes/registry.js';

const DEFAULT_THEME = 'harbor';
const IMAGE_DB = 'widget-drawer';
const IMAGE_STORE = 'background';
const IMAGE_KEY = 'image';

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeHttpUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const withScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function createDefaultLayout() {
  const theme = getTheme(DEFAULT_THEME);
  return {
    themeId: theme?.id || DEFAULT_THEME,
    backgroundImage: false,
    dim: theme?.dim ?? 0.3,
    glass: 0.6,
    hintSeen: false,
    items: [
      { id: uid(), type: 'widget', kind: 'clock' },
      { id: uid(), type: 'widget', kind: 'search' },
    ],
  };
}

export async function loadLayout() {
  const stored = await chrome.storage.local.get('layout');
  if (!stored.layout) {
    const fresh = createDefaultLayout();
    await chrome.storage.local.set({ layout: fresh });
    return fresh;
  }
  const normalized = normalizeLayout(stored.layout);
  if (Object.prototype.hasOwnProperty.call(stored.layout, 'dock')) await saveLayout(normalized);
  return normalized;
}

export function saveLayout(layout) {
  return chrome.storage.local.set({ layout });
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE);
    };
    request.onerror = () => reject(request.error || new Error('Could not open image storage'));
    request.onsuccess = () => resolve(request.result);
  });
}

function withImageStore(mode, run) {
  return openImageDb().then((db) => new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      db.close();
      handler(value);
    };
    let payload;
    const tx = db.transaction(IMAGE_STORE, mode);
    const request = run(tx.objectStore(IMAGE_STORE));
    if (request) {
      request.onsuccess = () => {
        payload = request.result;
      };
      request.onerror = () => finish(reject, request.error || new Error('Could not read the image'));
    }
    tx.oncomplete = () => finish(resolve, payload);
    tx.onerror = () => finish(reject, tx.error || new Error('Could not store the image'));
    tx.onabort = () => finish(reject, tx.error || new Error('Could not store the image'));
  }));
}

export function saveBackgroundBlob(blob) {
  return withImageStore('readwrite', (store) => {
    store.put(blob, IMAGE_KEY);
  });
}

export function loadBackgroundBlob() {
  return withImageStore('readonly', (store) => store.get(IMAGE_KEY)).then((value) => (
    value instanceof Blob ? value : null
  ));
}

function normalizeLayout(layout) {
  const theme = getTheme(layout?.themeId) || getTheme(DEFAULT_THEME);
  const dim = Number(layout?.dim);
  const glass = Number(layout?.glass);
  return {
    themeId: theme?.id || DEFAULT_THEME,
    backgroundImage: layout?.backgroundImage === true,
    dim: Number.isFinite(dim) ? clamp(dim, 0, 0.85) : (theme?.dim ?? 0.3),
    glass: Number.isFinite(glass) ? clamp(glass, 0, 1) : 0.6,
    hintSeen: Boolean(layout?.hintSeen),
    items: stampLayout(absorbDock(
      Array.isArray(layout?.items) ? layout.items.map(normalizeItem).filter(Boolean) : [],
      Array.isArray(layout?.dock) ? layout.dock.map(normalizeShortcut).filter(Boolean) : [],
    )),
  };
}

function absorbDock(items, dock) {
  const next = items.slice();
  const known = new Set();
  for (const item of next) {
    known.add(item.id);
    if (item.type === 'folder') {
      for (const child of item.children) known.add(child.id);
    }
  }
  const leftover = [];
  for (const shortcut of dock) {
    if (known.has(shortcut.id)) continue;
    if (stampPositions([...next, shortcut]).ok) {
      next.push(shortcut);
      known.add(shortcut.id);
    } else leftover.push(shortcut);
  }
  if (!leftover.length) return next;
  const folder = next.find((item) => item.type === 'folder');
  if (folder) {
    folder.children.push(...leftover);
    return next;
  }
  const dockFolder = {
    id: uid(),
    type: 'folder',
    title: 'Shortcuts',
    children: leftover,
  };
  if (stampPositions([...next, dockFolder]).ok) next.push(dockFolder);
  return next;
}

function stampLayout(items) {
  stampPositions(items);
  return items;
}

function savedSpan(value, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 0;
  return Math.min(max, n);
}

function withPosition(item, source) {
  if (Number.isInteger(source?.x) && source.x >= 0 && Number.isInteger(source?.y) && source.y >= 0) {
    item.x = source.x;
    item.y = source.y;
  }
  if (item.type === 'widget') {
    const w = savedSpan(source?.w, COLS);
    const h = savedSpan(source?.h, ROWS);
    if (w) item.w = w;
    if (h) item.h = h;
  }
  return item;
}

function normalizeItem(item) {
  if (!item || typeof item !== 'object') return null;
  if (item.type === 'widget' && typeof item.kind === 'string' && item.kind) {
    return withPosition({ id: item.id || uid(), type: 'widget', kind: item.kind }, item);
  }
  if (item.type === 'shortcut') return normalizeShortcut(item);
  if (item.type === 'folder') {
    return withPosition({
      id: item.id || uid(),
      type: 'folder',
      title: cleanTitle(item.title, 'Folder'),
      children: Array.isArray(item.children) ? item.children.map(normalizeShortcut).filter(Boolean) : [],
    }, item);
  }
  return null;
}

function normalizeShortcut(item) {
  const url = normalizeHttpUrl(item?.url);
  if (!url) return null;
  const shortcut = {
    id: item.id || uid(),
    type: 'shortcut',
    title: cleanTitle(item.title, hostnameOf(url)),
    url,
  };
  if (typeof item.iconId === 'string' && item.iconId) shortcut.iconId = item.iconId;
  return withPosition(shortcut, item);
}

function cleanTitle(value, fallback) {
  const title = String(value || '').trim().slice(0, 40);
  return title || fallback;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Shortcut';
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
