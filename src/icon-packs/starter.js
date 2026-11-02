import { registerIconPack } from './registry.js';

function mark(background, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${background}"/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const lens = '<circle cx="28" cy="28" r="12" fill="none" stroke="#fff" stroke-width="4"/><path d="M37 37 L48 48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>';
const play = '<path d="M26 18h16a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z" fill="#fff"/><path d="M30 26l12 6-12 6z" fill="#e11d2e"/>';
const branch = '<circle cx="20" cy="44" r="5" fill="#fff"/><circle cx="44" cy="20" r="5" fill="#fff"/><circle cx="44" cy="46" r="5" fill="#fff"/><path d="M20 44V30a8 8 0 0 1 8-8h16M20 44h19" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>';
const mail = '<rect x="12" y="18" width="40" height="28" rx="4" fill="none" stroke="#fff" stroke-width="3"/><path d="M14 22 L32 34 L50 22" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>';
const pin = '<path fill="#fff" d="M32 8c-9 0-16 7.2-16 16 0 12.2 16 32 16 32s16-19.8 16-32c0-8.8-7-16-16-16zm0 22a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/>';
const globe = '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="3"/><ellipse cx="32" cy="32" rx="7" ry="16" fill="none" stroke="#fff" stroke-width="3"/><path d="M16 32h32M19 24h26M19 40h26" stroke="#fff" stroke-width="2" fill="none"/>';
const bubble = '<circle cx="32" cy="36" r="16" fill="#fff"/><circle cx="26" cy="34" r="2.2" fill="#1a1a1a"/><circle cx="38" cy="34" r="2.2" fill="#1a1a1a"/><path d="M26 41c2.2 2.4 9.8 2.4 12 0" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="48" cy="16" r="5" fill="#fff"/>';
const box = '<path d="M14 26 32 16l18 10v18L32 54 14 44Z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M14 26l18 10 18-10M32 36v18" fill="none" stroke="#fff" stroke-width="3"/>';
const note = '<circle cx="24" cy="46" r="6" fill="#fff"/><path d="M30 46V20l16-4v14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="36" r="6" fill="#fff"/>';
const letterN = '<path fill="#fff" d="M18 14h8l12 22V14h8v36h-8L26 28v22h-8V14z"/>';

registerIconPack({
  id: 'starter',
  name: 'Starter',
  icons: [
    { id: 'starter:google', name: 'Google', url: 'https://www.google.com', src: mark('#1a73e8', lens) },
    { id: 'starter:youtube', name: 'YouTube', url: 'https://www.youtube.com', src: mark('#e11d2e', play) },
    { id: 'starter:github', name: 'GitHub', url: 'https://github.com', src: mark('#24292f', branch) },
    { id: 'starter:gmail', name: 'Gmail', url: 'https://mail.google.com', src: mark('#c5221f', mail) },
    { id: 'starter:maps', name: 'Maps', url: 'https://maps.google.com', src: mark('#1a9f4b', pin) },
    { id: 'starter:wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org', src: mark('#5c5c5c', globe) },
    { id: 'starter:reddit', name: 'Reddit', url: 'https://www.reddit.com', src: mark('#ff4500', bubble) },
    { id: 'starter:amazon', name: 'Amazon', url: 'https://www.amazon.com', src: mark('#232f3e', box) },
    { id: 'starter:spotify', name: 'Spotify', url: 'https://open.spotify.com', src: mark('#1db954', note) },
    { id: 'starter:netflix', name: 'Netflix', url: 'https://www.netflix.com', src: mark('#e50914', letterN) },
  ],
});
