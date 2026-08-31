// main/lib/gdm.js
// Handles GDM session enablement, GSE-GDM extension checks, and GDM user dconf configuration

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const paths = require('./paths');

const GSE_GDM_UUID = 'gdm-extension@pratap.fastmail.fm';
const USER_THEMES_UUID = 'user-theme@gnome-shell-extensions.gcampax.github.com';

/**
 * Execute command via pkexec with clean error and cancellation handling
 * @param {string} cmd
 * @returns {Promise<{ success: boolean, stdout?: string, stderr?: string, cancelled?: boolean, error?: string }>}
 */
function execPkexec(cmd) {
  return new Promise((resolve) => {
    exec(`pkexec ${cmd}`, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        const isCancelled = err.code === 126 || 
                            err.code === 127 || 
                            (stderr && /not authorized|dismissed|cancelled|canceled/i.test(stderr));
        if (isCancelled) {
          return resolve({ success: false, cancelled: true, message: 'Authentication was cancelled.' });
        }
        return resolve({ success: false, error: stderr ? stderr.trim() : err.message, code: err.code });
      }
      resolve({ success: true, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

/**
 * Checks whether GSE-GDM extension is installed in system or user paths
 */
async function checkGdmStatus() {
  const gseSystemPath = '/usr/local/share/gnome-shell/extensions/' + GSE_GDM_UUID;
  const gseAltSystemPath = '/usr/share/gnome-shell/extensions/' + GSE_GDM_UUID;
  const gseUserPath = path.join(os.homedir(), '.local/share/gnome-shell/extensions', GSE_GDM_UUID);

  const isInstalled = fs.existsSync(gseSystemPath) || fs.existsSync(gseAltSystemPath) || fs.existsSync(gseUserPath);
  const installPath = isInstalled ? (fs.existsSync(gseSystemPath) ? gseSystemPath : (fs.existsSync(gseAltSystemPath) ? gseAltSystemPath : gseUserPath)) : null;

  return {
    success: true,
    gseGdmInstalled: isInstalled,
    gseGdmPath: installPath,
    uuid: GSE_GDM_UUID
  };
}

/**
 * Enables login screen customization for the GDM session user
 * Enables GSE-GDM and User-Themes extensions under the `gdm` user session
 */
async function enableGdmCustomization() {
  const status = await checkGdmStatus();
  if (!status.gseGdmInstalled) {
    return {
      success: false,
      needInstall: true,
      error: 'GSE-GDM extension is not installed on this system.'
    };
  }

  // If installed only in user directory, copy to system directory /usr/share/gnome-shell/extensions so GDM user can access it
  const gseSystemPath = '/usr/share/gnome-shell/extensions/' + GSE_GDM_UUID;
  if (!fs.existsSync(gseSystemPath) && !fs.existsSync('/usr/local/share/gnome-shell/extensions/' + GSE_GDM_UUID)) {
    const copyRes = await execPkexec(`cp -r "${status.gseGdmPath}" "/usr/share/gnome-shell/extensions/"`);
    if (!copyRes.success) {
      return copyRes;
    }
  }

  // 1. Enable GSE-GDM extension in GDM session
  const enableCmd = `sh -c 'sudo -u gdm dbus-run-session gnome-extensions enable ${GSE_GDM_UUID} && sudo -u gdm dbus-run-session gnome-extensions enable ${USER_THEMES_UUID}'`;
  const res = await execPkexec(enableCmd);

  if (!res.success) {
    return res;
  }

  return {
    success: true,
    message: 'GDM Login Screen customization successfully enabled!'
  };
}

/**
 * Sets the GDM Shell Theme under the `gdm` user session
 * @param {string} themeName - Name of the theme located in /usr/share/themes
 */
async function setGdmShellTheme(themeName) {
  if (!themeName) return { success: false, error: 'Theme name required' };

  // Set theme key in gdm session dconf
  const cmd = `sudo -u gdm dbus-run-session gsettings set org.gnome.shell.extensions.user-theme name "${themeName}"`;
  return execPkexec(cmd);
}

/**
 * Sets GDM Login Screen background image
 * @param {string} bgPath - System background path in /usr/share/backgrounds
 */
async function setGdmBackground(bgPath) {
  if (!bgPath) return { success: false, error: 'Background path required' };

  const baseName = path.basename(bgPath);
  const sysPath = bgPath.startsWith('/usr/share') ? bgPath : path.join('/usr/share/backgrounds', baseName);

  // Set via gsettings under gdm user session
  const cmd = `sh -c 'sudo -u gdm dbus-run-session gsettings set org.gnome.desktop.background picture-uri "file://${sysPath}" && sudo -u gdm dbus-run-session gsettings set org.gnome.desktop.background picture-uri-dark "file://${sysPath}"'`;
  return execPkexec(cmd);
}

/**
 * Resets GDM user session appearance dconf settings to system defaults
 */
async function resetGdmToDefault() {
  const resetCmd = `sh -c 'sudo -u gdm dbus-run-session gsettings reset org.gnome.shell.extensions.user-theme name && sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.background picture-uri && sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.background picture-uri-dark'`;
  return execPkexec(resetCmd);
}

module.exports = {
  checkGdmStatus,
  enableGdmCustomization,
  setGdmShellTheme,
  setGdmBackground,
  resetGdmToDefault,
  execPkexec,
  GSE_GDM_UUID,
  USER_THEMES_UUID
};
