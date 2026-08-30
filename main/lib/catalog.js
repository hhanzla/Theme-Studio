const fs = require('fs');
const path = require('path');
const stateStore = require('./state-store');

const SOURCES_DIR = path.resolve(__dirname, '../../sources');

const CATEGORY_FILE_MAP = {
  'gtk-theme': 'themes.json',
  'themes': 'themes.json',
  'theme': 'themes.json',
  'shell-theme': 'shell-themes.json',
  'shell-themes': 'shell-themes.json',
  'shell': 'shell-themes.json',
  'icon-theme': 'icons.json',
  'icons': 'icons.json',
  'icon': 'icons.json',
  'cursor-theme': 'cursors.json',
  'cursors': 'cursors.json',
  'cursor': 'cursors.json',
  'wallpaper': 'wallpapers.json',
  'wallpapers': 'wallpapers.json',
  'look': 'looks.json',
  'looks': 'looks.json'
};

function loadJsonFile(filename) {
  const filePath = path.join(SOURCES_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.error(`[Catalog] Failed to load ${filename}:`, err);
  }
  return [];
}

function getRawCatalog(category) {
  if (!category || category === 'all') {
    const allFiles = ['themes.json', 'shell-themes.json', 'icons.json', 'cursors.json', 'wallpapers.json', 'looks.json'];
    let combined = [];
    for (const f of allFiles) {
      combined = combined.concat(loadJsonFile(f));
    }
    return combined;
  }

  const filename = CATEGORY_FILE_MAP[category.toLowerCase()];
  if (!filename) {
    return [];
  }
  return loadJsonFile(filename);
}

const { THEMES_DIR } = require('./paths');

function listCatalog(category) {
  const rawItems = getRawCatalog(category);
  const installedItems = stateStore.getInstalledItems();
  const installedMap = new Map();
  for (const it of installedItems) {
    installedMap.set(it.id, it);
  }

  return rawItems.map((item) => {
    let isInst = installedMap.has(item.id);
    let installedData = installedMap.get(item.id) || null;

    // Auto-detect installed themes from disk if not yet in state
    if (!isInst && (item.category === 'gtk-theme' || item.category === 'shell-theme') && fs.existsSync(THEMES_DIR)) {
      try {
        const diskFolders = fs.readdirSync(THEMES_DIR);
        const searchSlug = item.id.replace(/-shell$|-gtk$/, '').toLowerCase();
        const match = diskFolders.find(f => f.toLowerCase().includes(searchSlug));
        if (match) {
          const fullPath = path.join(THEMES_DIR, match);
          if (item.category === 'shell-theme') {
            if (fs.existsSync(path.join(fullPath, 'gnome-shell'))) {
              isInst = true;
            }
          } else {
            isInst = true;
          }
          if (isInst && !installedData) {
            installedData = {
              id: item.id,
              name: item.name,
              category: item.category,
              installed_folders: [match],
              primary_path: fullPath
            };
          }
        }
      } catch (_) {}
    }

    return {
      ...item,
      installed: isInst,
      installedInfo: installedData
    };
  });
}

function findItemById(id, category = null) {
  const items = getRawCatalog(category);
  return items.find((i) => i.id === id) || null;
}

module.exports = {
  listCatalog,
  getRawCatalog,
  findItemById
};
