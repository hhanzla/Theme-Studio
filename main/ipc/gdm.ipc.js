// main/ipc/gdm.ipc.js
// Handles GDM / Lock Screen IPC channels

const { ipcMain } = require('electron');
const path = require('path');
const gdmAssets = require('../lib/fixes/gdm-assets');
const gdm = require('../lib/gdm');
const stateStore = require('../lib/state-store');

function registerGdmIpc() {
  /**
   * Copy an installed asset or local path into /usr/share/* system directory for GDM
   */
  ipcMain.handle('gdm:copyAsset', async (_event, payload = {}) => {
    try {
      let assetPath = payload.path;
      const category = payload.category;

      // If id is provided but not path, find in stateStore
      if (!assetPath && payload.id) {
        const item = stateStore.getById(payload.id);
        if (item) {
          assetPath = item.primary_path || (item.installed_folders && item.installed_folders[0] ? path.join(item.target_dir, item.installed_folders[0]) : null);
        }
      }

      if (!assetPath) {
        return { success: false, error: 'Asset path could not be resolved.' };
      }

      return await gdmAssets.copyToSystemDir(assetPath, category);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * Check status of GSE-GDM extension
   */
  ipcMain.handle('gdm:status', async () => {
    try {
      return await gdm.checkGdmStatus();
    } catch (err) {
      return { success: false, error: err.message, gseGdmInstalled: false };
    }
  });

  /**
   * Enable GDM session login-screen customization
   */
  ipcMain.handle('gdm:enableExtension', async () => {
    try {
      return await gdm.enableGdmCustomization();
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * Set GDM Shell Theme in gdm user dconf
   */
  ipcMain.handle('gdm:setShellTheme', async (_event, payload = {}) => {
    try {
      return await gdm.setGdmShellTheme(payload.themeName || payload.name);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  /**
   * Set GDM Background in gdm user dconf
   */
  ipcMain.handle('gdm:setBackground', async (_event, payload = {}) => {
    try {
      return await gdm.setGdmBackground(payload.bgPath || payload.path);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerGdmIpc
};
