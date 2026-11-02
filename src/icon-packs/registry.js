const packs = [];

export function registerIconPack(pack) {
  if (!pack || typeof pack.id !== 'string' || typeof pack.name !== 'string' || !Array.isArray(pack.icons)) {
    throw new Error('registerIconPack requires id, name, and icons');
  }
  if (packs.some((entry) => entry.id === pack.id)) {
    console.warn(`Icon pack "${pack.id}" is already registered`);
    return;
  }
  const icons = [];
  for (const icon of pack.icons) {
    if (!icon?.id || !icon.name || !icon.src || !isHttp(icon.url)) continue;
    icons.push({
      id: String(icon.id),
      name: String(icon.name),
      url: String(icon.url),
      src: String(icon.src),
    });
  }
  packs.push({ id: pack.id, name: pack.name, icons });
}

export function listIconPacks() {
  return packs.map((pack) => ({ ...pack, icons: pack.icons.slice() }));
}

export function findIcon(id) {
  for (const pack of packs) {
    const icon = pack.icons.find((entry) => entry.id === id);
    if (icon) return icon;
  }
  return null;
}

export function shortcutIconSrc(shortcut) {
  if (shortcut?.iconId) {
    const icon = findIcon(shortcut.iconId);
    if (icon?.src) return icon.src;
  }
  try {
    const url = new URL(shortcut.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=128`;
    }
  } catch {
    /* A missing address falls through to the monogram. */
  }
  return '';
}

export function shortcutMonogram(shortcut) {
  const title = shortcut?.title?.trim();
  if (title) return title.slice(0, 1).toUpperCase();
  try {
    return new URL(shortcut.url).hostname.replace(/^www\./, '').slice(0, 1).toUpperCase() || '?';
  } catch {
    return '?';
  }
}

function isHttp(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
