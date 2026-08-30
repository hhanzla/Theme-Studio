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
      const stateItems = stateStore.getInstalledItems();
      const stateMap = new Map();
      for (const it of stateItems) {
        stateMap.set(it.id, it);
      }

      // 1. Scan live catalog items with disk & state detection
      const allCatalog = catalog.listCatalog('all') || [];
      const installedCatalogItems = allCatalog.filter(c => c.installed);

      for (const catItem of installedCatalogItems) {
        if (!stateMap.has(catItem.id)) {
          const info = catItem.installedInfo || {
            id: catItem.id,
            name: catItem.name,
            category: catItem.category,
            installed_folders: [],
            primary_path: null
          };
          stateMap.set(catItem.id, {
            ...info,
            thumbnail: catItem.thumbnail,
            author: catItem.author,
            install_type: catItem.install_type
          });
        }
      }

      // 2. Enrich items with thumbnails, authors, and install types
      const finalItems = Array.from(stateMap.values()).map(inst => {
        const baseId = (inst.id || '').replace(/-shell$/, '');
        const catMatch = allCatalog.find(c => c.id === inst.id || c.id === baseId || c.id.replace(/-shell$/, '') === baseId);
        const thumbnail = inst.thumbnail || (catMatch ? catMatch.thumbnail : null) || `assets/previews/${baseId}.png`;
        const installType = inst.install_type || (catMatch ? catMatch.install_type : 'script');
        const author = inst.author || (catMatch ? catMatch.author : 'Unknown');

        return {
          ...inst,
          thumbnail,
          install_type: installType,
          author
        };
      });

      return { success: true, items: finalItems };
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
      if (!fs.existsSync(paths.DOWNLOAD_CACHE)) {
        return { success: true, bytes: 0, formatted: '0 B' };
      }

      const { execFile } = require('child_process');
      const bytes = await new Promise((resolve) => {
        execFile('du', ['-sb', paths.DOWNLOAD_CACHE], (err, stdout) => {
          if (!err && stdout) {
            const match = stdout.trim().split(/\s+/)[0];
            const parsed = parseInt(match, 10);
            if (!isNaN(parsed)) return resolve(parsed);
          }
          resolve(getDirSize(paths.DOWNLOAD_CACHE));
        });
      });

      return {
        success: true,
        bytes,
        formatted: formatBytes(bytes)
      };
    } catch (err) {
      return { success: false, bytes: 0, formatted: '0 B', error: err.message };
    }
  });
}

module.exports = {
  registerUninstallIpc
};
