const { execFile } = require('child_process');

/**
 * Checks whether Flatpak is installed on the system.
 * @returns {Promise<boolean>}
 */
function isFlatpakInstalled() {
  return new Promise((resolve) => {
    execFile('which', ['flatpak'], (err) => {
      resolve(!err);
    });
  });
}

/**
 * Applies Flatpak overrides so sandboxed Flatpak apps can read ~/.themes, ~/.icons, and ~/.config/gtk-4.0
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
async function applyFlatpakOverride() {
  const installed = await isFlatpakInstalled();
  if (!installed) {
    return { success: false, error: 'Flatpak is not installed on this system' };
  }

  const overrides = [
    '--filesystem=xdg-config/gtk-4.0',
    '--filesystem=~/.themes',
    '--filesystem=~/.icons'
  ];

  try {
    for (const ov of overrides) {
      await new Promise((resolve, reject) => {
        execFile('flatpak', ['override', '--user', ov], (err, _stdout, stderr) => {
          if (err) {
            return reject(new Error(stderr || err.message));
          }
          resolve();
        });
      });
    }
    return { success: true, message: 'Flatpak theme filesystem overrides applied successfully' };
  } catch (err) {
    console.error('[FlatpakOverride] Apply error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Removes Flatpak filesystem overrides
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
async function removeFlatpakOverride() {
  const installed = await isFlatpakInstalled();
  if (!installed) {
    return { success: false, error: 'Flatpak is not installed on this system' };
  }

  const overrides = [
    '--nofilesystem=xdg-config/gtk-4.0',
    '--nofilesystem=~/.themes',
    '--nofilesystem=~/.icons'
  ];

  try {
    for (const ov of overrides) {
      await new Promise((resolve, reject) => {
        execFile('flatpak', ['override', '--user', ov], (err, _stdout, stderr) => {
          if (err) {
            return reject(new Error(stderr || err.message));
          }
          resolve();
        });
      });
    }
    return { success: true, message: 'Flatpak theme filesystem overrides removed successfully' };
  } catch (err) {
    console.error('[FlatpakOverride] Remove error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  isFlatpakInstalled,
  applyFlatpakOverride,
  removeFlatpakOverride
};
