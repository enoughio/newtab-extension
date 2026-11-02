const widgets = [];

export function registerWidget(widget) {
  if (!widget || typeof widget.kind !== 'string' || typeof widget.mount !== 'function') {
    throw new Error('registerWidget requires kind and mount');
  }
  if (!widget.span || !widget.span.w || !widget.span.h) {
    throw new Error(`Widget ${widget.kind} requires span { w, h }`);
  }
  if (widgets.some((entry) => entry.kind === widget.kind)) {
    console.warn(`Widget "${widget.kind}" is already registered`);
    return;
  }
  widgets.push({
    kind: widget.kind,
    name: widget.name || widget.kind,
    description: widget.description || '',
    span: {
      w: Math.max(1, widget.span.w | 0),
      h: Math.max(1, widget.span.h | 0),
    },
    mount: widget.mount,
  });
}

export function listWidgets() {
  return widgets.slice();
}

export function getWidget(kind) {
  return widgets.find((entry) => entry.kind === kind) || null;
}
