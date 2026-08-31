const { ipcMain } = require('electron');
const gnome = require('../lib/gnome');
const extensionsLib = require('../lib/extensions');
const { GTK_THEMES, THEMES_DIR, ICON_THEMES, HOME } = require('../lib/paths');
const { applyGtk4Fix, removeGtk4Fix } = require('../lib/fixes/gtk4-libadwaita');
const stateStore = require('../lib/state-store');
const fs = require('fs');
const path = require('path');

/**
 * Resolves the actual folder name and directory path on disk for a given theme/icon/cursor name or id
 */
function resolveThemeTarget(rawName, category) {
  if (!rawName || typeof rawName !== 'string') {
    return { name: '', path: null };
  }

  const isGtkOrShell = category === 'gtk-theme' || category === 'shell-theme';
  const baseDirs = isGtkOrShell 
    ? [GTK_THEMES, path.join(HOME, '.local', 'share', 'themes'), '/usr/share/themes']
    : [ICON_THEMES, path.join(HOME, '.local', 'share', 'icons'), '/usr/share/icons'];

  // If already matches an exact folder on disk, return it directly
  for (const baseDir of baseDirs) {
    if (fs.existsSync(baseDir)) {
      const direct = path.join(baseDir, rawName);
      if (fs.existsSync(direct)) {
        return { name: rawName, path: direct };
      }
    }
  }

  const cleanBaseSlug = rawName.toLowerCase()
    .replace(/shell|gtk|theme|themes/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // 1. Check stateStore for installed folders
  const installedItems = stateStore.getInstalledItems();
  const matchedStoreItem = installedItems.find(i => {
    const iSlug = (i.id || '').toLowerCase().replace(/shell|gtk|theme|themes/g, '').replace(/[^a-z0-9]+/g, '-');
    const iName = (i.name || '').toLowerCase();
    return i.id === rawName || (cleanBaseSlug && iSlug.includes(cleanBaseSlug)) || iName.includes(rawName.toLowerCase()) || (cleanBaseSlug && iName.includes(cleanBaseSlug));
  });

  if (matchedStoreItem && Array.isArray(matchedStoreItem.installed_folders) && matchedStoreItem.installed_folders.length > 0) {
    const validFolders = matchedStoreItem.installed_folders.filter(f => !f.endsWith('-hdpi') && !f.endsWith('-xhdpi'));
    const folderName = validFolders[0] || matchedStoreItem.installed_folders[0];
    const fullPath = matchedStoreItem.primary_path || path.join(isGtkOrShell ? GTK_THEMES : ICON_THEMES, folderName);
    return { name: folderName, path: fullPath };
  }

  // 2. Search physical directories on disk
  for (const baseDir of baseDirs) {
    if (!fs.existsSync(baseDir)) continue;

    try {
      const entries = fs.readdirSync(baseDir);
      const matchedFolder = entries.find(e => {
        const eLower = e.toLowerCase();
        if (eLower.endsWith('-hdpi') || eLower.endsWith('-xhdpi')) return false;

        const matches = cleanBaseSlug && (eLower === cleanBaseSlug || eLower.includes(cleanBaseSlug) || cleanBaseSlug.includes(eLower));
        if (category === 'shell-theme') {
          return matches && fs.existsSync(path.join(baseDir, e, 'gnome-shell'));
        }
        return matches;
      });

      if (matchedFolder) {
        return { name: matchedFolder, path: path.join(baseDir, matchedFolder) };
      }
    } catch (_) {}
  }

  return { name: rawName, path: path.join(isGtkOrShell ? GTK_THEMES : ICON_THEMES, rawName) };
}

function registerSystemIpc() {
  ipcMain.handle('reset:default', async () => {
    try {
      const res = await gnome.resetToDefaults();
      try {
        removeGtk4Fix();
      } catch (_) {}
      return res;
    } catch (err) {
      console.error('[IPC reset:default] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('apply:gtk', async (_event, payload) => {
    try {
      const rawName = typeof payload === 'string' ? payload : (payload.name || payload.id);
      const resolved = resolveThemeTarget(rawName, 'gtk-theme');
      const targetName = resolved.name || rawName;

      const res = await gnome.setGtkTheme(targetName);

      if (targetName.toLowerCase() === 'yaru' || targetName.toLowerCase() === 'adwaita') {
        try {
          removeGtk4Fix();
        } catch (_) {}
      } else if (resolved.path && fs.existsSync(resolved.path)) {
        // Apply GTK4 / Libadwaita fix
        try {
          applyGtk4Fix(resolved.path);
        } catch (err) {
          console.error('[apply:gtk GTK4 fix error]:', err.message);
        }

        // Also sync GNOME Shell theme if companion shell style is present
        if (fs.existsSync(path.join(resolved.path, 'gnome-shell'))) {
          try {
            await gnome.setShellTheme(targetName);
          } catch (_) {}
        }
      }

      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('apply:icons', async (_event, payload) => {
    try {
      const rawName = typeof payload === 'string' ? payload : (payload.name || payload.id);
      const resolved = resolveThemeTarget(rawName, 'icon-theme');
      const targetName = resolved.name || rawName;

      const res = await gnome.setIconTheme(targetName);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('apply:cursors', async (_event, payload) => {
    try {
      const rawName = typeof payload === 'string' ? payload : (payload.name || payload.id);
      const resolved = resolveThemeTarget(rawName, 'cursor-theme');
      const targetName = resolved.name || rawName;

      const res = await gnome.setCursorTheme(targetName);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('apply:shell', async (_event, payload) => {
    try {
      const rawName = typeof payload === 'string' ? payload : (payload.name || payload.id);
      const resolved = resolveThemeTarget(rawName, 'shell-theme');
      const targetName = resolved.name || rawName;

      const res = await gnome.setShellTheme(targetName);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('apply:wallpaper', async (_event, payload) => {
    try {
      let wallpaperPath = typeof payload === 'string' ? payload : (payload.path || payload.url);
      if (!wallpaperPath) return { success: false, error: 'No wallpaper path or URL provided' };

      // On-demand live download for online/remote wallpaper URLs
      if (wallpaperPath.startsWith('http://') || wallpaperPath.startsWith('https://')) {
        const downloader = require('../lib/downloader');
        const os = require('os');
        const bgDir = path.join(os.homedir(), '.local', 'share', 'backgrounds');
        if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });

        // Clean filename from URL
        let urlFileName = path.basename(new URL(wallpaperPath).pathname);
        if (!urlFileName || urlFileName === '/') urlFileName = 'wallpaper_' + Date.now() + '.jpg';
        const targetPath = path.join(bgDir, urlFileName);

        // Download only if not already cached
        if (!fs.existsSync(targetPath)) {
          await downloader.downloadFile(wallpaperPath, targetPath);
        }
        wallpaperPath = targetPath;
      } else if (!wallpaperPath.startsWith('/') && !wallpaperPath.startsWith('file://')) {
        const rendererPath = path.resolve(__dirname, '../../renderer', wallpaperPath);
        if (fs.existsSync(rendererPath)) {
          wallpaperPath = rendererPath;
        }
      }

      const res = await gnome.setWallpaper(wallpaperPath);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:current', async () => {
    try {
      const current = await gnome.getCurrentSettings();
      return { success: true, settings: current };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:extensions:list', async () => {
    return gnome.listExtensions();
  });

  ipcMain.handle('system:extensions:search', async (_event, payload) => {
    return extensionsLib.searchOnlineExtensions(payload || {});
  });

  ipcMain.handle('system:extensions:install-online', async (_event, payload) => {
    return extensionsLib.installOnlineExtension(payload || {});
  });

  ipcMain.handle('system:extensions:uninstall', async (_event, uuid) => {
    return extensionsLib.uninstallExtension(uuid);
  });

  ipcMain.handle('system:extensions:prefs', async (_event, uuid) => {
    return gnome.openExtensionPrefs(uuid);
  });

  ipcMain.handle('system:extensions:enable', async (_event, uuid) => {
    return gnome.enableExtension(uuid);
  });

  ipcMain.handle('system:extensions:disable', async (_event, uuid) => {
    return gnome.disableExtension(uuid);
  });

  ipcMain.handle('system:theme-variants:get', async (_event, payload) => {
    try {
      const rawName = typeof payload === 'string' ? payload : (payload.name || payload.id);
      const category = (typeof payload === 'object' && payload.category) || 'gtk-theme';
      const isGtkOrShell = category === 'gtk-theme' || category === 'shell-theme';
      const baseDirs = isGtkOrShell
        ? [GTK_THEMES, path.join(HOME, '.local', 'share', 'themes'), '/usr/share/themes']
        : [ICON_THEMES, path.join(HOME, '.local', 'share', 'icons'), '/usr/share/icons'];

      const cleanBaseSlug = (rawName || '').toLowerCase()
        .replace(/shell|gtk|theme|themes/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const seen = new Set();
      const matchedFolders = [];

      for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) continue;
        try {
          const entries = fs.readdirSync(baseDir);
          for (const e of entries) {
            if (seen.has(e)) continue;
            const eLower = e.toLowerCase();
            if (eLower.endsWith('-hdpi') || eLower.endsWith('-xhdpi')) continue;

            const matches = cleanBaseSlug && (eLower === cleanBaseSlug || eLower.includes(cleanBaseSlug) || cleanBaseSlug.includes(eLower));
            if (!matches) continue;
            if (category === 'shell-theme' && !fs.existsSync(path.join(baseDir, e, 'gnome-shell'))) continue;

            seen.add(e);
            matchedFolders.push(e);
          }
        } catch (_) {}
      }

      const variants = matchedFolders.map(folder => {
        let label = folder;
        if (folder.toLowerCase().includes('compact')) {
          label = `Compact (${folder})`;
        } else if (folder.includes('-')) {
          const part = folder.split('-').slice(1).join('-');
          if (part) {
            label = `${part.charAt(0).toUpperCase() + part.slice(1)} (${folder})`;
          } else {
            label = folder;
          }
        } else {
          label = `Standard (${folder})`;
        }
        return {
          id: folder,
          label: label,
          isCompact: folder.toLowerCase().includes('compact')
        };
      });

      return { success: true, variants };
    } catch (err) {
      return { success: false, error: err.message, variants: [] };
    }
  });
}

module.exports = {
  registerSystemIpc
};
