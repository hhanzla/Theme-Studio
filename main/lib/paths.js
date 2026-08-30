const path = require('path');
const os = require('os');

let app;
try {
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.app) {
    app = electron.app;
  }
} catch (_) {}

const HOME = os.homedir();

const GTK_THEMES = path.join(HOME, '.themes');
const ICON_THEMES = path.join(HOME, '.icons');
const GTK4_CONFIG = path.join(HOME, '.config', 'gtk-4.0');
const EXTENSIONS_DIR = path.join(HOME, '.local', 'share', 'gnome-shell', 'extensions');
const DOWNLOAD_CACHE = path.join(HOME, '.cache', 'themestudio', 'downloads');

// When app is not initialized yet or in standalone test, fallback to ~/.config/themestudio
const getUserDataPath = () => {
  try {
    if (app && app.getPath) {
      return app.getPath('userData');
    }
  } catch (_) {
    // Ignore and fallback
  }
  return path.join(HOME, '.config', 'themestudio');
};

const STATE_FILE = path.join(getUserDataPath(), 'installed.json');

module.exports = {
  HOME,
  GTK_THEMES,
  THEMES_DIR: GTK_THEMES,
  ICON_THEMES,
  ICONS_DIR: ICON_THEMES,
  GTK4_CONFIG,
  EXTENSIONS_DIR,
  DOWNLOAD_CACHE,
  STATE_FILE,
  getUserDataPath
};
