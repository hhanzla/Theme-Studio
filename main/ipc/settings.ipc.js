const { ipcMain, shell } = require('electron');
const stateStore = require('../lib/state-store');
const flatpakOverride = require('../lib/fixes/flatpak-override');
const looks = require('../lib/looks');
const paths = require('../lib/paths');
const fs = require('fs');

function registerSettingsIpc() {
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = stateStore.getSettings();
      const flatpakInstalled = await flatpakOverride.isFlatpakInstalled();
      const allPaths = {
        home: paths.HOME,
        userGtkThemes: paths.GTK_THEMES,
        localShareThemes: paths.LOCAL_THEMES,
        systemThemes: paths.SYSTEM_THEMES,
        userIcons: paths.ICON_THEMES,
        localShareIcons: paths.LOCAL_ICONS,
        systemIcons: paths.SYSTEM_ICONS,
        gtk4Config: paths.GTK4_CONFIG,
        gtk3Config: paths.GTK3_CONFIG,
        extensions: paths.EXTENSIONS_DIR,
        backgrounds: paths.BACKGROUNDS_DIR,
        downloadCache: paths.DOWNLOAD_CACHE,
        appData: paths.getUserDataPath(),
        stateFile: paths.STATE_FILE
      };
      return { success: true, settings, flatpakInstalled, paths: allPaths };
    } catch (err) {
      console.error('[IPC settings:get] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:open-path', async (_event, targetPath) => {
    try {
      if (!targetPath) return { success: false, error: 'Path is required' };
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      await shell.openPath(targetPath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:clear-cache', async () => {
    try {
      if (fs.existsSync(paths.DOWNLOAD_CACHE)) {
        fs.rmSync(paths.DOWNLOAD_CACHE, { recursive: true, force: true });
        fs.mkdirSync(paths.DOWNLOAD_CACHE, { recursive: true });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:set', async (_event, payload = {}) => {
    try {
      const { key, value } = payload;
      if (!key) return { success: false, error: 'Setting key is required' };

      if (key === 'flatpak_theme_sync') {
        if (value) {
          const res = await flatpakOverride.applyFlatpakOverride();
          if (!res.success) {
            return res;
          }
        } else {
          await flatpakOverride.removeFlatpakOverride();
        }
      }

      stateStore.setSetting(key, value);
      return { success: true, settings: stateStore.getSettings() };
    } catch (err) {
      console.error('[IPC settings:set] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('look:apply', async (event, payload = {}) => {
    try {
      const { id } = payload;
      if (!id) return { success: false, error: 'Look ID is required' };

      const result = await looks.applyLookPreset(id, (p) => {
        event.sender.send('install:progress', { id, ...p });
      });

      return result;
    } catch (err) {
      console.error('[IPC look:apply] Error:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerSettingsIpc
};
