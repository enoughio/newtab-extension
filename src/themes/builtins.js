import { registerTheme } from './registry.js';

registerTheme({
  id: 'ink',
  name: 'Ink',
  group: 'color',
  tone: 'dark',
  background: '#10141a',
  dim: 0.12,
});

registerTheme({
  id: 'paper',
  name: 'Paper',
  group: 'color',
  tone: 'light',
  background: '#f3efe7',
  dim: 0.04,
});

registerTheme({
  id: 'lagoon',
  name: 'Lagoon',
  group: 'color',
  tone: 'dark',
  background: '#12352f',
  dim: 0.16,
});

registerTheme({
  id: 'dawn',
  name: 'Dawn',
  group: 'gradient',
  tone: 'dark',
  background: 'linear-gradient(160deg, #f3b183 0%, #d45d78 46%, #4c3d78 100%)',
  dim: 0.22,
});

registerTheme({
  id: 'aurora',
  name: 'Aurora',
  group: 'gradient',
  tone: 'dark',
  background: 'linear-gradient(150deg, #102033 0%, #1c6d68 48%, #b7e3d4 100%)',
  dim: 0.18,
});

registerTheme({
  id: 'ember',
  name: 'Ember',
  group: 'gradient',
  tone: 'dark',
  background: 'linear-gradient(160deg, #2b0d0a 0%, #c2410c 58%, #f5c16c 100%)',
  dim: 0.2,
});

registerTheme({
  id: 'harbor',
  name: 'Harbor',
  group: 'wallpaper',
  tone: 'dark',
  background: '#07141c center / cover no-repeat url("themes/harbor.svg")',
  dim: 0.3,
});

registerTheme({
  id: 'dune',
  name: 'Dune',
  group: 'wallpaper',
  tone: 'dark',
  background: '#3a2418 center / cover no-repeat url("themes/dune.svg")',
  dim: 0.22,
});

registerTheme({
  id: 'grove',
  name: 'Grove',
  group: 'wallpaper',
  tone: 'dark',
  background: '#102018 center / cover no-repeat url("themes/grove.svg")',
  dim: 0.28,
});
