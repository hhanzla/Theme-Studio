const { ipcMain } = require('electron');
const uninstaller = require('../lib/uninstaller');
const stateStore = require('../lib/state-store');
const catalog = require('../lib/catalog');

function registerUninstallIpc() {
  ipcMain.handle('uninstall:list', async () => {
    try {
      const items = stateStore.getInstalledItems();
      let allCatalog = [];
      try {
        allCatalog = catalog.listCatalog('all') || [];
      } catch (_) {}

      const enriched = items.map(inst => {
        const baseId = (inst.id || '').replace(/-shell$/, '');
        const catMatch = allCatalog.find(c => c.id === inst.id || c.id === baseId || c.id.replace(/-shell$/, '') === baseId);
        
        const thumbnail = inst.thumbnail || (catMatch ? catMatch.thumbnail : null) || `assets/previews/${baseId}.png`;

        return {
          ...inst,
          thumbnail
        };
      });

      return { success: true, items: enriched };
    } catch (err) {
      console.error('[IPC uninstall:list] Error:', err);
      return { success: false, items: [], error: err.message };
    }
  });

  ipcMain.handle('uninstall:remove', async (_event, payload = {}) => {
    try {
      const { id } = payload;
      if (!id) return { success: false, error: 'Item ID is required' };
      const result = await uninstaller.removeInstalledItem(id);
      return result;
    } catch (err) {
      console.error('[IPC uninstall:remove] Error:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerUninstallIpc
};
