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
 * Applies a full look preset (installs components with chosen variants and sets GNOME appearance)
 * @param {object|string} payload - Preset ID or object { id, variants }
 * @param {function} onProgress - Callback ({ percent, stage, message })
 */
async function applyLookPreset(payload, onProgress = () => {}) {
  const lookId = typeof payload === 'string' ? payload : (payload.id || payload);
  const selectedVariants = (typeof payload === 'object' && payload.variants) || {};

  const presets = getLookPresets();
  const look = presets.find(l => l.id === lookId);

  if (!look) {
    throw new Error(`Look preset "${lookId}" not found in looks.json`);
  }

  onProgress({ percent: 10, stage: 'checking_components', message: `Preparing ${look.name}...` });

  // 1. Check & Install GTK Theme (Orchis) with selected or preset variant
  let installedGtkTarget = null;
  if (look.theme_id) {
    const themeItem = catalog.findItemById(look.theme_id, 'gtk-theme');
    const gtkVar = selectedVariants.theme || look.gtk_variant || { color: 'default', mode: 'dark', size: 'compact' };
    onProgress({ percent: 25, stage: 'installing_theme', message: `Installing theme: ${themeItem ? themeItem.name : 'Theme'}...` });
    if (themeItem) {
      const res = await installer.installItem(themeItem, { variant: gtkVar }, (p) => {
        onProgress({ percent: 20 + Math.round(p.percent * 0.2), stage: 'installing_theme', message: p.message });
      });
      if (res && res.item && res.item.installed_folders && res.item.installed_folders.length > 0) {
        installedGtkTarget = res.item.installed_folders[0];
      }
    }
  }

  // 2. Check & Install Icons (Tela) with selected or preset variant
  let installedIconTarget = null;
  if (look.icon_id) {
    const iconItem = catalog.findItemById(look.icon_id, 'icon-theme');
    const iconVar = selectedVariants.icon || look.icon_variant || { color: 'dracula' };
    onProgress({ percent: 50, stage: 'installing_icons', message: `Installing icon pack: ${iconItem ? iconItem.name : 'Icons'}...` });
    if (iconItem) {
      const res = await installer.installItem(iconItem, { variant: iconVar }, (p) => {
        onProgress({ percent: 45 + Math.round(p.percent * 0.2), stage: 'installing_icons', message: p.message });
      });
      if (res && res.item && res.item.installed_folders && res.item.installed_folders.length > 0) {
        installedIconTarget = res.item.installed_folders[0];
      }
    }
  }

  // 3. Check & Install Cursors (Bibata) with selected or preset variant
  let installedCursorTarget = null;
  if (look.cursor_id) {
    const cursorItem = catalog.findItemById(look.cursor_id, 'cursor-theme');
    const cursorVar = selectedVariants.cursor || look.cursor_variant || { style: 'modern', color: 'ice' };
    onProgress({ percent: 70, stage: 'installing_cursors', message: `Installing cursor set: ${cursorItem ? cursorItem.name : 'Cursors'}...` });
    if (cursorItem) {
      const res = await installer.installItem(cursorItem, { variant: cursorVar }, (p) => {
        onProgress({ percent: 65 + Math.round(p.percent * 0.15), stage: 'installing_cursors', message: p.message });
      });
      if (res && res.item && res.item.installed_folders && res.item.installed_folders.length > 0) {
        installedCursorTarget = res.item.installed_folders[0];
      }
    }
  }

  // 4. Download and Apply Wallpaper if specified
  const wallpaperRelOrUrl = look.wallpaper || look.wallpaper_url;
  if (wallpaperRelOrUrl) {
    onProgress({ percent: 85, stage: 'applying_wallpaper', message: 'Setting desktop wallpaper...' });
    let localWpPath = null;
    if (wallpaperRelOrUrl.startsWith('http://') || wallpaperRelOrUrl.startsWith('https://')) {
      const wallpapersDir = path.join(DOWNLOAD_CACHE, 'wallpapers');
      if (!fs.existsSync(wallpapersDir)) fs.mkdirSync(wallpapersDir, { recursive: true });
      const wpFile = path.join(wallpapersDir, `${look.id}.jpg`);
      if (!fs.existsSync(wpFile)) {
        await downloader.downloadFile(wallpaperRelOrUrl, wpFile);
      }
      localWpPath = wpFile;
    } else {
      localWpPath = path.resolve(__dirname, '../../renderer', wallpaperRelOrUrl);
    }
    if (localWpPath && fs.existsSync(localWpPath)) {
      try {
        await gnome.setWallpaper(localWpPath);
      } catch (err) {
        console.error('[Looks] Failed to set wallpaper:', err);
      }
    }
  }

  // 5. Apply GNOME Appearance
  onProgress({ percent: 95, stage: 'applying_settings', message: 'Applying desktop appearance...' });

  const targetGtk = installedGtkTarget || look.gtk_theme_name || 'Orchis-Dark-Compact';
  const targetIcon = installedIconTarget || look.icon_theme_name || 'Tela-dracula';
  const targetCursor = installedCursorTarget || look.cursor_theme_name || 'Bibata-Modern-Ice';

  if (targetGtk) {
    try {
      await gnome.setGtkTheme(targetGtk);
      await gnome.setShellTheme(targetGtk);
    } catch (_) {}
  }
  if (targetIcon) {
    try {
      await gnome.setIconTheme(targetIcon);
    } catch (_) {}
  }
  if (targetCursor) {
    try {
      await gnome.setCursorTheme(targetCursor);
    } catch (_) {}
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
