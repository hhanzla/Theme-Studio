const { ipcMain } = require('electron');
const stateStore = require('../lib/state-store');
const flatpakOverride = require('../lib/fixes/flatpak-override');
const looks = require('../lib/looks');

function registerSettingsIpc() {
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = stateStore.getSettings();
      const flatpakInstalled = await flatpakOverride.isFlatpakInstalled();
      return { success: true, settings, flatpakInstalled };
    } catch (err) {
      console.error('[IPC settings:get] Error:', err);
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
