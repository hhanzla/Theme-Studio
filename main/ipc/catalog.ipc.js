const { ipcMain } = require('electron');
const catalog = require('../lib/catalog');

function registerCatalogIpc() {
  ipcMain.handle('catalog:list', async (_event, payload = {}) => {
    try {
      const category = typeof payload === 'string' ? payload : (payload.category || 'all');
      return { success: true, items: catalog.listCatalog(category) };
    } catch (err) {
      console.error('[IPC catalog:list] Error:', err);
      return { success: false, error: err.message, items: [] };
    }
  });

  ipcMain.handle('catalog:refresh', async (_event, payload = {}) => {
    try {
      const category = typeof payload === 'string' ? payload : (payload.category || 'all');
      return { success: true, items: catalog.listCatalog(category) };
    } catch (err) {
      console.error('[IPC catalog:refresh] Error:', err);
      return { success: false, error: err.message, items: [] };
    }
  });
}

module.exports = {
  registerCatalogIpc
};
