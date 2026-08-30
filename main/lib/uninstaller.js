const fs = require('fs');
const path = require('path');
const stateStore = require('./state-store');
const { removeGtk4Fix } = require('./fixes/gtk4-libadwaita');
const gnome = require('./gnome');
const { HOME, GTK_THEMES, ICON_THEMES } = require('./paths');

/**
 * Removes an installed item, reverts symlinks, resets desktop setting if currently applied,
 * cleans ALL related theme sub-folders from disk, and removes from state store.
 * @param {string} id - Item ID
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function removeInstalledItem(id) {
  let item = stateStore.getInstalledItem(id);

  // If item wasn't in stateStore, construct a synthetic item from id to allow deep disk cleanup
  if (!item) {
    item = {
      id: id,
      name: id,
      category: id.includes('icon') ? 'icon-theme' : (id.includes('cursor') ? 'cursor-theme' : (id.includes('shell') ? 'shell-theme' : 'gtk-theme'))
    };
  }

  const isGtkOrShell = item.category === 'gtk-theme' || item.category === 'shell-theme';
  const cleanSlug = (item.id || item.name || '')
    .toLowerCase()
    .replace(/shell|gtk|theme|themes/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // 1. Check if the item is currently active in GNOME settings and reset if applied
  try {
    const current = await gnome.getCurrentSettings();
    const itemNamesToCheck = [
      (item.name || '').toLowerCase(),
      (item.id || '').toLowerCase(),
      cleanSlug,
      ...(item.installed_folders || []).map(f => f.toLowerCase())
    ].filter(Boolean);

    if (isGtkOrShell && itemNamesToCheck.some(n => current.gtk.toLowerCase().includes(n) || n.includes(current.gtk.toLowerCase()))) {
      console.log(`[Uninstaller] Theme "${item.name}" is currently active. Resetting GTK theme to Yaru...`);
      await gnome.setGtkTheme('Yaru');
    }
    if (isGtkOrShell && itemNamesToCheck.some(n => (current.shell || '').toLowerCase().includes(n) || n.includes((current.shell || '').toLowerCase()))) {
      console.log(`[Uninstaller] Shell theme "${item.name}" is currently active. Resetting Shell theme...`);
      try {
        await gnome.setShellTheme('');
      } catch (_) {}
    }
    if ((item.category === 'icon-theme' || item.id.includes('icon')) && itemNamesToCheck.some(n => current.icons.toLowerCase().includes(n) || n.includes(current.icons.toLowerCase()))) {
      console.log(`[Uninstaller] Icon pack "${item.name}" is currently active. Resetting Icon theme to Yaru...`);
      await gnome.setIconTheme('Yaru');
    }
    if ((item.category === 'cursor-theme' || item.id.includes('cursor')) && itemNamesToCheck.some(n => current.cursors.toLowerCase().includes(n) || n.includes(current.cursors.toLowerCase()))) {
      console.log(`[Uninstaller] Cursor set "${item.name}" is currently active. Resetting Cursor theme to Yaru...`);
      await gnome.setCursorTheme('Yaru');
    }
  } catch (err) {
    console.error('[Uninstaller] Error checking active desktop settings:', err);
  }

  // 2. Revert GTK4 Libadwaita symlinks
  try {
    removeGtk4Fix(item.primary_path || null);
  } catch (_) {}

  // 3. Remove installed directories from all possible theme/icon locations
  const searchDirs = isGtkOrShell
    ? [GTK_THEMES, path.join(HOME, '.local', 'share', 'themes')]
    : [ICON_THEMES, path.join(HOME, '.local', 'share', 'icons')];

  // Specific folders registered in item
  if (Array.isArray(item.installed_folders)) {
    for (const folder of item.installed_folders) {
      for (const baseDir of searchDirs) {
        const fullPath = path.join(baseDir, folder);
        if (fs.existsSync(fullPath)) {
          try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            console.log(`[Uninstaller] Removed folder: ${fullPath}`);
          } catch (e) {
            console.error(`[Uninstaller] Failed removing ${fullPath}:`, e);
          }
        }
      }
    }
  }

  // Deep matching cleanup for all variant/compact/hdpi folders matching the theme slug
  if (cleanSlug && cleanSlug.length >= 3) {
    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue;
      try {
        const entries = fs.readdirSync(baseDir);
        for (const entry of entries) {
          const entryLower = entry.toLowerCase();
          if (entryLower === cleanSlug || entryLower.includes(cleanSlug) || entryLower.startsWith(cleanSlug)) {
            const entryPath = path.join(baseDir, entry);
            try {
              fs.rmSync(entryPath, { recursive: true, force: true });
              console.log(`[Uninstaller] Cleaned matching variant folder: ${entryPath}`);
            } catch (e) {
              console.error(`[Uninstaller] Failed removing ${entryPath}:`, e);
            }
          }
        }
      } catch (_) {}
    }
  }

  // Primary path cleanup
  if (item.primary_path && fs.existsSync(item.primary_path)) {
    try {
      fs.rmSync(item.primary_path, { recursive: true, force: true });
      console.log(`[Uninstaller] Removed primary folder: ${item.primary_path}`);
    } catch (_) {}
  }

  // 4. Remove from state store (and remove companion GTK/Shell record if any)
  stateStore.removeInstalled(id);
  if (id.endsWith('-shell')) {
    stateStore.removeInstalled(id.replace(/-shell$/, ''));
    stateStore.removeInstalled(id.replace(/-shell$/, '-gtk'));
  } else {
    stateStore.removeInstalled(`${id}-shell`);
  }

  return { success: true, message: `Successfully uninstalled ${item.name}` };
}

module.exports = {
  removeInstalledItem
};
