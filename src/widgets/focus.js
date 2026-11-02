import { registerWidget } from './registry.js';
import { bindPress, icon } from './kit.js';

registerWidget({
  kind: 'focus',
  name: 'Focus',
  description: '25 minute focus, 5 minute break',
  span: { w: 4, h: 4 },
  mount(host) {
    const root = document.createElement('div');
    root.className = 'nx nx-ink nx-focus';
    const arrow = icon('chevron', 'nx-ico');
    const mins = document.createElement('div');
    mins.className = 'mins';
    mins.textContent = '25m';
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = 'FOCUS';
    root.append(arrow, mins, cap);
    host.append(root);

    let session = { phase: 'idle', endsAt: 0 };
    let nudged = false;

    function paint() {
      const running = session.phase === 'focus' || session.phase === 'break';
      cap.textContent = session.phase === 'break' ? 'BREAK' : 'FOCUS';
      cap.classList.toggle('is-break', session.phase === 'break');
      if (!running) {
        mins.textContent = '25m';
        root.setAttribute('aria-label', 'Start focus');
        return;
      }
      const remaining = Math.max(0, session.endsAt - Date.now());
      mins.textContent = `${Math.ceil(remaining / 60000)}m`;
      root.setAttribute('aria-label', session.phase === 'break' ? 'Stop break' : 'Stop focus');
      if (remaining <= 0 && !nudged) {
        nudged = true;
        chrome.runtime.sendMessage({ type: 'focus-catchup' }).catch(() => {});
      }
    }

    function apply(next) {
      const previous = session.phase;
      session = next && next.phase ? next : { phase: 'idle', endsAt: 0 };
      if (session.phase !== previous) nudged = false;
      paint();
    }

    const onChange = (changes, area) => {
      if (area === 'local' && changes.focus) apply(changes.focus.newValue);
    };

    bindPress(root, () => {
      const running = session.phase === 'focus' || session.phase === 'break';
      const type = running ? 'focus-stop' : 'focus-start';
      chrome.runtime.sendMessage({ type }).catch((error) => console.error(error));
    });

    chrome.storage.local.get('focus').then((data) => apply(data.focus)).catch((error) => console.error(error));
    chrome.storage.onChanged.addListener(onChange);
    const timer = setInterval(paint, 1000);

    return () => {
      clearInterval(timer);
      chrome.storage.onChanged.removeListener(onChange);
    };
  },
});
