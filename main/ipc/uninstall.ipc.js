const { ipcMain } = require('electron');
const uninstaller = require('../lib/uninstaller');
const stateStore = require('../lib/state-store');

function registerUninstallIpc() {
  ipcMain.handle('uninstall:list', async () => {
    try {
      const items = stateStore.getInstalledItems();
      return { success: true, items };
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
