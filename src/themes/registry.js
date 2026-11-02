const themes = [];

export function registerTheme(theme) {
  if (!theme || typeof theme.id !== 'string' || typeof theme.name !== 'string') {
    throw new Error('registerTheme requires id and name');
  }
  if (themes.some((entry) => entry.id === theme.id)) {
    console.warn(`Theme "${theme.id}" is already registered`);
    return;
  }
  const dim = Number(theme.dim);
  themes.push({
    id: theme.id,
    name: theme.name,
    group: theme.group || 'color',
    tone: theme.tone === 'light' ? 'light' : 'dark',
    background: theme.background || '#111418',
    dim: Number.isFinite(dim) ? dim : 0.2,
  });
}

export function listThemes() {
  return themes.slice();
}

export function getTheme(id) {
  return themes.find((entry) => entry.id === id) || null;
}
