import './themes/index.js';
import { listThemes } from './themes/registry.js';
import { loadBackgroundBlob, saveBackgroundBlob } from './store.js';
import { loadNx, onNx, patchNx } from './widgets/kit.js';

const APPEARANCE_KEY = 'toggle-dark-mode';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1920;
const JPEG_QUALITY = 0.86;

const GROUP_ORDER = ['color', 'gradient', 'wallpaper'];
const GROUP_LABELS = { color: 'Color', gradient: 'Gradient', wallpaper: 'Wallpaper' };

export function initCustomize(container, { getLayout, apply, onClose }) {
  container.innerHTML = `
    <header class="sheet-head">
      <h2>Theme</h2>
      <button type="button" class="icon-btn" data-close aria-label="Close">×</button>
    </header>
    <h3 class="group-label">Appearance</h3>
    <div class="seg" role="group" aria-label="Appearance">
      <button type="button" data-appearance="light">Light</button>
      <button type="button" data-appearance="dark">Dark</button>
    </div>
    <div class="theme-groups"></div>
    <h3 class="group-label">Upload</h3>
    <div class="upload-row">
      <div class="swatch-wrap" data-upload-wrap hidden>
        <button type="button" class="swatch" data-upload-use aria-label="Uploaded photo"></button>
        <span>Photo</span>
      </div>
      <label class="upload-pick">
        Choose image
        <input type="file" accept="image/*">
      </label>
    </div>
    <p class="sheet-error upload-error" data-upload-error></p>
    <label class="dim-row">
      <span>Dim</span>
      <input type="range" min="0" max="0.75" step="0.01" data-dim aria-label="Dim">
      <span class="dim-value" data-dim-value>0%</span>
    </label>
    <label class="dim-row">
      <span>Morph</span>
      <input type="range" min="0" max="1" step="0.01" data-glass aria-label="Morph">
      <span class="dim-value" data-glass-value>60%</span>
    </label>`;
  const groups = container.querySelector('.theme-groups');
  const slider = container.querySelector('[data-dim]');
  const dimValue = container.querySelector('[data-dim-value]');
  const glassSlider = container.querySelector('[data-glass]');
  const glassValue = container.querySelector('[data-glass-value]');
  const fileInput = container.querySelector('input[type="file"]');
  const uploadError = container.querySelector('[data-upload-error]');
  const uploadWrap = container.querySelector('[data-upload-wrap]');
  const uploadUse = container.querySelector('[data-upload-use]');
  let dark = true;
  let savedBlob = null;
  let thumbBlob = null;
  let thumbUrl = null;
  let loadToken = 0;
  let reading = false;

  function paintAppearance() {
    for (const button of container.querySelectorAll('[data-appearance]')) {
      const on = button.dataset.appearance === (dark ? 'dark' : 'light');
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  for (const button of container.querySelectorAll('[data-appearance]')) {
    button.addEventListener('click', () => {
      dark = button.dataset.appearance === 'dark';
      paintAppearance();
      patchNx({ [APPEARANCE_KEY]: dark }).catch((error) => console.error(error));
    });
  }

  onNx((state) => {
    dark = state[APPEARANCE_KEY] !== false;
    paintAppearance();
  });
  loadNx().then((state) => {
    dark = state[APPEARANCE_KEY] !== false;
    paintAppearance();
  }).catch((error) => console.error(error));

  function setSavedBlob(blob) {
    savedBlob = blob || null;
  }

  function syncThumb(selected) {
    if (savedBlob !== thumbBlob) {
      const nextUrl = savedBlob ? URL.createObjectURL(savedBlob) : null;
      uploadUse.style.background = nextUrl ? `#333 center / cover no-repeat url("${nextUrl}")` : '';
      const previous = thumbUrl;
      thumbUrl = nextUrl;
      thumbBlob = savedBlob;
      if (previous) URL.revokeObjectURL(previous);
    }
    const on = Boolean(selected && thumbUrl);
    uploadWrap.hidden = !thumbUrl;
    uploadUse.classList.toggle('is-selected', on);
    uploadUse.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function paint() {
    const layout = getLayout();
    const usingPhoto = layout.backgroundImage === true && Boolean(savedBlob);
    groups.replaceChildren();
    const byGroup = new Map();
    for (const theme of listThemes()) {
      if (!byGroup.has(theme.group)) byGroup.set(theme.group, []);
      byGroup.get(theme.group).push(theme);
    }
    const names = [
      ...GROUP_ORDER.filter((name) => byGroup.has(name)),
      ...[...byGroup.keys()].filter((name) => !GROUP_ORDER.includes(name)),
    ];
    for (const name of names) {
      const heading = document.createElement('h3');
      heading.className = 'group-label';
      heading.textContent = GROUP_LABELS[name] || name;
      const row = document.createElement('div');
      row.className = 'swatches';
      for (const theme of byGroup.get(name)) {
        const wrap = document.createElement('div');
        wrap.className = 'swatch-wrap';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'swatch';
        if (!usingPhoto && theme.id === layout.themeId) button.classList.add('is-selected');
        button.style.background = theme.background;
        button.setAttribute('aria-label', theme.name);
        button.addEventListener('click', () => {
          uploadError.textContent = '';
          apply({ themeId: theme.id, dim: theme.dim, backgroundImage: false });
          paint();
        });
        const label = document.createElement('span');
        label.textContent = theme.name;
        wrap.append(button, label);
        row.append(wrap);
      }
      groups.append(heading, row);
    }
    slider.value = String(layout.dim ?? 0);
    dimValue.textContent = `${Math.round((layout.dim ?? 0) * 100)}%`;
    const glass = Number(layout.glass);
    const glassAmount = Number.isFinite(glass) ? glass : 0.6;
    glassSlider.value = String(glassAmount);
    glassValue.textContent = `${Math.round(glassAmount * 100)}%`;
    syncThumb(usingPhoto);
  }

  async function downscaleImage(file) {
    const source = await createImageBitmap(file);
    let scaled = null;
    try {
      const longest = Math.max(source.width, source.height);
      if (!longest) throw new Error('Could not use that image.');
      const scale = Math.min(1, MAX_IMAGE_EDGE / longest);
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      let draw = source;
      if (scale < 1) {
        try {
          scaled = await createImageBitmap(source, {
            resizeWidth: width,
            resizeHeight: height,
            resizeQuality: 'high',
          });
          draw = scaled;
        } catch {
          draw = source;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not use that image.');
      context.drawImage(draw, 0, 0, width, height);
      return await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Could not use that image.'));
        }, 'image/jpeg', JPEG_QUALITY);
      });
    } finally {
      source.close();
      if (scaled) scaled.close();
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file || (file.type && !file.type.startsWith('image/'))) return;
    if (reading) return;
    if (file.size > MAX_IMAGE_BYTES) {
      uploadError.textContent = 'Choose an image under 15 MB.';
      return;
    }
    reading = true;
    uploadError.textContent = '';
    downscaleImage(file).then((blob) => saveBackgroundBlob(blob).then(() => blob)).then((blob) => {
      setSavedBlob(blob);
      apply({ backgroundImage: true });
      paint();
    }).catch(() => {
      uploadError.textContent = 'Could not use that image.';
    }).finally(() => {
      reading = false;
    });
  });

  uploadUse.addEventListener('click', () => {
    if (!savedBlob) return;
    uploadError.textContent = '';
    apply({ backgroundImage: true });
    paint();
  });

  slider.addEventListener('input', () => {
    const dim = Number(slider.value);
    dimValue.textContent = `${Math.round(dim * 100)}%`;
    apply({ dim });
  });
  glassSlider.addEventListener('input', () => {
    const glass = Number(glassSlider.value);
    glassValue.textContent = `${Math.round(glass * 100)}%`;
    apply({ glass });
  });
  container.querySelector('[data-close]').addEventListener('click', onClose);

  return {
    open() {
      uploadError.textContent = '';
      paintAppearance();
      container.hidden = false;
      paint();
      const token = ++loadToken;
      loadBackgroundBlob().then((blob) => {
        if (token !== loadToken) return;
        setSavedBlob(blob);
        paint();
      }).catch((error) => {
        console.error(error);
        if (token !== loadToken) return;
        setSavedBlob(null);
        paint();
      });
    },
    close() {
      container.hidden = true;
    },
  };
}
