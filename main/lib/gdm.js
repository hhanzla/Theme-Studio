// main/lib/gdm.js
// Complete GDM Lock Screen Management: In-depth DConf, Schema Compilation, Visuals, Themes, Fonts, Clock & Banner Message

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const paths = require('./paths');

const GSE_GDM_UUID = 'gdm-extension@pratap.fastmail.fm';
const USER_THEMES_UUID = 'user-theme@gnome-shell-extensions.gcampax.github.com';
const DCONF_GDM_FILE = '/etc/dconf/db/gdm.d/01-themestudio';

/**
 * Execute command via pkexec with clean cancellation handling
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
 * Reads all system assets & current GDM dconf settings
 */
async function checkGdmStatus() {
  const gseSystemPath = '/usr/local/share/gnome-shell/extensions/' + GSE_GDM_UUID;
  const gseAltSystemPath = '/usr/share/gnome-shell/extensions/' + GSE_GDM_UUID;
  const gseUserPath = path.join(os.homedir(), '.local/share/gnome-shell/extensions', GSE_GDM_UUID);

  const isInstalled = fs.existsSync(gseSystemPath) || fs.existsSync(gseAltSystemPath) || fs.existsSync(gseUserPath);
  const installPath = isInstalled ? (fs.existsSync(gseSystemPath) ? gseSystemPath : (fs.existsSync(gseAltSystemPath) ? gseAltSystemPath : gseUserPath)) : null;

  // 1. Scan available Backgrounds
  let availableBackgrounds = [];
  const bgDirs = ['/usr/share/backgrounds', '/usr/local/share/backgrounds'];
  for (const dir of bgDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir).filter(f => f.match(/\.(jpg|jpeg|png|webp|svg)$/i));
        files.forEach(f => {
          const full = path.join(dir, f);
          if (!availableBackgrounds.includes(full)) availableBackgrounds.push(full);
        });
      } catch (_) {}
    }
  }

  // 2. Scan Shell Themes
  let availableThemes = [];
  const themeDirs = ['/usr/share/themes', '/usr/local/share/themes'];
  for (const dir of themeDirs) {
    if (fs.existsSync(dir)) {
      try {
        const folders = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
        folders.forEach(f => {
          if (!availableThemes.includes(f)) availableThemes.push(f);
        });
      } catch (_) {}
    }
  }

  // 3. Scan Icon Themes
  let availableIcons = [];
  const iconDirs = ['/usr/share/icons', '/usr/local/share/icons'];
  for (const dir of iconDirs) {
    if (fs.existsSync(dir)) {
      try {
        const folders = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
        folders.forEach(f => {
          if (!availableIcons.includes(f)) availableIcons.push(f);
        });
      } catch (_) {}
    }
  }

  // 4. Scan Logos
  let availableLogos = [];
  const pixDirs = ['/usr/share/pixmaps', '/usr/local/share/pixmaps'];
  for (const dir of pixDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes('logo') && f.match(/\.(png|svg|jpg)$/i));
        files.forEach(f => {
          const full = path.join(dir, f);
          if (!availableLogos.includes(full)) availableLogos.push(full);
        });
      } catch (_) {}
    }
  }

  // 5. Read current settings from /etc/dconf/db/gdm.d/01-themestudio
  const settings = {
    backgroundImage: '',
    blurRadius: 0,
    blurBrightness: 0.65,
    backgroundSize: 'cover',
    primaryColor: '#cf4110',
    secondaryColor: '#18181b',
    gradientDirection: 'none',
    shellTheme: '',
    iconTheme: '',
    logo: '',
    bannerMessageEnable: false,
    bannerMessageText: '',
    clockShowDate: true,
    clockShowSeconds: false,
    clockShowWeekday: true,
    showBatteryPercentage: true,
    tapToClick: true,
    hideButton: false
  };

  if (fs.existsSync(DCONF_GDM_FILE)) {
    try {
      const content = fs.readFileSync(DCONF_GDM_FILE, 'utf8');
      const getVal = (key) => {
        const match = content.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
        return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
      };

      if (getVal('background-image-path-1')) settings.backgroundImage = getVal('background-image-path-1');
      if (getVal('blur-radius-1')) settings.blurRadius = parseInt(getVal('blur-radius-1'), 10) || 0;
      if (getVal('blur-brightness-1')) settings.blurBrightness = parseFloat(getVal('blur-brightness-1')) || 0.65;
      if (getVal('background-size-1')) settings.backgroundSize = getVal('background-size-1');
      if (getVal('primary-color-1')) settings.primaryColor = getVal('primary-color-1');
      if (getVal('secondary-color-1')) settings.secondaryColor = getVal('secondary-color-1');
      if (getVal('gradient-direction-1')) settings.gradientDirection = getVal('gradient-direction-1');
      if (getVal('shell-theme')) settings.shellTheme = getVal('shell-theme');
      if (getVal('icon-theme')) settings.iconTheme = getVal('icon-theme');
      if (getVal('logo')) settings.logo = getVal('logo');
      if (getVal('banner-message-enable')) settings.bannerMessageEnable = getVal('banner-message-enable') === 'true';
      if (getVal('banner-message-text')) settings.bannerMessageText = getVal('banner-message-text');
      if (getVal('clock-show-date')) settings.clockShowDate = getVal('clock-show-date') === 'true';
      if (getVal('clock-show-seconds')) settings.clockShowSeconds = getVal('clock-show-seconds') === 'true';
      if (getVal('clock-show-weekday')) settings.clockShowWeekday = getVal('clock-show-weekday') === 'true';
      if (getVal('show-battery-percentage')) settings.showBatteryPercentage = getVal('show-battery-percentage') === 'true';
      if (getVal('tap-to-click')) settings.tapToClick = getVal('tap-to-click') === 'true';
      if (getVal('hide-gdm-extension-button')) settings.hideButton = getVal('hide-gdm-extension-button') === 'true';
    } catch (_) {}
  }

  return {
    success: true,
    gseGdmInstalled: isInstalled,
    gseGdmPath: installPath,
    uuid: GSE_GDM_UUID,
    availableBackgrounds,
    availableThemes,
    availableIcons,
    availableLogos,
    settings
  };
}

/**
 * 1-Click Install GSE-GDM Extension directly from project repo or pull latest
 */
function getGseGdmSourceDir() {
  const devDir = path.resolve(__dirname, '../../gse-gdm-extension');
  const extraDir = process.resourcesPath ? path.join(process.resourcesPath, 'gse-gdm-extension') : null;
  const unpackedDir = process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'gse-gdm-extension') : null;
  const cacheDir = path.join(os.homedir(), '.cache', 'themestudio', 'gse-gdm-extension');

  const candidates = [devDir, extraDir, unpackedDir, cacheDir].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'install.sh'))) {
      return dir;
    }
  }
  return cacheDir;
}

/**
 * 1-Click Install GSE-GDM Extension directly from project repo or pull latest
 */
async function installGseGdmExtension() {
  let repoDir = getGseGdmSourceDir();

  if (!fs.existsSync(repoDir) || !fs.existsSync(path.join(repoDir, 'install.sh'))) {
    const cacheRepoDir = path.join(os.homedir(), '.cache', 'themestudio', 'gse-gdm-extension');
    try {
      await new Promise((res, rej) => {
        exec(`git clone --depth 1 https://github.com/pratap-panabaka/gse-gdm-extension.git "${cacheRepoDir}"`, { timeout: 45000 }, (err) => (err ? rej(err) : res()));
      });
      repoDir = cacheRepoDir;
    } catch (err) {
      return { success: false, error: `Failed to clone repository: ${err.message}` };
    }
  }

  const scriptContent = `#!/bin/bash
set -e
cd "${repoDir}"
chmod +x install.sh
./install.sh

cp -f src/v-45-46-47-48-49-50/schemas/*.xml /usr/share/glib-2.0/schemas/ 2>/dev/null || true
glib-compile-schemas /usr/share/glib-2.0/schemas/ 2>/dev/null || true
dconf update
`;

  const scriptPath = path.join(os.tmpdir(), 'themestudio_gdm_install.sh');
  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  const res = await execPkexec(`/bin/bash "${scriptPath}"`);
  try { fs.unlinkSync(scriptPath); } catch (_) {}

  if (!res.success) return res;

  // Auto-sync currently installed themes and active wallpaper
  await syncAssetsToSystem().catch(() => {});

  if (!res.success) return res;

  const status = await checkGdmStatus();
  return {
    success: true,
    message: 'GSE-GDM Extension and system themes/wallpapers synced successfully!',
    gseGdmInstalled: status.gseGdmInstalled
  };
}

/**
 * Synchronizes ONLY currently installed themes, installed icons, and currently applied wallpaper into /usr/local/share/
 */
async function syncAssetsToSystem() {
  const gnome = require('./gnome');
  const userThemes = path.join(os.homedir(), '.themes');
  const userIcons = path.join(os.homedir(), '.icons');

  // Get current active wallpaper file
  let currentWpPath = '';
  try {
    const current = await gnome.getCurrentSettings();
    if (current && current.wallpaper) {
      let raw = current.wallpaper;
      if (raw.startsWith('file://')) raw = decodeURIComponent(raw.replace('file://', ''));
      if (fs.existsSync(raw)) currentWpPath = raw;
    }
  } catch (_) {}

  // If not found from gsettings, look for applied wallpaper in ~/.local/share/backgrounds
  if (!currentWpPath) {
    const bgDir = path.join(os.homedir(), '.local', 'share', 'backgrounds');
    if (fs.existsSync(bgDir)) {
      try {
        const files = fs.readdirSync(bgDir).filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
        if (files.length > 0) currentWpPath = path.join(bgDir, files[0]);
      } catch (_) {}
    }
  }

  const scriptContent = `#!/bin/bash
set -e
mkdir -p /usr/local/share/themes /usr/local/share/icons /usr/local/share/backgrounds /usr/local/share/fonts /usr/local/share/pixmaps /usr/share/backgrounds

# 1. Clean previous sync folders so uninstalled/stale assets are removed
rm -rf /usr/local/share/themes/* /usr/local/share/icons/* /usr/local/share/backgrounds/* 2>/dev/null || true

# 2. Sync Installed Themes only (exclude mock/test)
if [ -d "${userThemes}" ]; then
  find "${userThemes}" -mindepth 1 -maxdepth 1 -type d ! -name "mock-*" -exec cp -rf {} /usr/local/share/themes/ \\; 2>/dev/null || true
fi

# 3. Sync Installed Icons only
if [ -d "${userIcons}" ]; then
  find "${userIcons}" -mindepth 1 -maxdepth 1 -type d -exec cp -rf {} /usr/local/share/icons/ \\; 2>/dev/null || true
fi

# 4. Sync ONLY the currently applied wallpaper image (never copy thumbnails folder!)
if [ -n "${currentWpPath}" ] && [ -f "${currentWpPath}" ]; then
  cp -f "${currentWpPath}" /usr/local/share/backgrounds/ 2>/dev/null || true
  cp -f "${currentWpPath}" /usr/share/backgrounds/ 2>/dev/null || true
fi

# 5. Ensure read permissions for GDM
chmod -R a+rX /usr/local/share/themes /usr/local/share/icons /usr/local/share/backgrounds /usr/share/backgrounds 2>/dev/null || true
`;

  const scriptPath = path.join(os.tmpdir(), 'themestudio_gdm_sync.sh');
  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  const res = await execPkexec(`/bin/bash "${scriptPath}"`);
  try { fs.unlinkSync(scriptPath); } catch (_) {}

  if (!res.success) return res;

  return {
    success: true,
    message: 'Successfully synced installed themes, icons, and applied wallpaper to GDM!'
  };
}

/**
 * 1-Click Clean Uninstall of GSE-GDM Extension & all synced system folders
 */
async function uninstallGseGdmExtension() {
  const scriptContent = `#!/bin/bash
set -e
# 1. Remove GSE-GDM extension
rm -rf "/usr/local/share/gnome-shell/extensions/${GSE_GDM_UUID}" "/usr/share/gnome-shell/extensions/${GSE_GDM_UUID}" 2>/dev/null || true

# 2. Clean all copied system assets folders created for GDM
rm -rf /usr/local/share/themes /usr/local/share/icons /usr/local/share/backgrounds 2>/dev/null || true

# 3. Clean dconf configurations
rm -f "${DCONF_GDM_FILE}" "/etc/dconf/db/gdm.d/99-gdm-extension" 2>/dev/null || true
rm -f /usr/share/glib-2.0/schemas/org.gnome.shell.extensions.gdm-extension.gschema.xml 2>/dev/null || true

# 4. Recompile schemas & update dconf
glib-compile-schemas /usr/share/glib-2.0/schemas/ 2>/dev/null || true
dconf update 2>/dev/null || true
`;

  const scriptPath = path.join(os.tmpdir(), 'themestudio_gdm_uninstall.sh');
  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  const res = await execPkexec(`/bin/bash "${scriptPath}"`);
  try { fs.unlinkSync(scriptPath); } catch (_) {}
  return res;
}

/**
 * Enable login screen customization for GDM session user
 */
async function enableGdmCustomization() {
  const status = await checkGdmStatus();
  if (!status.gseGdmInstalled) {
    return { success: false, needInstall: true, error: 'GSE-GDM extension is not installed.' };
  }

  const enableCmd = `sh -c 'sudo -u gdm dbus-run-session gnome-extensions enable ${GSE_GDM_UUID} 2>/dev/null || sudo -u gdm3 dbus-run-session gnome-extensions enable ${GSE_GDM_UUID} 2>/dev/null || true; sudo -u gdm dbus-run-session gnome-extensions enable ${USER_THEMES_UUID} 2>/dev/null || sudo -u gdm3 dbus-run-session gnome-extensions enable ${USER_THEMES_UUID} 2>/dev/null || true'`;
  return execPkexec(enableCmd);
}

/**
 * Saves complete GDM settings into /etc/dconf/db/gdm.d/01-themestudio and updates dconf
 * @param {object} cfg - Settings payload
 */
async function saveGdmFullSettings(cfg = {}) {
  const bgPath = cfg.backgroundImage || '';
  const blurRad = typeof cfg.blurRadius === 'number' ? cfg.blurRadius : 0;
  const blurBright = typeof cfg.blurBrightness === 'number' ? cfg.blurBrightness : 0.65;
  const bgSize = cfg.backgroundSize || 'cover';
  const pColor = cfg.primaryColor || '#cf4110';
  const sColor = cfg.secondaryColor || '#18181b';
  const gradDir = cfg.gradientDirection || (bgPath ? 'none' : 'horizontal');
  const themeName = cfg.shellTheme || '';
  const iconName = cfg.iconTheme || '';
  const logoPath = cfg.logo || '';
  const bannerEnable = !!cfg.bannerMessageEnable;
  const bannerText = cfg.bannerMessageText || '';
  const showDate = cfg.clockShowDate !== false;
  const showSec = !!cfg.clockShowSeconds;
  const showWk = cfg.clockShowWeekday !== false;
  const showBat = cfg.showBatteryPercentage !== false;
  const tapClick = cfg.tapToClick !== false;
  const hideBtn = !!cfg.hideButton;

  // Build the complete multi-section dconf keyfile
  const keyfileLines = [
    `# Theme Studio GDM Configuration`,
    `[org/gnome/shell/extensions/gdm-extension]`,
    `background-image-path-1='${bgPath || 'none'}'`,
    `blur-radius-1=${blurRad}`,
    `blur-brightness-1=${blurBright}`,
    `background-size-1='${bgSize}'`,
    `primary-color-1='${pColor}'`,
    `secondary-color-1='${sColor}'`,
    `gradient-direction-1='${gradDir}'`,
    `shell-theme='${themeName}'`,
    `hide-gdm-extension-button=${hideBtn}`,
    ``,
    `[org/gnome/login-screen]`,
    `banner-message-enable=${bannerEnable}`,
    `banner-message-text='${bannerText}'`,
    `logo='${logoPath}'`,
    ``,
    `[org/gnome/desktop/interface]`,
    `clock-show-date=${showDate}`,
    `clock-show-seconds=${showSec}`,
    `clock-show-weekday=${showWk}`,
    `show-battery-percentage=${showBat}`,
    iconName ? `icon-theme='${iconName}'` : ``,
    ``,
    `[org/gnome/desktop/peripherals/touchpad]`,
    `tap-to-click=${tapClick}`,
    ``,
    `[org/gnome/shell/extensions/user-theme]`,
    `name='${themeName}'`,
    ``,
    `[org/gnome/desktop/background]`,
    bgPath ? `picture-uri='file://${bgPath}'` : ``,
    bgPath ? `picture-uri-dark='file://${bgPath}'` : ``
  ].filter(l => l !== null);

  const fileContent = keyfileLines.join('\n');
  const tempPath = path.join(os.tmpdir(), `themestudio_gdm_${Date.now()}.conf`);
  fs.writeFileSync(tempPath, fileContent, 'utf8');

  // Copy keyfile to /etc/dconf/db/gdm.d/01-themestudio and compile schemas & dconf update
  const applyCmd = `sh -c 'mkdir -p /etc/dconf/db/gdm.d && cp -f "${tempPath}" "${DCONF_GDM_FILE}" && rm -f "${tempPath}" && dconf update'`;
  
  const res = await execPkexec(applyCmd);
  if (!res.success) return res;

  return {
    success: true,
    message: 'GDM Login Screen settings applied successfully!'
  };
}

/**
 * Resets GDM user session appearance dconf settings to system defaults
 */
async function resetGdmToDefault() {
  const resetCmd = `sh -c 'rm -f "${DCONF_GDM_FILE}" "/etc/dconf/db/gdm.d/99-gdm-extension" && dconf update && sudo -u gdm dbus-run-session gsettings reset org.gnome.shell.extensions.user-theme name 2>/dev/null || true'`;
  return execPkexec(resetCmd);
}

module.exports = {
  checkGdmStatus,
  installGseGdmExtension,
  uninstallGseGdmExtension,
  enableGdmCustomization,
  syncAssetsToSystem,
  saveGdmFullSettings,
  updateGdmConfig: saveGdmFullSettings,
  setGdmShellTheme: (name) => name ? saveGdmFullSettings({ shellTheme: name }) : Promise.resolve({ success: false, error: 'Theme name required' }),
  setGdmBackground: (bg) => bg ? saveGdmFullSettings({ backgroundImage: bg }) : Promise.resolve({ success: false, error: 'Background path required' }),
  resetGdmToDefault,
  execPkexec,
  GSE_GDM_UUID,
  USER_THEMES_UUID,
  DCONF_GDM_FILE
};
