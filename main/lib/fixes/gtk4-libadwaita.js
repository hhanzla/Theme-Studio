const fs = require('fs');
const path = require('path');
const { GTK4_CONFIG } = require('../paths');

/**
 * Applies the GTK4 / Libadwaita symlink fix for themes that contain a gtk-4.0/ directory.
 * @param {string} themeDir - Absolute path to the installed theme directory
 * @returns {{ applied: boolean, message?: string }}
 */
function applyGtk4Fix(themeDir) {
  if (!themeDir || !fs.existsSync(themeDir)) {
    return { applied: false, message: 'Theme directory does not exist' };
  }

  const themeGtk4Dir = path.join(themeDir, 'gtk-4.0');
  if (!fs.existsSync(themeGtk4Dir)) {
    // Theme does not provide gtk-4.0 styles, skip silently
    return { applied: false, message: 'No gtk-4.0 folder in theme' };
  }

  // Ensure ~/.config/gtk-4.0 exists
  if (!fs.existsSync(GTK4_CONFIG)) {
    fs.mkdirSync(GTK4_CONFIG, { recursive: true });
  }

  // 1. Resolve and link assets directory (check gtk-4.0/assets first, fallback to theme-root/assets)
  const assetsSrc = fs.existsSync(path.join(themeGtk4Dir, 'assets'))
    ? path.join(themeGtk4Dir, 'assets')
    : (fs.existsSync(path.join(themeDir, 'assets')) ? path.join(themeDir, 'assets') : null);

  const destAssets = path.join(GTK4_CONFIG, 'assets');
  try {
    if (fs.existsSync(destAssets) || fs.lstatSync(destAssets).isSymbolicLink()) {
      fs.rmSync(destAssets, { recursive: true, force: true });
    }
  } catch (_) {}

  if (assetsSrc && fs.existsSync(assetsSrc)) {
    try {
      fs.symlinkSync(assetsSrc, destAssets);
    } catch (err) {
      console.error(`[GTK4 Fix] Failed to symlink assets:`, err);
    }
  }

  // 2. Write/link gtk.css and gtk-dark.css with relative asset path correction
  const cssTargets = ['gtk.css', 'gtk-dark.css'];

  for (const item of cssTargets) {
    const srcItemPath = path.join(themeGtk4Dir, item);
    const destItemPath = path.join(GTK4_CONFIG, item);

    // Remove existing file/symlink/dir in ~/.config/gtk-4.0
    try {
      if (fs.existsSync(destItemPath) || fs.lstatSync(destItemPath).isSymbolicLink()) {
        fs.rmSync(destItemPath, { recursive: true, force: true });
      }
    } catch (_) {
      // Ignore if doesn't exist
    }

    // Process CSS
    if (fs.existsSync(srcItemPath)) {
      try {
        let cssContent = fs.readFileSync(srcItemPath, 'utf8');
        // Rewrite ../assets/ to assets/ so it resolves to ~/.config/gtk-4.0/assets
        cssContent = cssContent.replace(/url\(["']?\.\.\/assets\//g, 'url("assets/');
        fs.writeFileSync(destItemPath, cssContent, 'utf8');
      } catch (err) {
        try {
          fs.symlinkSync(srcItemPath, destItemPath);
        } catch (_) {}
      }
    }
  }

  return { applied: true, message: 'GTK4 symlinks updated successfully' };
}

/**
 * Reverts GTK4 / Libadwaita symlinks if they point to the given theme directory, or cleans all if null.
 * @param {string} [themeDir] - Absolute path to the theme being removed. If omitted, cleans all symlinks.
 */
function removeGtk4Fix(themeDir = null) {
  if (!fs.existsSync(GTK4_CONFIG)) return;

  const targets = ['gtk.css', 'gtk-dark.css', 'assets'];

  for (const item of targets) {
    const destItemPath = path.join(GTK4_CONFIG, item);
    try {
      if (fs.existsSync(destItemPath) || fs.lstatSync(destItemPath).isSymbolicLink()) {
        fs.rmSync(destItemPath, { recursive: true, force: true });
      }
    } catch (_) {
      // Ignore if file doesn't exist
    }
  }
}

module.exports = {
  applyGtk4Fix,
  removeGtk4Fix
};
