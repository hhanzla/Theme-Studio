const { execFile, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function execGsettings(args) {
  return new Promise((resolve) => {
    execFile('gsettings', args, (err, stdout, stderr) => {
      if (err) {
        return resolve({ success: false, error: stderr || err.message, value: '' });
      }
      const val = stdout.trim().replace(/^'|'$/g, '');
      resolve({ success: true, value: val });
    });
  });
}

const CATEGORY_DEFINITIONS = [
  {
    id: 'Internet',
    name: 'Internet & Web',
    icon: '🌐',
    categories: ['Network', 'WebBrowser', 'Email', 'InstantMessaging', 'Chat', 'IRCClient', 'Feed', 'News', 'FileTransfer'],
    keywords: ['chrome', 'firefox', 'brave', 'edge', 'telegram', 'discord', 'slack', 'thunderbird', 'cloudflare', 'browser']
  },
  {
    id: 'Development',
    name: 'Development',
    icon: '💻',
    categories: ['Development', 'IDE', 'Building', 'Debugger', 'RevisionControl', 'WebDevelopment', 'GUIDesigner', 'Profiling'],
    keywords: ['code', 'zed', 'sublime', 'atom', 'git', 'terminal', 'python', 'node', 'docker', 'postman']
  },
  {
    id: 'Media',
    name: 'Audio & Video',
    icon: '🎬',
    categories: ['AudioVideo', 'Audio', 'Video', 'Player', 'Recorder', 'Music', 'Midi', 'Mixer', 'Sequencer', 'Tuner', 'TV'],
    keywords: ['vlc', 'spotify', 'mpv', 'obs', 'audacity', 'kdenlive', 'rhythmbox', 'sound', 'camera', 'video']
  },
  {
    id: 'Graphics',
    name: 'Graphics & Photos',
    icon: '🎨',
    categories: ['Graphics', 'RasterGraphics', 'VectorGraphics', '2DGraphics', '3DGraphics', 'Photography', 'Viewer'],
    keywords: ['gimp', 'inkscape', 'blender', 'eog', 'loupe', 'draw', 'photo', 'image', 'screenshot', 'evince']
  },
  {
    id: 'Office',
    name: 'Office & Documents',
    icon: '📄',
    categories: ['Office', 'WordProcessor', 'Spreadsheet', 'Presentation', 'Publishing', 'Finance', 'FlowChart', 'DocumentViewer'],
    keywords: ['libreoffice', 'writer', 'calc', 'impress', 'gedit', 'pdf', 'document', 'writer', 'excel', 'word']
  },
  {
    id: 'System',
    name: 'System & Tools',
    icon: '⚙️',
    categories: ['System', 'Monitor', 'Security', 'PackageManager', 'Settings', 'HardwareSettings', 'FileManager', 'TerminalEmulator', 'Archiving'],
    keywords: ['monitor', 'nautilus', 'settings', 'software', 'update', 'disk', 'timeshift', 'gdebi', 'log', 'firmware', 'power']
  },
  {
    id: 'Utilities',
    name: 'Utilities',
    icon: '🛠️',
    categories: ['Utility', 'X-GNOME-Utilities', 'Calculator', 'TextEditor', 'Clock', 'Accessibility'],
    keywords: ['clock', 'calc', 'text', 'font', 'help', 'extension', 'tweaks', 'password', 'seahorse', 'weather', 'maps']
  },
  {
    id: 'Games',
    name: 'Games',
    icon: '🎮',
    categories: ['Game', 'ActionGame', 'AdventureGame', 'ArcadeGame', 'BoardGame', 'CardGame', 'LogicGame', 'RolePlaying', 'Simulation', 'SportsGame', 'StrategyGame', 'Emulator'],
    keywords: ['steam', 'lutris', 'heroic', 'game', 'play', 'minecraft', 'chess', 'solitaire']
  }
];

/**
 * Scan all installed .desktop applications across system and user paths
 */
function scanDesktopApplications() {
  const appDirs = [
    '/usr/share/applications',
    '/usr/local/share/applications',
    '/var/lib/flatpak/exports/share/applications',
    path.join(os.homedir(), '.local/share/flatpak/exports/share/applications'),
    path.join(os.homedir(), '.local/share/applications'),
    '/var/lib/snapd/desktop/applications'
  ];

  const apps = new Map();

  for (const dir of appDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.desktop')) continue;
        const fullPath = path.join(dir, file);
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Skip if NoDisplay=true or Hidden=true
          if (/^NoDisplay\s*=\s*true/im.test(content) || /^Hidden\s*=\s*true/im.test(content)) {
            continue;
          }

          // Extract Categories
          const catMatch = content.match(/^Categories\s*=\s*([^\r\n]+)/im);
          const categories = catMatch ? catMatch[1].split(';').map(c => c.trim()).filter(Boolean) : [];

          // Extract Name
          const nameMatch = content.match(/^Name\s*=\s*([^\r\n]+)/im);
          const name = nameMatch ? nameMatch[1].trim() : file.replace('.desktop', '');

          // Extract Icon
          const iconMatch = content.match(/^Icon\s*=\s*([^\r\n]+)/im);
          const icon = iconMatch ? iconMatch[1].trim() : 'application-x-executable';

          if (!apps.has(file)) {
            apps.set(file, {
              desktopFile: file,
              name,
              icon,
              categories,
              fullPath
            });
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  return Array.from(apps.values());
}

/**
 * Check the status of GNOME app folders and count apps per category
 */
async function getAppFoldersStatus() {
  const res = await execGsettings(['get', 'org.gnome.desktop.app-folders', 'folder-children']);
  let children = [];
  if (res.success && res.value) {
    try {
      const cleaned = res.value.replace(/^@as\s*/, '').replace(/'/g, '"');
      children = JSON.parse(cleaned);
    } catch (_) {
      children = res.value.replace(/[\[\]']/g, '').split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const allApps = scanDesktopApplications();
  const isOrganized = children.length >= 4 && (children.includes('Internet') || children.includes('Development') || children.includes('Media'));

  // Calculate app count per category
  const categoriesWithCounts = CATEGORY_DEFINITIONS.map(c => {
    let count = 0;
    for (const app of allApps) {
      if (c.categories.some(cat => app.categories.includes(cat))) {
        count++;
      } else {
        const lowerName = (app.desktopFile + ' ' + app.name).toLowerCase();
        if (c.keywords.some(kw => lowerName.includes(kw))) {
          count++;
        }
      }
    }
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      count
    };
  });

  return {
    success: true,
    isOrganized,
    activeFolders: children,
    totalApps: allApps.length,
    definedCategories: categoriesWithCounts
  };
}

/**
 * Automatically categorize and organize App Grid icons into selected GNOME app folders
 * @param {string[]} selectedFolderIds - Optional list of folder IDs to apply
 */
async function organizeAppFolders(selectedFolderIds = null) {
  const allApps = scanDesktopApplications();
  const folderAssignments = {};

  const targets = Array.isArray(selectedFolderIds) && selectedFolderIds.length > 0
    ? CATEGORY_DEFINITIONS.filter(c => selectedFolderIds.includes(c.id))
    : CATEGORY_DEFINITIONS;

  for (const def of targets) {
    folderAssignments[def.id] = {
      name: def.name,
      categories: def.categories,
      apps: []
    };
  }

  // Assign apps based on categories or keywords
  for (const app of allApps) {
    let assigned = false;

    // 1. Try matching explicit XDG Categories
    for (const def of targets) {
      if (def.categories.some(cat => app.categories.includes(cat))) {
        folderAssignments[def.id].apps.push(app.desktopFile);
        assigned = true;
        break;
      }
    }

    // 2. Fallback: match keywords in desktop filename or app name
    if (!assigned) {
      const lowerName = (app.desktopFile + ' ' + app.name).toLowerCase();
      for (const def of targets) {
        if (def.keywords.some(kw => lowerName.includes(kw))) {
          folderAssignments[def.id].apps.push(app.desktopFile);
          assigned = true;
          break;
        }
      }
    }
  }

  const activeFolders = [];

  for (const def of targets) {
    const group = folderAssignments[def.id];
    activeFolders.push(def.id);
    const schemaPath = `org.gnome.desktop.app-folders.folder:/org/gnome/desktop/app-folders/folders/${def.id}/`;

    // Set folder name
    await execGsettings(['set', schemaPath, 'name', def.name]);
    await execGsettings(['set', schemaPath, 'translate', 'false']);

    // Set categories
    const catArrayStr = JSON.stringify(def.categories).replace(/"/g, "'");
    await execGsettings(['set', schemaPath, 'categories', catArrayStr]);

    // Set apps
    if (group.apps.length > 0) {
      const appsArrayStr = JSON.stringify(group.apps).replace(/"/g, "'");
      await execGsettings(['set', schemaPath, 'apps', appsArrayStr]);
    }
  }

  // Set folder-children in GNOME
  const folderChildrenStr = JSON.stringify(activeFolders).replace(/"/g, "'");
  await execGsettings(['set', 'org.gnome.desktop.app-folders', 'folder-children', folderChildrenStr]);

  return {
    success: true,
    message: `Successfully organized applications into ${activeFolders.length} selected folders!`,
    activeFolders,
    totalCategorizedApps: allApps.length
  };
}

/**
 * Reset App Grid folders back to default
 */
async function resetAppFolders() {
  const defaultChildren = ['Utilities', 'YaST', 'Pardus'];
  const folderChildrenStr = JSON.stringify(defaultChildren).replace(/"/g, "'");
  await execGsettings(['set', 'org.gnome.desktop.app-folders', 'folder-children', folderChildrenStr]);

  return {
    success: true,
    message: 'App Grid folders restored to default.',
    activeFolders: defaultChildren
  };
}

const COMPACT_START_TAG = '/* @themestudio:compact-mode:start */';
const COMPACT_END_TAG = '/* @themestudio:compact-mode:end */';

const COMPACT_CSS = `${COMPACT_START_TAG}
/* Theme Studio - Compact Desktop UI Tweak */
/* Non-destructive sizing: reduces titlebar & headerbar padding without overriding colors or custom themes */
headerbar, .titlebar, windowtitle {
  min-height: 34px;
  padding-top: 2px;
  padding-bottom: 2px;
}
headerbar windowcontrols {
  margin-top: 0;
  margin-bottom: 0;
}
headerbar entry, headerbar button {
  min-height: 26px;
  padding: 3px 8px;
}
popover.background list, popover.background menu {
  padding: 3px;
}
${COMPACT_END_TAG}`;

function isCompactModeEnabled() {
  const gtk4Css = path.join(os.homedir(), '.config', 'gtk-4.0', 'gtk.css');
  if (fs.existsSync(gtk4Css)) {
    try {
      const content = fs.readFileSync(gtk4Css, 'utf8');
      if (content.includes(COMPACT_START_TAG)) return true;
    } catch (_) {}
  }
  return false;
}

function applyCompactCssToFile(filePath, enable) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content = '';
  if (fs.existsSync(filePath)) {
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (_) {}
  }

  // Remove existing compact mode block if any
  const regex = new RegExp(`${COMPACT_START_TAG.replace(/[*[\]()]/g, '\\$&')}[\\s\\S]*?${COMPACT_END_TAG.replace(/[*[\]()]/g, '\\$&')}\\n?`, 'g');
  content = content.replace(regex, '').trim();

  if (enable) {
    content = content ? `${content}\n\n${COMPACT_CSS}\n` : `${COMPACT_CSS}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function setCompactMode(enable) {
  const gtk4Css = path.join(os.homedir(), '.config', 'gtk-4.0', 'gtk.css');
  const gtk3Css = path.join(os.homedir(), '.config', 'gtk-3.0', 'gtk.css');

  applyCompactCssToFile(gtk4Css, enable);
  applyCompactCssToFile(gtk3Css, enable);

  return { success: true, compactMode: enable };
}

/**
 * Quick desktop system tweaks
 */
async function getDesktopTweaks() {
  const clickAction = await execGsettings(['get', 'org.gnome.shell.extensions.dash-to-dock', 'click-action']);
  const buttonLayout = await execGsettings(['get', 'org.gnome.desktop.wm.preferences', 'button-layout']);
  const centerWindows = await execGsettings(['get', 'org.gnome.mutter', 'center-new-windows']);
  const compactMode = isCompactModeEnabled();

  return {
    success: true,
    clickToMinimize: clickAction.value === 'minimize',
    buttonLayout: buttonLayout.value || 'appmenu:close',
    centerNewWindows: centerWindows.value === 'true',
    compactMode
  };
}

async function setDesktopTweak(key, value) {
  if (key === 'compactMode') {
    return setCompactMode(Boolean(value));
  }
  if (key === 'clickToMinimize') {
    const val = value ? 'minimize' : 'focus-or-previews';
    return execGsettings(['set', 'org.gnome.shell.extensions.dash-to-dock', 'click-action', val]);
  }
  if (key === 'buttonLayout') {
    return execGsettings(['set', 'org.gnome.desktop.wm.preferences', 'button-layout', String(value)]);
  }
  if (key === 'centerNewWindows') {
    return execGsettings(['set', 'org.gnome.mutter', 'center-new-windows', value ? 'true' : 'false']);
  }
  return { success: false, error: 'Unknown tweak key' };
}

module.exports = {
  getAppFoldersStatus,
  organizeAppFolders,
  resetAppFolders,
  getDesktopTweaks,
  setDesktopTweak,
  CATEGORY_DEFINITIONS
};
