import { registerWidget } from './registry.js';

registerWidget({
  kind: 'search',
  name: 'Search',
  description: 'Search Google',
  span: { w: 12, h: 1 },
  mount(host) {
    host.innerHTML = `
      <form class="search-widget" role="search">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"></circle>
          <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        <input type="search" name="q" placeholder="Search Google" aria-label="Search Google" autocomplete="off" spellcheck="false">
      </form>`;
    const form = host.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = new FormData(form).get('q');
      const text = String(query || '').trim();
      if (!text) return;
      location.href = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    });
    return () => {};
  },
});
