# Widget Drawer Home

An open-source Chrome new-tab home screen. Shortcuts, folders, and widgets sit on a fixed 8×5 grid. A side drawer lists every widget that ships with the extension. Drag one onto the grid and the other icons slide apart to make room.

Themes, widgets, and site icons are added in the repository. The extension does not upload, import, or run code from outside the package.

## Load unpacked

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this folder (the one that contains `manifest.json`).
4. Open a new tab.

## Using the home screen

- **Widgets** opens the drawer. Drag a card onto the grid. The drawer stays open while you drag.
- If the widget fits, icons slide out of the way and a ghost marks its rectangle. Drop to keep it.
- If it does not fit, nothing moves. A red circle-slash follows the pointer, and dropping does nothing.
- **+** adds a shortcut or a folder. Widgets are added only by dragging them from the drawer.
- The **gear** picks a contributed theme and a dim amount. There is no photo upload.
- Shortcuts and folders live on the home grid. Drag a shortcut onto a folder icon to nest it.
- Opening a folder scales a glass panel up from that icon. If your system asks for reduced motion, the panel opens without the animation.
- Hover a tile and use **×** to remove it.

The first launch places a clock and a search widget on the Harbor wallpaper and shows a short hint. Nothing else is filled in.

## Built-in widgets

| Widget | What it does |
| --- | --- |
| Clock | Local time and date |
| Weather | Forecast from Open-Meteo (no API key), with a city search if location is unavailable |
| Search | Google search |
| Daily quote | A line chosen from a local list by date |
| Focus timer | 25 minutes of focus and a 5 minute break, kept by `chrome.alarms` if the tab closes |
| Calendar | The current month, with notes stored on this device |

Shortcut addresses have to be `http` or `https`. A pack icon is used when you pick one; otherwise the shortcut uses that site's favicon.

## Project layout

- `manifest.json` — Manifest V3 new-tab override
- `src/newtab.html`, `src/styles.css`, `src/app.js` — home screen
- `src/grid.js` — 8×5 packer
- `src/drawer.js`, `src/customize.js`, `src/add-sheet.js`, `src/store.js`
- `src/widgets/`, `src/themes/`, `src/icon-packs/` — contributor registries
- `src/sw.js` — focus-timer alarm and notification
- `icons/` — toolbar icons

There is no build step. Chrome loads these files directly.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the three recipes: a widget, a theme, and an icon pack. Each one is a file in the repo plus a single import.

## License

[MIT](LICENSE)
