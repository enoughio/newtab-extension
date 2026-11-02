import './widgets/index.js';
import { COLS, ROWS } from './grid.js';
import { listWidgets } from './widgets/registry.js';

const PREVIEW_MAX_H = 148;

export function initDrawer({ button, panel, backdrop, list }, { onCardPointerDown }) {
  let open = false;
  let cleanups = [];
  let frames = [];
  let fitKey = '';
  let observer = null;

  function releasePreviews() {
    observer?.disconnect();
    observer = null;
    for (const cleanup of cleanups) {
      try { cleanup(); } catch (error) { console.error(error); }
    }
    cleanups = [];
    frames = [];
    fitKey = '';
    list.replaceChildren();
  }

  function gridCell() {
    const grid = document.getElementById('grid');
    if (grid) {
      const rect = grid.getBoundingClientRect();
      const styles = getComputedStyle(grid);
      const colGap = parseFloat(styles.columnGap) || 0;
      const rowGap = parseFloat(styles.rowGap) || 0;
      const w = (rect.width - colGap * (COLS - 1)) / COLS;
      const h = (rect.height - rowGap * (ROWS - 1)) / ROWS;
      if (w > 8 && h > 8) return { w, h, colGap, rowGap };
    }
    return { w: 52, h: 52, colGap: 4, rowGap: 4 };
  }

  function maxPreviewWidth() {
    const styles = getComputedStyle(list);
    const pad = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    return list.clientWidth - pad;
  }

  function sizeFrame(frame, cell, maxW) {
    const spanW = Number(frame.dataset.spanW);
    const spanH = Number(frame.dataset.spanH);
    const stage = frame.querySelector('.widget-preview-stage');
    if (!stage || !(spanW > 0) || !(spanH > 0)) return;
    const naturalW = spanW * cell.w + (spanW - 1) * cell.colGap;
    const naturalH = spanH * cell.h + (spanH - 1) * cell.rowGap;
    if (!(naturalW > 0) || !(naturalH > 0)) return;
    const scale = Math.min(1, maxW / naturalW, PREVIEW_MAX_H / naturalH);
    stage.style.width = `${naturalW}px`;
    stage.style.height = `${naturalH}px`;
    stage.style.transform = `scale(${scale})`;
    frame.style.width = `${naturalW * scale}px`;
    frame.style.height = `${naturalH * scale}px`;
  }

  function fitPreviews() {
    if (!frames.length) return;
    const maxW = maxPreviewWidth();
    if (maxW < 8) return;
    const cell = gridCell();
    const signature = [
      Math.round(maxW),
      Math.round(cell.w * 10),
      Math.round(cell.h * 10),
      Math.round(cell.colGap * 10),
      Math.round(cell.rowGap * 10),
    ].join(':');
    if (signature === fitKey) return;
    fitKey = signature;
    for (const frame of frames) sizeFrame(frame, cell, maxW);
  }

  function watchFit() {
    observer?.disconnect();
    observer = new ResizeObserver(() => fitPreviews());
    observer.observe(list);
    const grid = document.getElementById('grid');
    if (grid) observer.observe(grid);
  }

  function mountPreviews() {
    releasePreviews();
    for (const widget of listWidgets()) {
      const card = document.createElement('article');
      card.className = 'widget-card';
      card.draggable = false;
      card.setAttribute('aria-label', widget.name);
      const tipId = `widget-tip-${widget.kind}`;
      card.setAttribute('aria-describedby', tipId);

      const frame = document.createElement('div');
      frame.className = 'widget-preview';
      frame.dataset.spanW = String(widget.span.w);
      frame.dataset.spanH = String(widget.span.h);

      const stage = document.createElement('div');
      stage.className = 'widget-preview-stage tile-widget';
      stage.inert = true;

      const host = document.createElement('div');
      host.className = 'widget-host';
      stage.append(host);
      frame.append(stage);

      const tip = document.createElement('span');
      tip.className = 'widget-tip';
      tip.id = tipId;
      tip.setAttribute('role', 'tooltip');
      tip.textContent = widget.description || widget.name;

      card.append(frame, tip);
      card.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        onCardPointerDown(event, widget);
      });
      list.append(card);
      frames.push(frame);

      try {
        const cleanup = widget.mount(host);
        if (typeof cleanup === 'function') cleanups.push(cleanup);
      } catch (error) {
        console.error(error);
        host.replaceChildren(widget.name);
      }
    }
    fitPreviews();
    fitPreviews();
    watchFit();
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;
    document.body.classList.toggle('drawer-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) mountPreviews();
    else releasePreviews();
  }

  button.addEventListener('click', () => {
    if (document.body.classList.contains('is-dragging')) return;
    setOpen(!open);
  });
  backdrop.addEventListener('click', () => setOpen(false));

  return {
    isOpen: () => open,
    close: () => setOpen(false),
  };
}
