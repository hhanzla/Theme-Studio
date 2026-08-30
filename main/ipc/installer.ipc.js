const { ipcMain } = require('electron');
const installer = require('../lib/installer');
const catalog = require('../lib/catalog');
const downloader = require('../lib/downloader');

function registerInstallerIpc() {
  ipcMain.handle('install:start', async (event, payload = {}) => {
    try {
      const { id, category, variant } = payload;
      if (!id) {
        return { success: false, error: 'Item ID is required' };
      }

      // Find item in catalog
      const allItems = catalog.listCatalog(category || 'all');
      const item = allItems.find((i) => i.id === id);

      if (!item) {
        return { success: false, error: `Catalog item "${id}" not found` };
      }

      const result = await installer.installItem(item, { variant }, (progress) => {
        try {
          if (!event.sender.isDestroyed()) {
            event.sender.send('install:progress', progress);
          }
        } catch (_) {}
      });

      return { success: true, item: result.item };
    } catch (err) {
      console.error('[IPC install:start] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('install:cancel', async (_event, payload = {}) => {
    try {
      const { id } = payload;
      if (!id) return { success: false, error: 'ID is required' };
      const cancelled = installer.cancelInstall(id);
      return { success: true, cancelled };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerInstallerIpc
};
