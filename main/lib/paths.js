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
const LOCAL_THEMES = path.join(HOME, '.local', 'share', 'themes');
const LOCAL_ICONS = path.join(HOME, '.local', 'share', 'icons');
const SYSTEM_THEMES = '/usr/share/themes';
const SYSTEM_ICONS = '/usr/share/icons';
const SYS_THEMES = '/usr/share/themes';
const SYS_ICONS = '/usr/share/icons';
const SYS_BACKGROUNDS = '/usr/share/backgrounds';
const SYS_FONTS = '/usr/share/fonts';
const SYS_PIXMAPS = '/usr/share/pixmaps';
const GTK4_CONFIG = path.join(HOME, '.config', 'gtk-4.0');
const GTK3_CONFIG = path.join(HOME, '.config', 'gtk-3.0');
const EXTENSIONS_DIR = path.join(HOME, '.local', 'share', 'gnome-shell', 'extensions');
const BACKGROUNDS_DIR = path.join(HOME, '.local', 'share', 'backgrounds');
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
  LOCAL_THEMES,
  LOCAL_ICONS,
  SYSTEM_THEMES,
  SYSTEM_ICONS,
  SYS_THEMES,
  SYS_ICONS,
  SYS_BACKGROUNDS,
  SYS_FONTS,
  SYS_PIXMAPS,
  GTK4_CONFIG,
  GTK3_CONFIG,
  EXTENSIONS_DIR,
  BACKGROUNDS_DIR,
  DOWNLOAD_CACHE,
  STATE_FILE,
  getUserDataPath
};
