// main/ipc/gdm.ipc.js
// Handles GDM / Lock Screen IPC channels

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const gdmAssets = require('../lib/fixes/gdm-assets');
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
      const gseSystemPath = '/usr/local/share/gnome-shell/extensions/gdm-extension@pratap.fastmail.fm';
      const gseAltPath = '/usr/share/gnome-shell/extensions/gdm-extension@pratap.fastmail.fm';
      const gseUserPath = path.join(require('os').homedir(), '.local/share/gnome-shell/extensions/gdm-extension@pratap.fastmail.fm');
      
      const isInstalled = fs.existsSync(gseSystemPath) || fs.existsSync(gseAltPath) || fs.existsSync(gseUserPath);

      return {
        success: true,
        gseGdmInstalled: isInstalled,
        gseGdmPath: isInstalled ? (fs.existsSync(gseSystemPath) ? gseSystemPath : (fs.existsSync(gseAltPath) ? gseAltPath : gseUserPath)) : null
      };
    } catch (err) {
      return { success: false, error: err.message, gseGdmInstalled: false };
    }
  });
}

module.exports = {
  registerGdmIpc
};
