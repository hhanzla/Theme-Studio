const fs = require('fs');
const path = require('path');
const catalog = require('./catalog');
const installer = require('./installer');
const stateStore = require('./state-store');
const gnome = require('./gnome');
const downloader = require('./downloader');
const { DOWNLOAD_CACHE } = require('./paths');

/**
 * Loads all look presets from looks.json
 */
function getLookPresets() {
  const file = path.join(__dirname, '../../sources/looks.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('[Looks] Failed to parse looks.json:', err);
    return [];
  }
}

/**
 * Applies a full look preset (installs missing components and sets GNOME appearance)
 * @param {string} lookId - Preset ID
 * @param {function} onProgress - Callback ({ percent, stage, message })
 */
async function applyLookPreset(lookId, onProgress = () => {}) {
  const presets = getLookPresets();
  const look = presets.find(l => l.id === lookId);

  if (!look) {
    throw new Error(`Look preset "${lookId}" not found in looks.json`);
  }

  onProgress({ percent: 10, stage: 'checking_components', message: `Preparing ${look.name}...` });

  // 1. Check & Install GTK Theme if needed
  if (look.theme_id) {
    const themeItem = catalog.findItemById(look.theme_id, 'gtk-theme');
    if (themeItem && !stateStore.isInstalled(themeItem.id)) {
      onProgress({ percent: 25, stage: 'installing_theme', message: `Installing theme: ${themeItem.name}...` });
      await installer.installItem(themeItem, { variant: look.variant }, () => {});
    }
  }

  // 2. Check & Install Icons if needed
  if (look.icon_id) {
    const iconItem = catalog.findItemById(look.icon_id, 'icon-theme');
    if (iconItem && !stateStore.isInstalled(iconItem.id)) {
      onProgress({ percent: 50, stage: 'installing_icons', message: `Installing icon pack: ${iconItem.name}...` });
      await installer.installItem(iconItem, {}, () => {});
    }
  }

  // 3. Check & Install Cursors if needed
  if (look.cursor_id) {
    const cursorItem = catalog.findItemById(look.cursor_id, 'cursor-theme');
    if (cursorItem && !stateStore.isInstalled(cursorItem.id)) {
      onProgress({ percent: 70, stage: 'installing_cursors', message: `Installing cursor set: ${cursorItem.name}...` });
      await installer.installItem(cursorItem, {}, () => {});
    }
  }

  // 4. Download and Apply Wallpaper if specified
  if (look.wallpaper_url) {
    onProgress({ percent: 85, stage: 'applying_wallpaper', message: 'Downloading & setting wallpaper...' });
    const wallpapersDir = path.join(DOWNLOAD_CACHE, 'wallpapers');
    if (!fs.existsSync(wallpapersDir)) {
      fs.mkdirSync(wallpapersDir, { recursive: true });
    }
    const wallpaperPath = path.join(wallpapersDir, `${look.id}.png`);
    if (!fs.existsSync(wallpaperPath)) {
      try {
        await downloader.downloadFile(look.wallpaper_url, wallpaperPath);
      } catch (err) {
        console.error('[Looks] Failed to download wallpaper:', err);
      }
    }
    if (fs.existsSync(wallpaperPath)) {
      await gnome.setWallpaper(wallpaperPath);
    }
  }

  // 5. Apply multi-gsettings
  onProgress({ percent: 95, stage: 'applying_settings', message: 'Applying desktop appearance...' });

  if (look.gtk_theme_name) {
    await gnome.setGtkTheme(look.gtk_theme_name);
  }
  if (look.icon_theme_name) {
    await gnome.setIconTheme(look.icon_theme_name);
  }
  if (look.cursor_theme_name) {
    await gnome.setCursorTheme(look.cursor_theme_name);
  }

  // 6. Record active look in settings
  stateStore.setSetting('active_look', look.id);

  onProgress({ percent: 100, stage: 'completed', message: `${look.name} applied successfully!` });

  return {
    success: true,
    message: `${look.name} applied successfully!`
  };
}

module.exports = {
  getLookPresets,
  applyLookPreset
};
