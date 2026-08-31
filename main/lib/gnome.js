const { execFile, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function execGsettings(args) {
  return new Promise((resolve) => {
    execFile('gsettings', args, (err, stdout, stderr) => {
      if (err) {
        console.error(`[GNOME gsettings] Failed: gsettings ${args.join(' ')}:`, stderr || err.message);
        return resolve({ success: false, error: stderr || err.message, value: '' });
      }
      const val = stdout.trim().replace(/^'|'$/g, '');
      resolve({ success: true, value: val });
    });
  });
}

function execGnomeExtensions(args) {
  return new Promise((resolve) => {
    execFile('gnome-extensions', args, (err, stdout, stderr) => {
      if (err) {
        console.error(`[GNOME extensions] Failed: gnome-extensions ${args.join(' ')}:`, stderr || err.message);
        return resolve({ success: false, error: stderr || err.message, stdout: '' });
      }
      resolve({ success: true, stdout: stdout.trim() });
    });
  });
}

/**
 * Gets currently active desktop themes
 */
async function getCurrentSettings() {
  const gtk = await execGsettings(['get', 'org.gnome.desktop.interface', 'gtk-theme']);
  const icons = await execGsettings(['get', 'org.gnome.desktop.interface', 'icon-theme']);
  const cursors = await execGsettings(['get', 'org.gnome.desktop.interface', 'cursor-theme']);
  const colorScheme = await execGsettings(['get', 'org.gnome.desktop.interface', 'color-scheme']);
  const pictureUri = await execGsettings(['get', 'org.gnome.desktop.background', 'picture-uri']);
  const pictureUriDark = await execGsettings(['get', 'org.gnome.desktop.background', 'picture-uri-dark']);
  let shellTheme = { value: '' };
  try {
    shellTheme = await execGsettings(['get', 'org.gnome.shell.extensions.user-theme', 'name']);
  } catch (_) {}

  return {
    gtk: gtk.value || 'Yaru',
    shell: shellTheme.value || '',
    icons: icons.value || 'Yaru',
    cursors: cursors.value || 'Yaru',
    colorScheme: colorScheme.value || 'default',
    wallpaper: pictureUri.value || pictureUriDark.value || ''
  };
}

/**
 * Applies a GTK theme
 * @param {string} themeName
 */
async function setGtkTheme(themeName) {
  return execGsettings(['set', 'org.gnome.desktop.interface', 'gtk-theme', themeName]);
}

/**
 * Applies an Icon theme
 * @param {string} iconName
 */
async function setIconTheme(iconName) {
  return execGsettings(['set', 'org.gnome.desktop.interface', 'icon-theme', iconName]);
}

/**
 * Applies a Cursor theme across GNOME, X11 fallback and GTK settings
 * @param {string} cursorName
 */
async function setCursorTheme(cursorName) {
  const name = cursorName || 'Yaru';
  const res = await execGsettings(['set', 'org.gnome.desktop.interface', 'cursor-theme', name]);

  // Sync ~/.icons/default/index.theme for X11 / Wayland desktop compatibility
  try {
    const defaultIconDir = path.join(HOME, '.icons', 'default');
    if (!fs.existsSync(defaultIconDir)) fs.mkdirSync(defaultIconDir, { recursive: true });
    fs.writeFileSync(
      path.join(defaultIconDir, 'index.theme'),
      `[Icon Theme]\nName=Default\nComment=Default Cursor Theme\nInherits=${name}\n`
    );
  } catch (_) {}

  // Sync ~/.config/gtk-3.0/settings.ini
  try {
    const gtk3Dir = path.join(HOME, '.config', 'gtk-3.0');
    if (fs.existsSync(gtk3Dir)) {
      const iniPath = path.join(gtk3Dir, 'settings.ini');
      let content = fs.existsSync(iniPath) ? fs.readFileSync(iniPath, 'utf8') : '[Settings]\n';
      if (content.includes('gtk-cursor-theme-name')) {
        content = content.replace(/gtk-cursor-theme-name\s*=.*/g, `gtk-cursor-theme-name = ${name}`);
      } else {
        content += `\ngtk-cursor-theme-name = ${name}\n`;
      }
      fs.writeFileSync(iniPath, content);
    }
  } catch (_) {}

  return res;
}

/**
 * Applies a GNOME Shell theme
 * @param {string} shellThemeName
 */
async function setShellTheme(shellThemeName) {
  try {
    await execGnomeExtensions(['enable', 'user-theme@gnome-shell-extensions.gcampax.github.com']);
  } catch (_) {}
  return execGsettings(['set', 'org.gnome.shell.extensions.user-theme', 'name', shellThemeName]);
}

/**
 * Applies a wallpaper image path with automatic copy to ~/.local/share/backgrounds/ and picture-options
 * @param {string} wallpaperPath
 */
async function setWallpaper(wallpaperPath) {
  if (!wallpaperPath) return { success: false, error: 'No wallpaper path provided' };

  try {
    let cleanPath = wallpaperPath;
    if (cleanPath.startsWith('file://')) {
      cleanPath = decodeURIComponent(cleanPath.replace('file://', ''));
    }

    // Resolve candidates
    const searchCandidates = [
      cleanPath,
      path.resolve(__dirname, '../../renderer', cleanPath),
      path.resolve(__dirname, '../renderer', cleanPath),
      path.resolve(__dirname, '../../', cleanPath),
      path.resolve(__dirname, '../', cleanPath),
      path.resolve(__dirname, '../../Wallpapers', path.basename(cleanPath)),
      path.resolve(__dirname, '../Wallpapers', path.basename(cleanPath)),
      path.resolve(process.cwd(), cleanPath),
      path.resolve(process.cwd(), 'Wallpapers', path.basename(cleanPath))
    ];

    let foundPath = searchCandidates.find(p => {
      try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch (_) { return false; }
    }) || null;

    // If still not found, search directories by basename
    if (!foundPath) {
      const filename = path.basename(cleanPath);
      const possibleDirs = [
        path.resolve(__dirname, '../../Wallpapers'),
        path.resolve(__dirname, '../Wallpapers'),
        path.resolve(process.cwd(), 'Wallpapers'),
        path.resolve(__dirname, '../../renderer/assets/wallpapers'),
        path.resolve(__dirname, '../renderer/assets/wallpapers')
      ];
      for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
          const direct = path.join(dir, filename);
          if (fs.existsSync(direct)) {
            foundPath = direct;
            break;
          }
        }
      }
    }

    if (!foundPath) {
      throw new Error(`Wallpaper file not found on disk: ${wallpaperPath}`);
    }

    // Copy to user's ~/.local/share/backgrounds for permanent GNOME access
    const userBgDir = path.join(os.homedir(), '.local', 'share', 'backgrounds');
    if (!fs.existsSync(userBgDir)) {
      fs.mkdirSync(userBgDir, { recursive: true });
    }

    const safeBaseName = path.basename(foundPath).replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(userBgDir, safeBaseName);

    try {
      fs.copyFileSync(foundPath, targetPath);
    } catch (_) {}

    const finalPath = fs.existsSync(targetPath) ? targetPath : foundPath;
    const uri = `file://${finalPath}`;

    await execGsettings(['set', 'org.gnome.desktop.background', 'picture-options', 'zoom']);
    const r1 = await execGsettings(['set', 'org.gnome.desktop.background', 'picture-uri', uri]);
    const r2 = await execGsettings(['set', 'org.gnome.desktop.background', 'picture-uri-dark', uri]);

    return { success: r1.success || r2.success, path: finalPath, uri };
  } catch (err) {
    console.error('[GNOME setWallpaper] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Resets all appearance settings to Ubuntu / GNOME defaults
 */
async function resetToDefaults() {
  const { removeGtk4Fix } = require('./fixes/gtk4-libadwaita');
  try {
    removeGtk4Fix();
  } catch (_) {}

  await setGtkTheme('Yaru');
  await setIconTheme('Yaru');
  await setCursorTheme('Yaru');
  await execGsettings(['reset', 'org.gnome.desktop.interface', 'gtk-theme']);
  await execGsettings(['reset', 'org.gnome.desktop.interface', 'icon-theme']);
  await execGsettings(['reset', 'org.gnome.desktop.interface', 'cursor-theme']);
  await execGsettings(['reset', 'org.gnome.desktop.interface', 'color-scheme']);
  await execGsettings(['reset', 'org.gnome.desktop.background', 'picture-uri']);
  await execGsettings(['reset', 'org.gnome.desktop.background', 'picture-uri-dark']);
  await execGsettings(['set', 'org.gnome.desktop.wm.preferences', 'button-layout', ':minimize,maximize,close']);
  try {
    await execGsettings(['reset', 'org.gnome.shell.extensions.user-theme', 'name']);
    await execGsettings(['set', 'org.gnome.shell.extensions.user-theme', 'name', '']);
  } catch (_) {}
  return { success: true };
}

/**
 * Lists all installed GNOME extensions on system via direct metadata.json parsing
 */
async function listExtensions() {
  const userDir = path.join(os.homedir(), '.local', 'share', 'gnome-shell', 'extensions');
  const sysDir = '/usr/share/gnome-shell/extensions';

  // Get active enabled extensions from GNOME shell settings
  let enabledSet = new Set();
  try {
    const gsettingsRes = await execGsettings(['get', 'org.gnome.shell', 'enabled-extensions']);
    if (gsettingsRes.success && gsettingsRes.value) {
      // parse ['uuid1', 'uuid2']
      const rawArray = JSON.parse(gsettingsRes.value.replace(/'/g, '"'));
      if (Array.isArray(rawArray)) {
        rawArray.forEach(u => enabledSet.add(u));
      }
    }
  } catch (err) {
    // Fallback: query gnome-extensions list --enabled
    const cliRes = await execGnomeExtensions(['list', '--enabled']);
    if (cliRes.success && cliRes.stdout) {
      cliRes.stdout.split('\n').map(s => s.trim()).filter(Boolean).forEach(u => enabledSet.add(u));
    }
  }

  function readExtensionsFromDir(dirPath, isSystem) {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const list = [];

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const metaPath = path.join(dirPath, ent.name, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          const raw = fs.readFileSync(metaPath, 'utf-8');
          const meta = JSON.parse(raw);
          const uuid = meta.uuid || ent.name;
          const extPath = path.join(dirPath, ent.name);
          const hasPrefs = fs.existsSync(path.join(extPath, 'prefs.js')) || 
                           fs.existsSync(path.join(extPath, 'prefs.ui')) || 
                           Boolean(meta['settings-schema'] || meta.hasPrefs);

          list.push({
            uuid: uuid,
            name: meta.name || uuid,
            description: (meta.description || '').trim(),
            url: meta.url || '',
            version: String(meta['version-name'] || meta.version || ''),
            is_system: isSystem,
            enabled: enabledSet.has(uuid),
            has_prefs: hasPrefs,
            path: extPath
          });
        } catch (e) {
          console.error(`[GNOME Extension Parse Error] ${metaPath}:`, e.message);
        }
      }
    }
    return list;
  }

  const userExts = readExtensionsFromDir(userDir, false);
  const sysExts = readExtensionsFromDir(sysDir, true);

  // Merge with user extensions taking precedence over system ones with same UUID
  const seen = new Map();
  userExts.forEach(e => seen.set(e.uuid, e));
  sysExts.forEach(e => {
    if (!seen.has(e.uuid)) {
      seen.set(e.uuid, e);
    }
  });

  const extensions = Array.from(seen.values()).sort((a, b) => {
    // Show user-installed first, then alphabetized
    if (a.is_system !== b.is_system) return a.is_system ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return { success: true, extensions };
}

/**
 * Opens the native GNOME Shell Extension Preferences dialog
 * @param {string} uuid
 */
async function openExtensionPrefs(uuid) {
  if (!uuid) return { success: false, error: 'No UUID provided' };
  const { spawn } = require('child_process');
  try {
    const child = spawn('gnome-extensions', ['prefs', uuid], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Enables a GNOME extension by UUID
 * @param {string} uuid
 */
async function enableExtension(uuid) {
  return execGnomeExtensions(['enable', uuid]);
}

/**
 * Disables a GNOME extension by UUID
 * @param {string} uuid
 */
async function disableExtension(uuid) {
  return execGnomeExtensions(['disable', uuid]);
}

module.exports = {
  getCurrentSettings,
  setGtkTheme,
  setIconTheme,
  setCursorTheme,
  setShellTheme,
  setWallpaper,
  resetToDefaults,
  listExtensions,
  openExtensionPrefs,
  enableExtension,
  disableExtension
};
