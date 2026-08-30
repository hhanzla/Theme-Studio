const { ipcMain } = require('electron');
const dependencyChecker = require('../lib/dependency-checker');

function registerDepsIpc() {
  ipcMain.handle('deps:check', async (_event, payload = {}) => {
    try {
      const list = payload.list || [];
      const result = await dependencyChecker.checkBinaries(list);
      return { success: true, missing: result.missing };
    } catch (err) {
      console.error('[IPC deps:check] Error:', err);
      return { success: false, missing: [], error: err.message };
    }
  });

  ipcMain.handle('deps:install', async (_event, payload = {}) => {
    try {
      const list = payload.list || [];
      const result = await dependencyChecker.installDependencies(list);
      return result;
    } catch (err) {
      console.error('[IPC deps:install] Error:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerDepsIpc
};
