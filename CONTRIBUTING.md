# Contributing

Widgets, themes, and site icons are ordinary files in this repository. Add a module, register it, and import that module once. The extension never loads widget code from the network or from a file the user picks.

Keep a new widget's span inside the home screen: **8 columns by 5 rows**. Shortcuts and folders are always 1×1.

Do not overwrite these `chrome.storage.local` keys used by the built-ins: `layout`, `weatherCache`, `calendarNotes`, and `focus`. A widget can use its own key for extra data.

## Add a widget

Create `src/widgets/example.js`:

```js
import { registerWidget } from './registry.js';

registerWidget({
  kind: 'example',
  name: 'Example',
  description: 'A short line for the drawer',
  span: { w: 2, h: 2 },
  mount(host) {
    host.textContent = 'Hello';
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
  },
});
```

Add one import to `src/widgets/index.js`:

```js
import './example.js';
```

`kind` is the value stored on the home screen (`{ type: 'widget', kind }`). `mount` fills the tile and may return a cleanup function. The drawer lists the widget after that import.

## Add a theme

Create a module that calls `registerTheme`, or add another call in `src/themes/builtins.js`:

```js
import { registerTheme } from './registry.js';

registerTheme({
  id: 'tide',
  name: 'Tide',
  group: 'gradient',
  tone: 'dark',
  background: 'linear-gradient(160deg, #0e2a36, #1f7a72)',
  dim: 0.2,
});
```

`group` is `color`, `gradient`, or `wallpaper`. `tone` is `dark` or `light` and controls the glass text. `background` is any CSS background value. Wallpaper images should be files in the extension, for example `url("themes/tide.svg")`, not a remote address. `dim` is the slider value selected when someone picks the theme.

If the theme lives in a new file, add one import to `src/themes/index.js`.

## Add an icon pack

Create `src/icon-packs/example.js`:

```js
import { registerIconPack } from './registry.js';

registerIconPack({
  id: 'example',
  name: 'Example',
  icons: [
    {
      id: 'example:notes',
      name: 'Notes',
      url: 'https://example.com',
      src: 'data:image/svg+xml,...',
    },
  ],
});
```

Add one import to `src/icon-packs/index.js`:

```js
import './example.js';
```

`url` has to be `http` or `https`. `src` is an image that ships with the extension (a data URL or a packaged file). The add-shortcut sheet lists every registered pack. A shortcut with no pack icon uses the site favicon.

## Try a change

Reload the extension on `chrome://extensions`, then open a new tab. No build step is required.
