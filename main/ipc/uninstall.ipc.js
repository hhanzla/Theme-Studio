const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const uninstaller = require('../lib/uninstaller');
const stateStore = require('../lib/state-store');
const catalog = require('../lib/catalog');
const paths = require('../lib/paths');

function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let s = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          s += getDirSize(full);
        } else if (entry.isFile()) {
          s += fs.statSync(full).size;
        }
      } catch (_) {}
    }
  } catch (_) {}
  return s;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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

  ipcMain.handle('uninstall:batch-remove', async (_event, payload = {}) => {
    try {
      const { ids } = payload;
      if (!Array.isArray(ids) || ids.length === 0) {
        return { success: false, error: 'No items selected for removal' };
      }

      let removedCount = 0;
      let errors = [];

      for (const id of ids) {
        try {
          const res = await uninstaller.removeInstalledItem(id);
          if (res && res.success) {
            removedCount++;
          } else {
            errors.push({ id, error: res ? res.error : 'Failed to uninstall' });
          }
        } catch (err) {
          errors.push({ id, error: err.message });
        }
      }

      return {
        success: removedCount > 0,
        removedCount,
        failedCount: errors.length,
        errors
      };
    } catch (err) {
      console.error('[IPC uninstall:batch-remove] Error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('uninstall:get-cache-size', async () => {
    try {
      let totalBytes = 0;
      if (fs.existsSync(paths.DOWNLOAD_CACHE)) {
        totalBytes += getDirSize(paths.DOWNLOAD_CACHE);
      }
      return {
        success: true,
        bytes: totalBytes,
        formatted: formatBytes(totalBytes)
      };
    } catch (err) {
      return { success: false, bytes: 0, formatted: '0 B', error: err.message };
    }
  });
}

module.exports = {
  registerUninstallIpc
};
