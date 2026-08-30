const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { registerCatalogIpc } = require('../main/ipc/catalog.ipc');
const { registerSystemIpc } = require('../main/ipc/system.ipc');
const catalog = require('../main/lib/catalog');
const paths = require('../main/lib/paths');
const stateStore = require('../main/lib/state-store');

app.whenReady().then(async () => {
  console.log('[Test] App ready, registering IPC...');
  registerCatalogIpc();
  registerSystemIpc();

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../main/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  win.webContents.on('did-finish-load', async () => {
    console.log('[Test] Renderer index.html loaded.');
    
    // Test renderer execution and card count
    const cardCount = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        setTimeout(() => {
          const cards = document.querySelectorAll('.theme-card');
          resolve(cards.length);
        }, 500);
      });
    `);

    console.log(`[Test] Successfully rendered ${cardCount} cards in Browse grid!`);
    
    if (cardCount > 0) {
      console.log('[Test] Phase 1 Verification PASSED!');
      app.exit(0);
    } else {
      console.error('[Test] No cards were rendered.');
      app.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[Test] Timeout waiting for did-finish-load');
    app.exit(1);
  }, 10000);
});
