// main/lib/fixes/gdm-assets.js
// Handles copying installed themes, icons, fonts, backgrounds and logos to system directories (/usr/share/*) via pkexec

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const paths = require('../paths');

const CATEGORY_DIR_MAP = {
  'theme': paths.SYS_THEMES,
  'gtk-theme': paths.SYS_THEMES,
  'shell-theme': paths.SYS_THEMES,
  'icon': paths.SYS_ICONS,
  'icons': paths.SYS_ICONS,
  'icon-theme': paths.SYS_ICONS,
  'cursor': paths.SYS_ICONS,
  'cursors': paths.SYS_ICONS,
  'background': paths.SYS_BACKGROUNDS,
  'wallpaper': paths.SYS_BACKGROUNDS,
  'wallpapers': paths.SYS_BACKGROUNDS,
  'font': paths.SYS_FONTS,
  'fonts': paths.SYS_FONTS,
  'logo': paths.SYS_PIXMAPS
};

/**
 * Copies an asset from user directory to /usr/share/* system directory
 * @param {string} assetPath - Local path of the asset or installed folder
 * @param {string} category - Category type (theme, icon, cursor, wallpaper, font, logo)
 * @returns {Promise<{ success: boolean, targetPath?: string, cancelled?: boolean, error?: string }>}
 */
function copyToSystemDir(assetPath, category) {
  return new Promise((resolve) => {
    if (!assetPath) {
      return resolve({ success: false, error: 'No asset path provided' });
    }

    const normCategory = (category || '').toLowerCase();
    const targetDir = CATEGORY_DIR_MAP[normCategory] || paths.SYS_THEMES;

    // Check if source exists
    if (!fs.existsSync(assetPath)) {
      return resolve({ success: false, error: `Source asset not found: ${assetPath}` });
    }

    const baseName = path.basename(assetPath);
    let destPath = path.join(targetDir, baseName);

    // Build pkexec copy command
    let cmd = `pkexec cp -r "${assetPath}" "${targetDir}/"`;

    // Special logo rule: If category is logo and filename does not contain "logo", rename it
    if (normCategory === 'logo' && !baseName.toLowerCase().includes('logo')) {
      const ext = path.extname(baseName);
      const rawName = path.basename(baseName, ext);
      const newLogoName = `${rawName}-logo${ext}`;
      destPath = path.join(targetDir, newLogoName);
      cmd = `pkexec sh -c 'cp -r "${assetPath}" "${destPath}"'`;
    }

    exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        // Check for pkexec cancellation / dismissed password dialog
        const isCancelled = err.code === 126 || 
                            err.code === 127 || 
                            (stderr && /not authorized|dismissed|cancelled|canceled/i.test(stderr));
        if (isCancelled) {
          return resolve({ success: false, cancelled: true, message: 'Authentication was cancelled.' });
        }
        return resolve({ 
          success: false, 
          error: stderr ? stderr.trim() : err.message,
          code: err.code 
        });
      }

      resolve({
        success: true,
        targetPath: destPath,
        message: `Asset successfully copied to ${destPath}`
      });
    });
  });
}

module.exports = {
  copyToSystemDir,
  CATEGORY_DIR_MAP
};
