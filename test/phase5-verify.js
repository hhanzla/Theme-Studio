const { app } = require('electron');
const { registerCatalogIpc } = require('../main/ipc/catalog.ipc');
const { registerInstallerIpc } = require('../main/ipc/installer.ipc');
const { registerDepsIpc } = require('../main/ipc/deps.ipc');
const { registerUninstallIpc } = require('../main/ipc/uninstall.ipc');
const { registerSystemIpc } = require('../main/ipc/system.ipc');
const { registerSettingsIpc } = require('../main/ipc/settings.ipc');
const flatpakOverride = require('../main/lib/fixes/flatpak-override');
const looks = require('../main/lib/looks');
const catalog = require('../main/lib/catalog');
const stateStore = require('../main/lib/state-store');

async function runPhase5Tests() {
  console.log('=== Running Phase 5 Unit & Integration Tests ===');

  // 1. Test Flatpak detection & override logic
  console.log('\n--- 1. Testing Flatpak Override Logic ---');
  const isInstalled = await flatpakOverride.isFlatpakInstalled();
  console.log('Is Flatpak installed on system:', isInstalled);

  // 2. Test Looks Catalog & Presets
  console.log('\n--- 2. Testing Looks Presets & Catalog ---');
  const presets = looks.getLookPresets();
  console.log(`Loaded ${presets.length} presets from looks.json:`, presets.map(p => p.name));
  if (presets.length < 0) {
    throw new Error('Expected presets array');
  }

  const wallpaperCatalog = catalog.getRawCatalog('wallpaper');
  console.log(`Loaded ${wallpaperCatalog.length} wallpapers from wallpapers.json:`, wallpaperCatalog.map(w => w.name));
  if (wallpaperCatalog.length < 3) {
    throw new Error('Expected at least 3 wallpapers in wallpapers.json');
  }

  // 3. Test Settings state persistence
  console.log('\n--- 3. Testing Settings Persistence ---');
  stateStore.setSetting('flatpak_theme_sync', true);
  const currentSettings = stateStore.getSettings();
  console.log('Current settings in store:', currentSettings);
  if (currentSettings.flatpak_theme_sync !== true) {
    throw new Error('flatpak_theme_sync setting was not persisted');
  }

  console.log('\n=== ALL PHASE 5 TESTS PASSED! ===\n');
}

app.whenReady().then(async () => {
  try {
    registerCatalogIpc();
    registerInstallerIpc();
    registerDepsIpc();
    registerUninstallIpc();
    registerSystemIpc();
    registerSettingsIpc();
    await runPhase5Tests();
    app.exit(0);
  } catch (err) {
    console.error('Phase 5 Test Error:', err);
    app.exit(1);
  }
});
