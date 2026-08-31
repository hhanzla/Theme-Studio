// main/lib/gdm.js
// Complete GDM Lock Screen management: installation, uninstallation, dconf keys, blur, colors, themes, icons, logos

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const paths = require('./paths');

const GSE_GDM_UUID = 'gdm-extension@pratap.fastmail.fm';
const USER_THEMES_UUID = 'user-theme@gnome-shell-extensions.gcampax.github.com';
const GDM_SCHEMA = 'org.gnome.shell.extensions.gdm-extension';

/**
 * Execute command via pkexec with clean error and cancellation handling
 * @param {string} cmd
 * @returns {Promise<{ success: boolean, stdout?: string, stderr?: string, cancelled?: boolean, error?: string }>}
 */
function execPkexec(cmd) {
  return new Promise((resolve) => {
    exec(`pkexec ${cmd}`, { timeout: 90000 }, (err, stdout, stderr) => {
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

  // Read available system assets
  let availableThemes = [];
  let availableIcons = [];
  let availableBackgrounds = [];
  let availableLogos = [];

  try {
    if (fs.existsSync(paths.SYS_THEMES)) {
      availableThemes = fs.readdirSync(paths.SYS_THEMES).filter(f => !f.startsWith('.'));
    }
  } catch (_) {}

  try {
    if (fs.existsSync(paths.SYS_ICONS)) {
      availableIcons = fs.readdirSync(paths.SYS_ICONS).filter(f => !f.startsWith('.'));
    }
  } catch (_) {}

  try {
    if (fs.existsSync(paths.SYS_BACKGROUNDS)) {
      availableBackgrounds = fs.readdirSync(paths.SYS_BACKGROUNDS).filter(f => !f.startsWith('.'));
    }
  } catch (_) {}

  try {
    if (fs.existsSync(paths.SYS_PIXMAPS)) {
      availableLogos = fs.readdirSync(paths.SYS_PIXMAPS).filter(f => f.toLowerCase().includes('logo'));
    }
  } catch (_) {}

  // Read button hide setting from /etc/dconf/db/gdm.d/99-gdm-extension
  let hideButton = false;
  try {
    const dconfFile = '/etc/dconf/db/gdm.d/99-gdm-extension';
    if (fs.existsSync(dconfFile)) {
      const content = fs.readFileSync(dconfFile, 'utf8');
      if (/hide-gdm-extension-button\s*=\s*true/i.test(content)) {
        hideButton = true;
      }
    }
  } catch (_) {}

  return {
    success: true,
    gseGdmInstalled: isInstalled,
    gseGdmPath: installPath,
    uuid: GSE_GDM_UUID,
    availableThemes,
    availableIcons,
    availableBackgrounds,
    availableLogos,
    hideButton
  };
}

/**
 * Clones and runs the installer script for GSE-GDM Extension automatically
 */
async function installGseGdmExtension() {
  const cacheDir = path.join(os.homedir(), '.cache', 'themestudio');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const repoDir = path.join(cacheDir, 'gse-gdm-extension');

  // Clone or pull repo
  const cloneCmd = fs.existsSync(repoDir)
    ? `git -C "${repoDir}" pull`
    : `git clone --depth 1 https://github.com/pratap-panabaka/gse-gdm-extension.git "${repoDir}"`;

  try {
    await new Promise((res, rej) => {
      exec(cloneCmd, { timeout: 45000 }, (err) => (err ? rej(err) : res()));
    });
  } catch (err) {
    return { success: false, error: `Failed to clone GSE-GDM repository: ${err.message}` };
  }

  // Run installer via pkexec inside repoDir
  const installCmd = `sh -c 'cd "${repoDir}" && chmod +x install.sh && ./install.sh'`;
  const execRes = await execPkexec(installCmd);
  if (!execRes.success) {
    return execRes;
  }

  const updatedStatus = await checkGdmStatus();
  return {
    success: true,
    message: 'GSE-GDM Extension installed successfully!',
    gseGdmInstalled: updatedStatus.gseGdmInstalled
  };
}

/**
 * Uninstalls GSE-GDM Extension cleanly
 */
async function uninstallGseGdmExtension() {
  const cacheDir = path.join(os.homedir(), '.cache', 'themestudio');
  const repoDir = path.join(cacheDir, 'gse-gdm-extension');

  let uninstallCmd = '';
  if (fs.existsSync(path.join(repoDir, 'uninstall.sh'))) {
    uninstallCmd = `sh -c 'cd "${repoDir}" && chmod +x uninstall.sh && ./uninstall.sh'`;
  } else {
    uninstallCmd = `sh -c 'rm -rf "/usr/local/share/gnome-shell/extensions/${GSE_GDM_UUID}" "/usr/share/gnome-shell/extensions/${GSE_GDM_UUID}" "/etc/dconf/db/gdm.d/99-gdm-extension" && dconf update'`;
  }

  return execPkexec(uninstallCmd);
}

/**
 * Enables login screen customization for the GDM session user
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

  // 1. Enable GSE-GDM & User-Themes in GDM session
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
 * Updates full GSE-GDM configuration options in GDM dconf
 * @param {object} config - Settings object
 */
async function updateGdmConfig(config = {}) {
  const commands = [];

  // 1. Background image
  if (config.backgroundImage) {
    const bgPath = config.backgroundImage.startsWith('/') ? config.backgroundImage : path.join('/usr/share/backgrounds', config.backgroundImage);
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} background-image-path-1 "'${bgPath}'"`);
    commands.push(`sudo -u gdm dbus-run-session gsettings set org.gnome.desktop.background picture-uri "'file://${bgPath}'"`);
    commands.push(`sudo -u gdm dbus-run-session gsettings set org.gnome.desktop.background picture-uri-dark "'file://${bgPath}'"`);
  }

  // 2. Background size
  if (config.backgroundSize) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} background-size-1 "'${config.backgroundSize}'"`);
  }

  // 3. Blur radius & brightness
  if (typeof config.blurRadius === 'number') {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} blur-radius-1 ${config.blurRadius}`);
  }
  if (typeof config.blurBrightness === 'number') {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} blur-brightness-1 ${config.blurBrightness}`);
  }

  // 4. Gradient colors & direction
  if (config.primaryColor) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} primary-color-1 "'${config.primaryColor}'"`);
  }
  if (config.secondaryColor) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} secondary-color-1 "'${config.secondaryColor}'"`);
  }
  if (config.gradientDirection) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} gradient-direction-1 "'${config.gradientDirection}'"`);
  }

  // 5. Shell theme
  if (config.shellTheme) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set ${GDM_SCHEMA} shell-theme "'${config.shellTheme}'"`);
    commands.push(`sudo -u gdm dbus-run-session gsettings set org.gnome.shell.extensions.user-theme name "'${config.shellTheme}'"`);
  }

  // 6. Icon theme
  if (config.iconTheme) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set org.gnome.desktop.interface icon-theme "'${config.iconTheme}'"`);
  }

  // 7. Font name
  if (config.fontName) {
    commands.push(`sudo -u gdm dbus-run-session gsettings set org.gnome.desktop.interface font-name "'${config.fontName}'"`);
  }

  // 8. Hide / Show extension button on login screen (/etc/dconf/db/gdm.d/99-gdm-extension)
  if (typeof config.hideButton === 'boolean') {
    const dconfDir = '/etc/dconf/db/gdm.d';
    const dconfFile = path.join(dconfDir, '99-gdm-extension');
    const content = `[org/gnome/shell/extensions/gdm-extension]\nhide-gdm-extension-button=${config.hideButton}\n`;
    commands.push(`mkdir -p ${dconfDir} && printf "%s" "${content.replace(/\n/g, '\\n')}" > ${dconfFile} && dconf update`);
  }

  if (commands.length === 0) {
    return { success: true, message: 'No settings modified' };
  }

  const batchCmd = `sh -c '${commands.join(' && ')}'`;
  return execPkexec(batchCmd);
}

/**
 * Sets the GDM Shell Theme under the `gdm` user session
 */
async function setGdmShellTheme(themeName) {
  if (!themeName) return { success: false, error: 'Theme name required' };
  return updateGdmConfig({ shellTheme: themeName });
}

/**
 * Sets GDM Login Screen background image
 */
async function setGdmBackground(bgPath) {
  if (!bgPath) return { success: false, error: 'Background path required' };
  return updateGdmConfig({ backgroundImage: bgPath });
}

/**
 * Resets GDM user session appearance dconf settings to system defaults
 */
async function resetGdmToDefault() {
  const resetCmd = `sh -c 'sudo -u gdm dbus-run-session gsettings reset org.gnome.shell.extensions.user-theme name && sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.background picture-uri && sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.background picture-uri-dark && sudo -u gdm dbus-run-session gsettings reset org.gnome.desktop.interface icon-theme && sudo -u gdm dbus-run-session gsettings reset-recursively ${GDM_SCHEMA} && rm -f /etc/dconf/db/gdm.d/99-gdm-extension && dconf update'`;
  return execPkexec(resetCmd);
}

module.exports = {
  checkGdmStatus,
  installGseGdmExtension,
  uninstallGseGdmExtension,
  enableGdmCustomization,
  updateGdmConfig,
  setGdmShellTheme,
  setGdmBackground,
  resetGdmToDefault,
  execPkexec,
  GSE_GDM_UUID,
  USER_THEMES_UUID,
  GDM_SCHEMA
};
