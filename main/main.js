const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerCatalogIpc } = require('./ipc/catalog.ipc');
const { registerInstallerIpc } = require('./ipc/installer.ipc');
const { registerDepsIpc } = require('./ipc/deps.ipc');
const { registerUninstallIpc } = require('./ipc/uninstall.ipc');
const { registerSystemIpc } = require('./ipc/system.ipc');
const { registerSettingsIpc } = require('./ipc/settings.ipc');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 620,
    minWidth: 840,
    minHeight: 500,
    center: true,
    show: false,
    backgroundColor: '#ffffff',
    title: 'Theme Studio',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Remove default menu bar for cleaner native desktop app look
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.center();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.setName('Theme Studio');
app.setAppUserModelId('themestudio.desktop');

app.whenReady().then(() => {
  // Register IPC handlers
  registerCatalogIpc();
  registerInstallerIpc();
  registerDepsIpc();
  registerUninstallIpc();
  registerSystemIpc();
  registerSettingsIpc();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
