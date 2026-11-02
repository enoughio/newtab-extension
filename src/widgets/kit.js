const STATE_KEY = 'nxState';

let memory = null;
let chain = Promise.resolve();

function remember(next) {
  memory = next;
  return next;
}

export function loadNx() {
  chain = chain.then(async () => {
    if (memory) return memory;
    try {
      const data = await chrome.storage.local.get(STATE_KEY);
      const stored = data[STATE_KEY];
      return remember(stored && typeof stored === 'object' ? { ...stored } : {});
    } catch (error) {
      console.error(error);
      return remember({});
    }
  });
  return chain;
}

export function patchNx(patch) {
  chain = chain.then(async () => {
    let base = memory;
    if (!base) {
      try {
        const data = await chrome.storage.local.get(STATE_KEY);
        base = data[STATE_KEY] && typeof data[STATE_KEY] === 'object' ? data[STATE_KEY] : {};
      } catch (error) {
        console.error(error);
        base = {};
      }
    }
    const update = typeof patch === 'function' ? patch(base) : patch;
    const next = { ...base, ...update };
    try {
      await chrome.storage.local.set({ [STATE_KEY]: next });
    } catch (error) {
      console.error(error);
    }
    return remember(next);
  });
  return chain;
}

export function onNx(handler) {
  if (!globalThis.chrome?.storage?.onChanged) return () => {};
  const listener = (changes, area) => {
    if (area !== 'local' || !changes[STATE_KEY]) return;
    const next = changes[STATE_KEY].newValue;
    memory = next && typeof next === 'object' ? { ...next } : {};
    handler(memory);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function everySecond(fn) {
  fn();
  const timer = setInterval(fn, 1000);
  return () => clearInterval(timer);
}

export function bindPress(node, onClick) {
  node.tabIndex = 0;
  node.setAttribute('role', 'button');
  node.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('button, input, textarea, a')) return;
    onClick();
  });
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onClick();
  });
  return node;
}

export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }),
      () => reject(new Error('Location is blocked')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

export function formatGMT(date = new Date()) {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (!mins) return `GMT${sign}${hours}`;
  return `GMT${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

const ICONS = {
  up: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 19V6M7 10l5-5 5 5"/>',
  down: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 5v13M7 14l5 5 5-5"/>',
  wifi: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4.5 10.2a11 11 0 0 1 15 0"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M7.4 13.6a6.4 6.4 0 0 1 9.2 0"/><circle cx="12" cy="17.6" r="1.35" fill="currentColor"/>',
  bluetooth: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" d="M7 7.2 17 16.8 12 21V3l5 4.2L7 16.8"/>',
  plane: '<path fill="currentColor" d="M21 12 3.2 5.8l2.1 4.7L3.2 16.2 21 12Zm-8.6.9 2.8-.9-2.8-.9-.7-3.2 1.3 4.1-1.3 4.1.7-3.2Z"/>',
  signal: '<path fill="currentColor" d="M4 18h2.2v-3H4v3Zm4.3 0h2.2v-6H8.3v6Zm4.3 0h2.2V8h-2.2v10Zm4.3 0H19V5h-2.1v13Z"/>',
  hotspot: '<circle cx="12" cy="14" r="1.5" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8.5 11.2a5 5 0 0 1 7 0M6 8.6a8.5 8.5 0 0 1 12 0"/>',
  moon: '<path fill="currentColor" d="M14.5 3.2a7.2 7.2 0 1 0 6.3 10.6A8 8 0 0 1 14.5 3.2Z"/>',
  bed: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" d="M4 18V12.2A2.8 2.8 0 0 1 6.8 9.4H13V8a2 2 0 0 1 2-2h4.2A1.8 1.8 0 0 1 21 7.8V18"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 15h17M4 18h17"/><circle cx="8.2" cy="12.2" r="1.1" fill="currentColor"/>',
  battery: '<rect x="3" y="7" width="16" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="currentColor" d="M20 10h1.2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H20v-4Z"/><rect x="5.2" y="9.2" width="8" height="5.6" rx="1" fill="currentColor"/>',
  nfc: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 8.2c3.6 2 3.6 5.6 0 7.6"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 5.6c5.4 2.8 5.4 10 0 12.8"/><circle cx="6.2" cy="12" r="1.25" fill="currentColor"/>',
  pin: '<path fill="currentColor" fill-rule="evenodd" d="M12 21.2s6.5-6.1 6.5-10.7a6.5 6.5 0 1 0-13 0c0 4.6 6.5 10.7 6.5 10.7Zm0-8.2a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"/>',
  mic: '<rect x="9" y="3" width="6" height="10" rx="3" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6.5 11.2a5.5 5.5 0 0 0 11 0M12 16.8V21"/>',
  dot: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
  dim: '<circle cx="12" cy="12" r="3" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 4.5v1.8M12 17.7v1.8M4.5 12h1.8M17.7 12h1.8M6.4 6.4l1.2 1.2M16.4 16.4l1.2 1.2M17.6 6.4l-1.2 1.2M7.6 16.4l-1.2 1.2"/>',
  share: '<circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="17" cy="6.5" r="2" fill="currentColor"/><circle cx="17" cy="17.5" r="2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M8 11.2 15 7.6M8 12.8l7 3.6"/>',
  lock: '<rect x="5" y="10" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 10V8a4 4 0 0 1 8 0v2"/>',
  rotate: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M19.5 12a7.5 7.5 0 1 1-2.1-5.2"/><path fill="currentColor" d="M19.6 3.6v5h-5l1.7-1.6 3.3-3.4Z"/>',
  saver: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 4v9M8.5 10.5 12 14l3.5-3.5"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5 16.5h14V20H5v-3.5Z"/>',
  hand: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 13.5V6.2"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8.2 14.2a6.2 6.2 0 0 0 7.6 0M5.6 12.4a9 9 0 0 0 12.8 0"/>',
  volume: '<path fill="currentColor" d="M4 10h3.2L11 7v10l-3.8-3H4v-4Z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M15.2 9.2a4 4 0 0 1 0 5.6M17.6 7a7 7 0 0 1 0 10"/>',
  flash: '<path fill="currentColor" d="M9 3h6l-1.4 6H18l-8 12 1.5-7H7l2-11Z"/>',
  sun: '<circle cx="12" cy="12" r="3.1" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2M6.1 6.1l1.4 1.4M16.5 16.5l1.4 1.4M17.9 6.1l-1.4 1.4M7.5 16.5l-1.4 1.4"/>',
  cloud: '<path fill="currentColor" d="M7.2 17.4h9.6a3.4 3.4 0 0 0 .4-6.8 4.8 4.8 0 0 0-9.2-1.3 3.3 3.3 0 0 0-.8 8.1Z"/>',
  rain: '<path fill="currentColor" d="M7 14.2h9.2a3 3 0 0 0 .4-6 4.3 4.3 0 0 0-8.2-1 3 3 0 0 0-1.4 7Z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M8 17.2 6.8 19.4M12 17.2 10.8 19.4M16 17.2 14.8 19.4"/>',
  snow: '<path fill="currentColor" d="M7 13.6h9.2a3 3 0 0 0 .4-6 4.3 4.3 0 0 0-8.2-1 3 3 0 0 0-1.4 7Z"/><path fill="currentColor" d="M8 16.4h1.4v1.4H8zM12 17.6h1.4V19H12zM15.2 16.2H16.6v1.4h-1.4z"/>',
  fog: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5 9.5h14M4 13h16M6 16.5h12"/>',
  storm: '<path fill="currentColor" d="M7 13.2h8.6a2.8 2.8 0 0 0 .3-5.6 4 4 0 0 0-7.6-.9 2.8 2.8 0 0 0-1.3 6.5Z"/><path fill="currentColor" d="M11 13.2h2.4l-1.6 3.2H14L10.2 21l1.2-4H9.2l1.8-3.8Z"/>',
  note: '<path fill="currentColor" d="M9 17.6a2.3 2.3 0 1 1-1.5-2.16V6.2L19 4v8.8a2.3 2.3 0 1 1-1.5-2.16V6.7L9 8.2v9.4Z"/>',
  play: '<path fill="currentColor" d="M8 5.2v13.6L19 12 8 5.2Z"/>',
  pause: '<path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
  chevron: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 14.2 12 8l6 6.2"/>',
  target: '<circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  camera: '<path fill="currentColor" fill-rule="evenodd" d="M9.2 5h5.6l1.5 2.5H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2h2.7L9.2 5Zm2.8 11.1a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z"/>',
  home: '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M4 11.2 12 4l8 7.2V20H4v-8.8Z"/><path fill="none" stroke="currentColor" stroke-width="1.8" d="M10 20v-6h4v6"/>',
  remote: '<rect x="8" y="3" width="8" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/><circle cx="10.2" cy="11.2" r="0.9" fill="currentColor"/><circle cx="13.8" cy="11.2" r="0.9" fill="currentColor"/><circle cx="12" cy="14.6" r="0.9" fill="currentColor"/>',
};

export function icon(name, className = 'nx-ico') {
  const span = document.createElement('span');
  span.className = className;
  span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.dot}</svg>`;
  return span;
}

export function formatClock(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMonthDay(date = new Date()) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
