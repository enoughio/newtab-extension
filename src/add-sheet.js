import './icon-packs/index.js';
import { listIconPacks } from './icon-packs/registry.js';
import { normalizeHttpUrl } from './store.js';

export function initAddSheet(container, { onCreate, onClose }) {
  container.innerHTML = `
    <header class="sheet-head">
      <h2>Add</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close">×</button>
    </header>
    <div class="seg" role="tablist">
      <button type="button" data-mode="shortcut" class="is-on">Shortcut</button>
      <button type="button" data-mode="folder">Folder</button>
    </div>
    <form>
      <label class="field">
        <span data-title-label>Name</span>
        <input name="title" type="text" maxlength="40" autocomplete="off">
      </label>
      <div data-shortcut-fields>
        <label class="field">
          <span>Address</span>
          <input name="url" type="text" inputmode="url" maxlength="2000" placeholder="https://" autocomplete="off" spellcheck="false">
        </label>
        <div data-icons></div>
      </div>
      <p class="sheet-error" data-error></p>
      <button class="primary" type="submit">Add</button>
    </form>`;

  const form = container.querySelector('form');
  const titleInput = form.querySelector('[name="title"]');
  const urlInput = form.querySelector('[name="url"]');
  const shortcutFields = container.querySelector('[data-shortcut-fields]');
  const titleLabel = container.querySelector('[data-title-label]');
  const iconGrid = container.querySelector('[data-icons]');
  const errorEl = container.querySelector('[data-error]');
  const submit = form.querySelector('.primary');
  let mode = 'shortcut';
  let selectedId = null;
  let filledFromIcon = false;
  let iconUrls = new Map();

  function setError(message) {
    errorEl.textContent = message || '';
  }

  function refreshSubmit() {
    if (mode === 'folder') {
      submit.disabled = false;
      return;
    }
    submit.disabled = !normalizeHttpUrl(urlInput.value);
  }

  function selectIcon(id) {
    selectedId = id;
    for (const button of iconGrid.querySelectorAll('.icon-choice')) {
      button.classList.toggle('is-chosen', button.dataset.iconId === (id || ''));
    }
    const nextUrl = id ? iconUrls.get(id) : '';
    if (!urlInput.value.trim() || filledFromIcon) {
      urlInput.value = nextUrl || '';
      filledFromIcon = Boolean(id);
    }
    refreshSubmit();
  }

  function buildIcons() {
    iconGrid.replaceChildren();
    iconUrls = new Map();
    const autoRow = document.createElement('div');
    autoRow.className = 'icon-grid';
    const auto = document.createElement('button');
    auto.type = 'button';
    auto.className = 'icon-choice is-chosen';
    auto.dataset.iconId = '';
    auto.innerHTML = '<span class="mini-fallback">Auto</span><span>Favicon</span>';
    auto.addEventListener('click', () => selectIcon(null));
    autoRow.append(auto);
    iconGrid.append(autoRow);
    for (const pack of listIconPacks()) {
      const heading = document.createElement('div');
      heading.className = 'pack-name';
      heading.textContent = pack.name;
      const row = document.createElement('div');
      row.className = 'icon-grid';
      for (const icon of pack.icons) {
        iconUrls.set(icon.id, icon.url);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-choice';
        button.dataset.iconId = icon.id;
        const img = document.createElement('img');
        img.alt = '';
        img.src = icon.src;
        img.draggable = false;
        const label = document.createElement('span');
        label.textContent = icon.name;
        button.append(img, label);
        button.addEventListener('click', () => selectIcon(icon.id));
        row.append(button);
      }
      iconGrid.append(heading, row);
    }
  }

  function setMode(next) {
    mode = next;
    for (const button of container.querySelectorAll('[data-mode]')) {
      button.classList.toggle('is-on', button.dataset.mode === mode);
    }
    shortcutFields.hidden = mode !== 'shortcut';
    titleLabel.textContent = mode === 'folder' ? 'Folder name' : 'Name';
    setError('');
    refreshSubmit();
  }

  container.querySelector('[data-close]').addEventListener('click', onClose);
  for (const button of container.querySelectorAll('[data-mode]')) {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  }
  urlInput.addEventListener('input', () => {
    if (filledFromIcon && urlInput.value.trim() !== (iconUrls.get(selectedId) || '')) filledFromIcon = false;
    setError('');
    refreshSubmit();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError('');
    submit.disabled = true;
    try {
      let result;
      if (mode === 'folder') {
        const title = titleInput.value.trim().slice(0, 40) || 'Folder';
        result = await onCreate({ type: 'folder', title });
      } else {
        const url = normalizeHttpUrl(urlInput.value);
        if (!url) {
          setError('Use an http or https address.');
          refreshSubmit();
          return;
        }
        let title = titleInput.value.trim().slice(0, 40);
        if (!title) title = new URL(url).hostname.replace(/^www\./, '');
        result = await onCreate({
          type: 'shortcut',
          title,
          url,
          iconId: selectedId,
        });
      }
      if (result?.error) {
        setError(result.error);
        refreshSubmit();
        return;
      }
      onClose();
    } catch (error) {
      console.error(error);
      setError('Could not add that.');
      refreshSubmit();
    }
  });

  return {
    open() {
      mode = 'shortcut';
      selectedId = null;
      filledFromIcon = false;
      form.reset();
      buildIcons();
      setMode('shortcut');
      setError('');
      container.hidden = false;
      titleInput.focus();
    },
    close() {
      container.hidden = true;
    },
  };
}
