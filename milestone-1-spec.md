# Theme Studio — Milestone 1 Spec (User-level, no root)
For handoff to Codex / Antigravity. Build ONLY this file's scope first —
do not touch Milestone 2 (GDM/lock-screen) until this is fully working.

Stack: Electron (contextIsolation on, nodeIntegration off), plain
HTML/CSS/JS renderer, Node built-ins (`fs`, `path`, `os`, `child_process`),
`adm-zip` (zip), `tar` (for `.tar.xz` cursor releases), built-in `fetch`
for downloads.

---

## 1. Project structure (Milestone 1 files only)

```
themestudio/
├── package.json
├── main/
│   ├── main.js                    # app bootstrap, BrowserWindow, wires ipc/*.js
│   ├── preload.js                 # contextBridge — only surface renderer can call
│   ├── ipc/
│   │   ├── catalog.ipc.js         # catalog:list, catalog:refresh
│   │   ├── installer.ipc.js       # install:start, install:cancel (+ install:progress event)
│   │   ├── system.ipc.js          # apply:*, reset:default
│   │   └── uninstall.ipc.js       # uninstall:list, uninstall:remove
│   ├── lib/
│   │   ├── paths.js               # §3 below
│   │   ├── catalog.js             # loads sources/*.json, merges installed state
│   │   ├── downloader.js          # fetchZip(), fetchTarXz(), gitClone(), progress callbacks
│   │   ├── installer.js           # orchestrator: zip-static vs script strategy
│   │   ├── dependency-checker.js  # which-check + pkexec apt install
│   │   ├── state-store.js         # installed.json read/write
│   │   ├── fixes/
│   │   │   ├── gtk4-libadwaita.js
│   │   │   └── flatpak-override.js
│   │   └── gnome.js                # gsettings / gnome-extensions CLI wrappers
├── renderer/
│   ├── index.html
│   ├── style.css
│   ├── renderer.js
│   ├── views/
│   │   ├── looks.view.js
│   │   ├── themes.view.js
│   │   ├── icons.view.js
│   │   ├── cursors.view.js
│   │   ├── wallpapers.view.js
│   │   ├── extensions.view.js
│   │   ├── uninstall.view.js
│   │   └── settings.view.js        # flatpak fix toggle
│   ├── components/
│   │   ├── card.js
│   │   ├── variant-picker.js       # color + light/dark dropdowns
│   │   ├── progress-bar.js
│   │   ├── toast.js
│   │   └── confirm-dialog.js
│   └── assets/icons/
├── sources/
│   ├── themes.json                 # provided — 10 starter entries
│   ├── icons.json                  # provided — 6 starter entries
│   ├── cursors.json                # provided — 5 starter entries
│   ├── wallpapers.json             # empty starter, you fill in
│   └── looks.json                  # empty starter, you fill in
└── README.md
```

---

## 2. Sidebar / screens (Milestone 1 scope)

```
Looks | Themes | Icons | Cursors | Wallpapers | Extensions
------------------------------------------------------------------
Reset to Ubuntu Default   (bottom, pinned)
Uninstall Manager         (bottom, pinned)
```
(Lock Screen tab does not exist yet in this build — added in Milestone 2.)

Themes / Icons / Cursors / Wallpapers each have two sub-tabs:
**`Installed`** and **`Browse`**.

---

## 3. `main/lib/paths.js`

```js
GTK_THEMES     = ~/.themes
ICON_THEMES    = ~/.icons
GTK4_CONFIG    = ~/.config/gtk-4.0
EXTENSIONS_DIR = ~/.local/share/gnome-shell/extensions
DOWNLOAD_CACHE = ~/.cache/themestudio/downloads
STATE_FILE     = app.getPath('userData') + /installed.json
```

---

## 4. Catalog schema

See `sources/themes.json`, `sources/icons.json`, `sources/cursors.json` in
this handoff for real, ready-to-use starter entries. Format recap:

```jsonc
{
  "id": "orchis",
  "name": "Orchis",
  "category": "gtk-theme",            // gtk-theme | icon-theme | cursor-theme | wallpaper
  "thumbnail": "https://...",
  "author": "...",
  "source_url": "https://github.com/...",
  "license": "GPL-3.0",
  "install_type": "script",           // "zip-static" | "script"
  "source": { "type": "git", "repo": "https://github.com/....git" },
  "variants": { "color": [...], "mode": ["light","dark"] },  // omit for zip-static
  "install_args_template": "-t {color} -c {mode} -l",
  "dependencies": ["sassc"],
  "target_dir": "~/.themes",
  "gtk4_fix": true,
  "gdm_eligible": true                 // read but unused until Milestone 2
}
```

`wallpapers.json` entries are simpler (no install_type needed if they're
just images):
```jsonc
{ "id": "tokyo-night-wallpaper", "name": "Tokyo Night", "thumbnail": "...", "image_url": "https://..." }
```

`looks.json` references other catalog IDs — leave empty (`[]`) until Themes/
Icons/Cursors/Wallpapers browsing works end to end; fill in once you've
picked which combos you want as presets.

---

## 5. Fixes (Milestone 1 scope)

### 5.1 `fixes/gtk4-libadwaita.js`
Some themes' own install scripts already accept a `-l` / `--libadwaita` flag
that does this for you (Orchis, WhiteSur, Colloid, Graphite all do — see the
`install_args_template` values already including `-l` in the provided
`themes.json`). For those, **skip this fixer** — running it again is
harmless but redundant.

For themes that *don't* ship that flag (zip-static ones like Nordic,
Everforest, Gruvbox, Tokyo Night, Rose Pine), run this manually after
install, only if `gtk_fix: true` and the theme folder contains `gtk-4.0/`:
1. Remove existing symlinks/files at `~/.config/gtk-4.0/{gtk.css,gtk-dark.css,assets}`
2. Symlink them to `<themeDir>/gtk-4.0/{gtk.css,gtk-dark.css,assets}`
3. If `<themeDir>/gtk-4.0/` doesn't exist, skip silently

### 5.2 `fixes/flatpak-override.js`
Settings screen toggle. On enable, runs:
```
flatpak override --user --filesystem=xdg-config/gtk-3.0
flatpak override --user --filesystem=xdg-config/gtk-4.0
```
`--user` avoids needing root. Store the flag in state-store so it's not
re-run every launch.

### 5.3 `dependency-checker.js`
- `checkBinaries(list)` → `which <bin>` for each → returns missing[]
- If non-empty, `confirm-dialog` shows exact package names → on confirm:
  `pkexec apt-get install -y <names>`
- Triggered only for items with a non-empty `dependencies` array (see
  `catppuccin-gtk` and `capitaine-cursors` in the provided catalogs for
  examples that need this)

---

## 6. IPC contract (Milestone 1)

| Channel | Direction | Payload | Returns |
|---|---|---|---|
| `catalog:list` | invoke | `{ category }` | items + `installed: bool` |
| `install:start` | invoke | `{ id, category, variant? }` | starts install; progress via event |
| `install:progress` | event | `{ id, percent, stage }` | — |
| `install:cancel` | invoke | `{ id }` | ok |
| `apply:gtk` / `apply:icons` / `apply:cursors` / `apply:wallpaper` | invoke | name/path | ok |
| `apply:look` | invoke | `{ lookId }` | applies gtk+icon+cursor+wallpaper in sequence |
| `reset:default` | invoke | — | ok |
| `uninstall:list` | invoke | — | installed.json contents |
| `uninstall:remove` | invoke | `{ id }` | removes files/symlinks, updates state |
| `deps:check` | invoke | `{ list }` | `{ missing: [] }` |
| `deps:install` | invoke | `{ list }` | pkexec result |

---

## 7. Where the data comes from

Direct from GitHub — no CDN for the assets themselves:
- **zip-static**: repo archive ZIP (`.../archive/refs/heads/main.zip`) or a
  release asset (Bibata ships `.tar.xz` per variant — `downloader.js` needs
  both a zip and a tar.xz extraction path)
- **script**: `git clone --depth 1 <repo>`, then run the theme's own
  `install.sh` with `install_args_template` substituted

Thumbnails: host in a small public GitHub repo (e.g. `themestudio-assets`)
and hotlink via jsDelivr: `https://cdn.jsdelivr.net/gh/<you>/themestudio-assets/<file>.png`
— the provided catalog JSONs use `<you>` as a placeholder, replace with your
actual GitHub username/repo before shipping.

**You maintain `sources/*.json` by hand** — no in-app catalog editor in
Milestone 1. `wallpapers.json` and `looks.json` are intentionally left for
you to fill in once you've chosen sources.

---

## 8. Uninstall correctness

`uninstall:remove`:
1. If the item is currently applied for its category → switch that category
   back to Ubuntu default first.
2. Reverse any symlinks `gtk4-libadwaita.js` created for it.
3. `rm -rf` the folder under `target_dir`.
4. Remove from `installed.json`.

---

## 9. Build order — Phases

### Phase 1 — Foundation
- `paths.js`, `state-store.js`
- `catalog.js` + `catalog.ipc.js`, load the **provided** `themes.json` /
  `icons.json` / `cursors.json`
- Browse grid renders real cards end to end (no download logic yet — clicking
  just logs the item)

### Phase 2 — zip-static installs
- `downloader.js`: `fetchZip()` + extraction, progress events
- `installer.js`: zip-static strategy only
- Wire up: Nordic, Everforest, Gruvbox, Tokyo Night, Rose Pine (themes),
  Papirus, BeautyLine (icons), all 5 cursors — these are all zip-static,
  good for testing the pipeline without script complexity
- `fixes/gtk4-libadwaita.js` runs after zip-static theme installs

### Phase 3 — script installs + variant picker
- `installer.js`: script strategy (`gitClone` + arg substitution + run)
- `variant-picker.js` UI component (color + mode dropdowns)
- Wire up: Orchis, WhiteSur, Colloid, Graphite, Tela, Qogir, Fluent,
  Colloid-icons
- `dependency-checker.js` + confirm-dialog, tested against `catppuccin-gtk`
  (needs python3/sassc) and `capitaine-cursors` (needs inkscape)

### Phase 4 — Uninstall + state polish
- `uninstall.view.js` + `uninstall.ipc.js`
- "Installed" badge on cards reflecting `installed.json`
- Re-download avoidance via `DOWNLOAD_CACHE`

### Phase 5 — Looks + settings
- Fill `wallpapers.json` and `looks.json` with real entries
- `looks.view.js` + `apply:look` orchestration (sequential apply with
  per-step progress)
- `settings.view.js` with the Flatpak override toggle

**Exit criteria for Milestone 1**: user can browse every category, download
and apply any catalog item (including variant selection + dependency
prompts), apply a Look, uninstall anything, and reset to Ubuntu defaults —
all without ever being asked for a root password.
