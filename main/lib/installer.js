const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { HOME, GTK_THEMES, ICON_THEMES, DOWNLOAD_CACHE } = require('./paths');
const downloader = require('./downloader');
const stateStore = require('./state-store');
const { applyGtk4Fix } = require('./fixes/gtk4-libadwaita');

const activeInstallations = new Map();

/**
 * Cancels an active installation (download, git clone, or script execution)
 * @param {string} id
 * @returns {boolean}
 */
function cancelInstall(id) {
  let wasActive = false;
  if (activeInstallations.has(id)) {
    wasActive = true;
    const tracker = activeInstallations.get(id);
    activeInstallations.delete(id);
    if (typeof tracker.cancel === 'function') {
      try {
        tracker.cancel();
      } catch (_) {}
    }
  }

  // Always cancel any active download/git process
  downloader.cancelDownload(id);

  // Clear all cache folders and archives for this id
  try {
    const repoCache = path.join(DOWNLOAD_CACHE, 'repos', id);
    if (fs.existsSync(repoCache)) {
      fs.rmSync(repoCache, { recursive: true, force: true });
    }
    const zipCache = path.join(DOWNLOAD_CACHE, `${id}.zip`);
    if (fs.existsSync(zipCache)) {
      fs.unlinkSync(zipCache);
    }
    const extractCache = path.join(DOWNLOAD_CACHE, 'extract', id);
    if (fs.existsSync(extractCache)) {
      fs.rmSync(extractCache, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[Installer] Error cleaning cache for ${id}:`, err);
  }

  return wasActive;
}

/**
 * Resolves a target directory path (e.g. replacing ~ with HOME)
 * @param {string} targetDir
 * @param {string} category
 * @returns {string}
 */
function resolveTargetDir(targetDir, category) {
  if (!targetDir) {
    if (category === 'gtk-theme') return GTK_THEMES;
    if (category === 'icon-theme' || category === 'cursor-theme') return ICON_THEMES;
    return path.join(HOME, '.themes');
  }
  if (targetDir.startsWith('~/')) {
    return path.join(HOME, targetDir.slice(2));
  }
  if (targetDir === '~') {
    return HOME;
  }
  return targetDir;
}

/**
 * Checks if a directory contains theme markers
 * @param {string} dirPath
 * @returns {boolean}
 */
function isThemeDirectory(dirPath) {
  try {
    if (!fs.statSync(dirPath).isDirectory()) return false;
    const contents = fs.readdirSync(dirPath);
    return (
      contents.includes('index.theme') ||
      contents.includes('gtk-3.0') ||
      contents.includes('gtk-4.0') ||
      contents.includes('cursors') ||
      contents.includes('gnome-shell')
    );
  } catch (_) {
    return false;
  }
}

/**
 * Finds all theme subdirectories inside an extracted folder
 * @param {string} extractedDir
 * @returns {string[]} - Array of absolute paths to theme directories
 */
function findThemeDirectories(extractedDir) {
  const themeDirs = [];

  // Check top level
  if (isThemeDirectory(extractedDir)) {
    themeDirs.push(extractedDir);
    return themeDirs;
  }

  // Scan 1-level deep
  const items = fs.readdirSync(extractedDir);
  for (const item of items) {
    const itemPath = path.join(extractedDir, item);
    try {
      if (fs.statSync(itemPath).isDirectory()) {
        if (isThemeDirectory(itemPath)) {
          themeDirs.push(itemPath);
        } else {
          // Scan 2-levels deep (for repos with subfolders like Papirus-master/Papirus)
          const subItems = fs.readdirSync(itemPath);
          for (const subItem of subItems) {
            const subItemPath = path.join(itemPath, subItem);
            try {
              if (fs.statSync(subItemPath).isDirectory() && isThemeDirectory(subItemPath)) {
                themeDirs.push(subItemPath);
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  // If no structured theme directories found, fallback to subfolders or top directory
  if (themeDirs.length === 0) {
    for (const item of items) {
      const itemPath = path.join(extractedDir, item);
      try {
        if (fs.statSync(itemPath).isDirectory()) {
          themeDirs.push(itemPath);
        }
      } catch (_) {}
    }
  }

  if (themeDirs.length === 0) {
    themeDirs.push(extractedDir);
  }

  return themeDirs;
}

/**
 * Copies a directory recursively
 * @param {string} src
 * @param {string} dest
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      try {
        const linkTarget = fs.readlinkSync(srcPath);
        if (fs.existsSync(destPath)) fs.rmSync(destPath, { recursive: true, force: true });
        fs.symlinkSync(linkTarget, destPath);
      } catch (err) {
        console.error(`[CopyDir] Symlink error on ${destPath}:`, err);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Installs a zip-static catalog item
 * @param {object} item - Catalog item object
 * @param {function} onProgress - Callback ({ percent, stage, message })
 * @returns {Promise<object>} - Result object
 */
async function installZipStatic(item, onProgress = () => {}, options = {}) {
  const targetDir = resolveTargetDir(item.target_dir, item.category);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (!fs.existsSync(DOWNLOAD_CACHE)) {
    fs.mkdirSync(DOWNLOAD_CACHE, { recursive: true });
  }

  let zipUrl = item.source && (item.source.zip_url || item.source.url);
  const variant = options.variant || {};

  if (item.source && item.source.variant_urls) {
    const keyCombo = Object.values(variant).filter(v => v && v !== 'all').join('-');
    const simpleKey = variant.color || variant.mode || variant.style || variant.accent;
    zipUrl = item.source.variant_urls[keyCombo] || 
             item.source.variant_urls[simpleKey] || 
             item.source.variant_urls['all'] || 
             zipUrl;
  } else if (item.source && item.source.url_template && variant.color) {
    zipUrl = item.source.url_template.replace(/\{color\}/g, variant.color);
  }

  if (!zipUrl) {
    throw new Error(`Catalog item "${item.id}" does not have a valid zip_url in source`);
  }

  const variantValues = Object.values(variant).filter(Boolean);
  const variantSlug = variantValues.length > 0 ? `-${variantValues.join('-')}` : '';
  const isTarXz = zipUrl.endsWith('.tar.xz') || zipUrl.endsWith('.tar.gz') || zipUrl.endsWith('.tar');
  const fileExt = isTarXz ? (zipUrl.endsWith('.tar.gz') ? '.tar.gz' : '.tar.xz') : '.zip';
  const archivePath = path.join(DOWNLOAD_CACHE, `${item.id}${variantSlug}${fileExt}`);
  const extractTempDir = path.join(DOWNLOAD_CACHE, 'temp_extract', `${item.id}${variantSlug}`);

  try {
    // 1. Download (or use cache if present)
    if (fs.existsSync(archivePath) && fs.statSync(archivePath).size > 1024) {
      onProgress({ id: item.id, percent: 75, stage: 'downloading', message: 'Using cached archive...' });
    } else {
      onProgress({ id: item.id, percent: 0, stage: 'downloading', message: 'Connecting...' });

      const approxBytes = item.source && (item.source.approx_bytes || item.source.size_bytes || 0);
      await downloader.downloadFile(zipUrl, archivePath, (percent, downloaded, total, msg) => {
        // Map download 0..100 to overall 5..75%
        const overallPercent = Math.round(5 + (percent * 0.7));
        onProgress({ id: item.id, percent: overallPercent, stage: 'downloading', message: msg || `Downloading (${percent}%)...` });
      }, item.id, approxBytes);
    }

    // 2. Extract
    onProgress({ id: item.id, percent: 80, stage: 'extracting', message: 'Extracting archive...' });

    if (fs.existsSync(extractTempDir)) {
      fs.rmSync(extractTempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(extractTempDir, { recursive: true });

    if (isTarXz) {
      await downloader.extractTar(archivePath, extractTempDir);
    } else {
      await downloader.extractZip(archivePath, extractTempDir);
    }

    // 3. Locate theme directories and install into targetDir
    onProgress({ id: item.id, percent: 90, stage: 'applying', message: 'Installing files...' });

    const themeFolders = findThemeDirectories(extractTempDir);
    if (themeFolders.length === 0) {
      throw new Error(`Could not find valid theme directory in extracted archive for "${item.id}"`);
    }

    const installedFolderNames = [];
    let primaryInstalledPath = null;

    for (const folder of themeFolders) {
      let destFolderName = path.basename(folder);
      if (destFolderName.endsWith('-master') || destFolderName.endsWith('-main')) {
        destFolderName = destFolderName.replace(/-(master|main)$/, '');
      }
      if (destFolderName === 'temp_extract' || destFolderName === item.id) {
        destFolderName = item.name.replace(/\s+/g, '-');
      }
      const destPath = path.join(targetDir, destFolderName);

      // Remove existing installation of same folder if any
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      copyDirRecursive(folder, destPath);
      installedFolderNames.push(destFolderName);

      if (!primaryInstalledPath) {
        primaryInstalledPath = destPath;
      }

      if (item.category === 'icon-theme' || item.category === 'cursor-theme') {
        try {
          const { execFile: execF } = require('child_process');
          execF('gtk-update-icon-cache', [destPath], () => {});
        } catch (_) {}
      }
    }

    // 4. Run GTK4 fix if requested
    if (item.gtk4_fix && primaryInstalledPath) {
      onProgress({ id: item.id, percent: 96, stage: 'applying_fixes', message: 'Applying GTK4 Libadwaita fix...' });
      applyGtk4Fix(primaryInstalledPath);
    }

    // 5. Update state store
    const installedRecord = stateStore.addInstalled({
      id: item.id,
      name: item.name,
      category: item.category,
      install_type: item.install_type,
      variant: options.variant || {},
      target_dir: targetDir,
      installed_folders: installedFolderNames,
      primary_path: primaryInstalledPath,
      gtk4_fix_applied: !!item.gtk4_fix
    });

    // Auto-register companion GTK / Shell theme if available
    registerCompanionThemes(item, targetDir, installedFolderNames, primaryInstalledPath);

    // 6. Clean temporary extraction directory
    try {
      if (fs.existsSync(extractTempDir)) {
        fs.rmSync(extractTempDir, { recursive: true, force: true });
      }
    } catch (_) {}

    onProgress({ id: item.id, percent: 100, stage: 'completed', message: 'Installation complete!' });

    return {
      success: true,
      item: installedRecord
    };
  } catch (err) {
    onProgress({ id: item.id, percent: 0, stage: 'error', message: err.message });
    throw err;
  }
}

/**
 * Installs a script-based catalog item via git clone and script execution
 * @param {object} item - Catalog item object
 * @param {object} options - Options including variant ({ color, mode })
 * @param {function} onProgress - Callback ({ percent, stage, message })
 * @returns {Promise<object>} - Result object
 */
async function installScript(item, options = {}, onProgress = () => {}) {
  const targetDir = resolveTargetDir(item.target_dir, item.category);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (!fs.existsSync(DOWNLOAD_CACHE)) {
    fs.mkdirSync(DOWNLOAD_CACHE, { recursive: true });
  }

  const repoUrl = item.source && (item.source.repo || item.source.url);
  if (!repoUrl) {
    throw new Error(`Catalog item "${item.id}" does not have a valid git repo URL in source`);
  }

  const reposDir = path.join(DOWNLOAD_CACHE, 'repos');
  if (!fs.existsSync(reposDir)) {
    fs.mkdirSync(reposDir, { recursive: true });
  }
  const cloneDir = path.join(reposDir, item.id);

  const tracker = {
    proc: null,
    isCancelled: false
  };
  tracker.cancel = () => {
    tracker.isCancelled = true;
    if (tracker.proc) {
      try { tracker.proc.kill('SIGTERM'); } catch (_) {}
      setTimeout(() => {
        try { if (tracker.proc) tracker.proc.kill('SIGKILL'); } catch (_) {}
      }, 400);
    }
  };
  activeInstallations.set(item.id, tracker);

  try {
    // 1. Git Clone / Update
    onProgress({ id: item.id, percent: 0, stage: 'cloning_repo', message: 'Connecting...' });

    await downloader.gitClone(repoUrl, cloneDir, (percent, msg) => {
      onProgress({ id: item.id, percent: percent, stage: 'cloning_repo', message: msg });
    }, item.id);

    if (tracker.isCancelled) {
      throw new Error('Installation cancelled by user');
    }

    // 2. Prepare script arguments from template
    onProgress({ id: item.id, percent: 65, stage: 'running_script', message: 'Preparing installation...' });

    let argsTemplate = item.install_args_template || '';
    const variant = options.variant || {};

    const targetDestDir = (item.category === 'icon-theme' || item.category === 'cursor-theme') ? ICON_THEMES : GTK_THEMES;
    argsTemplate = argsTemplate.replace(/\{dest_dir\}/g, targetDestDir);

    // Substitute selected variant values
    for (const [vKey, vVal] of Object.entries(variant)) {
      if (vKey === 'tweaks') {
        const flagVal = (vVal && vVal !== 'none' && vVal !== 'default') ? `--tweaks ${vVal}` : '';
        argsTemplate = argsTemplate.replace(/\{tweaks\}/g, flagVal);
      } else if (vKey === 'icon') {
        const hasFlag = argsTemplate.includes('-i {icon}');
        const flagVal = (vVal && vVal !== 'none' && vVal !== 'default') 
          ? (hasFlag ? vVal : `-i ${vVal}`) 
          : '';
        if (hasFlag && !flagVal) {
          argsTemplate = argsTemplate.replace(/-i\s+\{icon\}/g, '');
        } else {
          argsTemplate = argsTemplate.replace(/\{icon\}/g, flagVal);
        }
      } else if (vKey === 'color' && vVal === 'all' && argsTemplate.includes('{color}')) {
        argsTemplate = argsTemplate.replace(/\{color\}/g, '-a');
      } else if (vKey === 'color' && (vVal === 'nord' || vVal === 'dracula') && item.id && item.id.includes('orchis')) {
        // Orchis treats nord/dracula as --tweaks, not -t
        argsTemplate = argsTemplate.replace(/\{color\}/g, 'default');
        if (argsTemplate.includes('{tweaks}')) {
          argsTemplate = argsTemplate.replace(/\{tweaks\}/g, `--tweaks ${vVal}`);
        } else if (!argsTemplate.includes('--tweaks')) {
          argsTemplate += ` --tweaks ${vVal}`;
        }
      } else {
        argsTemplate = argsTemplate.replace(new RegExp(`\\{${vKey}\\}`, 'g'), vVal);
      }
    }

    // Clean up any remaining unselected optional flags
    argsTemplate = argsTemplate.replace(/-i\s+\{icon\}/g, '').replace(/\{icon\}/g, '').replace(/\{tweaks\}/g, '');

    // Fallback for any unselected required keys defined on item.variants
    if (item.variants) {
      for (const [vKey, vVals] of Object.entries(item.variants)) {
        if (vKey === 'tweaks' || vKey === 'icon') continue;
        const fallback = Array.isArray(vVals) ? vVals[0] : vVals;
        if (vKey === 'color' && fallback === 'all') {
          argsTemplate = argsTemplate.replace(/\{color\}/g, '-a');
        } else {
          argsTemplate = argsTemplate.replace(new RegExp(`\\{${vKey}\\}`, 'g'), fallback);
        }
      }
    }

    // Split args into array
    const rawArgs = argsTemplate.trim().split(/\s+/).filter(Boolean);

    // 3. Determine executable script
    let executable = 'bash';
    let execArgs = [];

    const explicitScript = item.install_script;

    if (explicitScript && explicitScript.endsWith('.py') && fs.existsSync(path.join(cloneDir, explicitScript))) {
      executable = 'python3';
      execArgs = [explicitScript, ...rawArgs];
    } else if (explicitScript && fs.existsSync(path.join(cloneDir, explicitScript))) {
      const scriptPath = path.join(cloneDir, explicitScript);
      try {
        fs.chmodSync(scriptPath, 0o755);
      } catch (_) {}
      executable = 'bash';
      execArgs = [explicitScript, ...rawArgs];
    } else {
      // Direct repo with theme subdirectories (e.g. Papirus, Breeze Chameleon)
      const themeDirs = findThemeDirectories(cloneDir);
      if (themeDirs.length > 0) {
        onProgress({ id: item.id, percent: 80, stage: 'applying', message: 'Installing theme folders...' });
        const installedFolderNames = [];
        let primaryInstalledPath = null;
        for (const dir of themeDirs) {
          const folderName = path.basename(dir);
          const destPath = path.join(targetDir, folderName);
          if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          copyDirRecursive(dir, destPath);
          installedFolderNames.push(folderName);
          if (!primaryInstalledPath) primaryInstalledPath = destPath;
          if (item.category === 'icon-theme' || item.category === 'cursor-theme') {
            try {
              const { execFile: execF } = require('child_process');
              execF('gtk-update-icon-cache', [destPath], () => {});
            } catch (_) {}
          }
        }

        const installedItem = {
          id: item.id,
          name: item.name,
          category: item.category,
          install_type: 'script',
          variant: options.variant || {},
          target_dir: targetDir,
          installed_folders: installedFolderNames,
          primary_path: primaryInstalledPath,
          gtk4_fix_applied: false,
          installed_at: new Date().toISOString()
        };

        stateStore.addInstalled(installedItem);
        onProgress({ id: item.id, percent: 100, stage: 'completed', message: 'Installation complete!' });
        return { success: true, item: installedItem };
      }

      throw new Error(`Could not find valid theme directory in ${cloneDir}`);
    }

    // 4. Run installation process
    onProgress({ id: item.id, percent: 75, stage: 'running_script', message: 'Executing theme install script...' });

    if (tracker.isCancelled) {
      throw new Error('Installation cancelled by user');
    }

    await new Promise((resolve, reject) => {
      const proc = spawn(executable, execArgs, {
        cwd: cloneDir,
        env: {
          ...process.env,
          HOME: HOME
        }
      });

      tracker.proc = proc;

      let stdoutData = '';
      let stderrData = '';

      proc.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      proc.on('close', (code) => {
        tracker.proc = null;
        if (tracker.isCancelled) {
          reject(new Error('Installation cancelled by user'));
        } else if (code === 0) {
          resolve(stdoutData);
        } else {
          console.error(`[InstallScript] Failed with code ${code}:`, stderrData);
          reject(new Error(`Script exited with code ${code}: ${stderrData || stdoutData || 'Unknown error'}`));
        }
      });

      proc.on('error', reject);
    });

    // 5. Apply GTK4 fix if needed (only if script template didn't already include -l)
    let matchedDir = null;
    let installedFolderNames = [];
    try {
      if (fs.existsSync(targetDir)) {
        const beforeEntries = new Set(fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : []);
        const entries = fs.readdirSync(targetDir);
        // Build slugs from both id and name for broader matching
        const idSlug = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameSlug = item.name.toLowerCase().replace(/shell|gtk|theme|icon|pack/g, '').replace(/[^a-z0-9]/g, '').trim();
        installedFolderNames = entries.filter(d => {
          const dl = d.toLowerCase().replace(/[^a-z0-9]/g, '');
          return dl.includes(idSlug) || (nameSlug.length > 2 && dl.includes(nameSlug)) || idSlug.includes(dl.slice(0, 4));
        });
        if (installedFolderNames.length === 0) {
          // fallback: just use item.id (the script target name arg)
          const idFolder = entries.find(e => e.toLowerCase().startsWith(item.id.toLowerCase().split('-')[0]));
          if (idFolder) installedFolderNames = [idFolder];
        }
        const matched = installedFolderNames.find(d => !d.endsWith('-hdpi') && !d.endsWith('-xhdpi')) || installedFolderNames[0];
        if (matched) {
          matchedDir = path.join(targetDir, matched);
        }
      }
    } catch (_) {}

    const hasBuiltInGtk4 = argsTemplate.includes('-l') || argsTemplate.includes('--libadwaita');
    if (item.gtk4_fix && !hasBuiltInGtk4 && matchedDir) {
      onProgress({ id: item.id, percent: 92, stage: 'applying_fixes', message: 'Applying GTK4 Libadwaita fix...' });
      try {
        applyGtk4Fix(matchedDir);
      } catch (_) {}
    }

    // 6. Update state store
    const installedRecord = stateStore.addInstalled({
      id: item.id,
      name: item.name,
      category: item.category,
      install_type: item.install_type,
      variant: options.variant || {},
      target_dir: targetDir,
      installed_folders: installedFolderNames,
      primary_path: matchedDir,
      gtk4_fix_applied: !!item.gtk4_fix
    });

    // Auto-register companion GTK / Shell theme if available
    registerCompanionThemes(item, targetDir, installedFolderNames, matchedDir);

    onProgress({ id: item.id, percent: 100, stage: 'completed', message: 'Installation complete!' });

    return {
      success: true,
      item: installedRecord
    };
  } catch (err) {
    onProgress({ id: item.id, percent: 0, stage: 'error', message: err.message });
    throw err;
  } finally {
    activeInstallations.delete(item.id);
  }
}

function registerCompanionThemes(item, targetDir, installedFolders = [], primaryPath = null) {
  try {
    const catalog = require('./catalog');
    if (item.category === 'gtk-theme') {
      const shellThemes = catalog.getRawCatalog('shell-theme');
      const searchSlug = item.id.replace(/-gtk$/, '').toLowerCase();
      const companion = shellThemes.find(s => s.id === `${item.id}-shell` || s.id === `${searchSlug}-shell` || (item.source_url && s.source_url === item.source_url));
      if (companion && !stateStore.getInstalledItem(companion.id)) {
        stateStore.addInstalled({
          id: companion.id,
          name: companion.name,
          category: 'shell-theme',
          install_type: item.install_type,
          thumbnail: companion.thumbnail || item.thumbnail || `assets/previews/${item.id}.png`,
          target_dir: targetDir,
          installed_folders: installedFolders,
          primary_path: primaryPath,
          gtk4_fix_applied: false
        });
      }
    } else if (item.category === 'shell-theme') {
      const gtkThemes = catalog.getRawCatalog('gtk-theme');
      const searchSlug = item.id.replace(/-shell$/, '').toLowerCase();
      const companion = gtkThemes.find(g => `${g.id}-shell` === item.id || g.id === searchSlug || (item.source_url && g.source_url === item.source_url));
      if (companion && !stateStore.getInstalledItem(companion.id)) {
        stateStore.addInstalled({
          id: companion.id,
          name: companion.name,
          category: 'gtk-theme',
          install_type: item.install_type,
          thumbnail: companion.thumbnail || item.thumbnail || `assets/previews/${g.id}.png`,
          target_dir: targetDir,
          installed_folders: installedFolders,
          primary_path: primaryPath,
          gtk4_fix_applied: !!companion.gtk4_fix
        });
      }
    }
  } catch (_) {}
}

/**
 * General installer router
 * @param {object} item - Catalog item
 * @param {object} [options] - Options (e.g. variants)
 * @param {function} onProgress
 */
async function installItem(item, options = {}, onProgress = () => {}) {
  if (item.install_type === 'zip-static') {
    return installZipStatic(item, onProgress, options);
  }

  if (item.install_type === 'script') {
    return installScript(item, options, onProgress);
  }

  throw new Error(`Install type "${item.install_type}" is not supported`);
}

module.exports = {
  installItem,
  installZipStatic,
  installScript,
  cancelInstall,
  resolveTargetDir
};
