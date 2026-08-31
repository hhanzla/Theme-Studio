const { ipcMain } = require('electron');
const tweaks = require('../lib/tweaks');

function registerTweaksIpc() {
  ipcMain.handle('tweaks:get-app-folders', async () => {
    try {
      return await tweaks.getAppFoldersStatus();
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tweaks:organize-app-folders', async () => {
    try {
      return await tweaks.organizeAppFolders();
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tweaks:reset-app-folders', async () => {
    try {
      return await tweaks.resetAppFolders();
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tweaks:get-desktop-tweaks', async () => {
    try {
      return await tweaks.getDesktopTweaks();
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tweaks:set-desktop-tweak', async (_event, payload = {}) => {
    try {
      return await tweaks.setDesktopTweak(payload.key, payload.value);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerTweaksIpc };
