# Theme Studio — Milestone 2 Spec (GDM / Lock Screen, root required)
Start this ONLY after Milestone 1's exit criteria are met. This milestone
adds a new sidebar tab and touches system directories, so test it on a VM
snapshot first — mistakes here can affect the login screen for all users.

---

## 1. New/changed files (added on top of Milestone 1's tree)

```
themestudio/
├── main/
│   ├── ipc/
│   │   └── gdm.ipc.js              # gdm:copyAsset, gdm:enableExtension
│   ├── lib/
│   │   ├── paths.js                # EXTENDED — add system dir constants (§2)
│   │   ├── fixes/
│   │   │   └── gdm-assets.js       # copy to /usr/share/*, logo rename
│   │   └── gdm.js                  # pkexec wrapper, gdm-user extension enable
├── renderer/
│   └── views/
│       └── lockscreen.view.js      # NEW sidebar tab
```

---

## 2. `paths.js` additions

```js
SYS_THEMES      = /usr/share/themes
SYS_ICONS       = /usr/share/icons
SYS_BACKGROUNDS = /usr/share/backgrounds
SYS_FONTS       = /usr/share/fonts
SYS_PIXMAPS     = /usr/share/pixmaps   # GDM logo, filename MUST contain "logo"
```

These map to what the GSE-GDM (GNOME Shell login-screen) extension actually
scans:
```
backgrounds  -> /usr/local/share/backgrounds, /usr/share/backgrounds
fonts        -> /usr/local/share/fonts, /usr/share/fonts
icon-themes  -> /usr/local/share/icons, /usr/share/icons
shell-themes -> /usr/local/share/themes, /usr/share/themes
logos        -> /usr/local/share/pixmaps, /usr/share/pixmaps  (filename must contain "logo")
```

---

## 3. `fixes/gdm-assets.js`

`copyToSystemDir(assetPath, category)`:
1. `pkexec cp -r "<assetPath>" "/usr/share/<mapped-folder>/"`
2. If `category === "logo"`: after copy, if the destination filename doesn't
   contain the substring `logo`, rename it so it does (e.g.
   `my-icon.png` → `my-icon-logo.png`).
3. Return success/failure to the renderer — surface any `pkexec` cancellation
   (user closed the password prompt) as a clean "cancelled" state, not an
   error toast.

Only items with `"gdm_eligible": true` in their catalog entry show the
"Also use for lock screen" action in the UI (already flagged on every
Milestone-1 catalog entry provided).

---

## 4. `gdm.js` — enabling theming for the login screen

GDM runs its own session as the `gdm` system user, with its own dconf
profile — separate from your logged-in user. Two things need to happen:

1. **GSE-GDM extension itself** must be enabled for the `gdm` user's shell
   session:
   ```
   pkexec sudo -u gdm dbus-run-session gnome-extensions enable <gse-gdm-uuid>
   ```
2. **The shell theme you want GDM to use** must also be enabled for that
   same `gdm` session (the User Themes extension, enabled the same way, then
   its `name` key set via that session's dconf, not the logged-in user's).

Wrap both steps behind a single "Enable login-screen customization" button
in `lockscreen.view.js` — do them once, not per-asset.

---

## 5. IPC contract additions

| Channel | Direction | Payload | Returns |
|---|---|---|---|
| `gdm:copyAsset` | invoke | `{ id, category }` | pkexec result, or `{ cancelled: true }` |
| `gdm:enableExtension` | invoke | `{ uuid }` | pkexec result |
| `gdm:status` | invoke | — | `{ gseGdmInstalled: bool, gseGdmEnabled: bool }` — used to show setup prompts if the extension itself isn't installed yet |

---

## 6. `lockscreen.view.js` — UI requirements

- Clear one-line banner at the top: **"Changes here apply to the login/lock
  screen and require your admin password."**
- Sub-sections mirroring what GSE-GDM reads: Background, Shell theme, Icon
  theme, Font, Logo
- Each section reuses the same `card.js` component as other tabs, but cards
  here are filtered to `gdm_eligible: true` catalog items already installed
  in Milestone 1 (don't re-download — just re-copy the already-downloaded
  folder into the system dir)
- If `gdm:status` reports the GSE-GDM extension isn't installed, show a
  one-time setup card explaining it needs to be installed first, with a link
  to its source (you'll need to decide whether Theme Studio installs it
  automatically via `pkexec` copy into
  `/usr/share/gnome-shell/extensions/` or asks the user to install it via
  `gnome-extensions.org` — pick one and document it here once decided)

---

## 7. Build order — Phases

### Phase 1 — System copy mechanism
- `paths.js` system constants
- `fixes/gdm-assets.js` — copy + logo rename, tested manually against one
  wallpaper and one icon theme first (lowest risk)
- `gdm.ipc.js` wired to a temporary debug button (no full UI yet)

### Phase 2 — GDM session enablement
- `gdm.js` — the two-step `sudo -u gdm dbus-run-session` enable flow
- `gdm:status` check
- Manual test: enable, log out, confirm the login screen actually shows the
  applied shell theme/background

### Phase 3 — Lock Screen tab UI
- `lockscreen.view.js` full build: sections, cards, banner, setup-prompt
  card
- Wire "Also use for lock screen" action onto existing Themes/Icons/
  Wallpapers cards (only shown when `gdm_eligible: true`)
- Error handling: pkexec cancellation, missing GSE-GDM extension, permission
  failures — all need distinct, calm messages (not raw stderr dumped to the
  user)

### Phase 4 — Safety pass
- Test on a disposable VM/snapshot: apply a broken/incompatible shell theme
  to GDM and confirm there's a documented recovery path (e.g. a "Reset lock
  screen to default" action that reverses the dconf/system-dir changes)
- Document that recovery path in `README.md` before considering Milestone 2
  done

**Exit criteria for Milestone 2**: user can pick an already-installed theme/
icon/wallpaper/font/logo and apply it to the GDM login screen with a single
password prompt per action, see a clear "requires admin" indicator up front,
and has a documented way to undo it if the login screen breaks.
