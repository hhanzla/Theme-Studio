const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const { registerCatalogIpc } = require('../main/ipc/catalog.ipc');
const { registerInstallerIpc } = require('../main/ipc/installer.ipc');
const { registerDepsIpc } = require('../main/ipc/deps.ipc');
const { registerUninstallIpc } = require('../main/ipc/uninstall.ipc');
const { registerSystemIpc } = require('../main/ipc/system.ipc');
const gnome = require('../main/lib/gnome');
const uninstaller = require('../main/lib/uninstaller');
const stateStore = require('../main/lib/state-store');

async function runPhase4Tests() {
  console.log('=== Running Phase 4 Unit & Integration Tests ===');

  // 1. Test GNOME settings wrapper
  console.log('\n--- 1. Testing GNOME settings wrapper ---');
  const current = await gnome.getCurrentSettings();
  console.log('Current GNOME appearance settings:', current);
  if (current && typeof current.gtk === 'string') {
    console.log('✓ Successfully queried GNOME desktop settings!');
  } else {
    throw new Error('Failed to query GNOME desktop settings');
  }

  // 2. Test Uninstallation pipeline
  console.log('\n--- 2. Testing Uninstallation Pipeline ---');
  const testThemeFolder = path.join(os.homedir(), '.themes', 'TestUninstallTheme');
  fs.mkdirSync(testThemeFolder, { recursive: true });
  fs.writeFileSync(path.join(testThemeFolder, 'index.theme'), '[Desktop Entry]\nName=TestUninstallTheme\n');

  stateStore.addInstalled({
    id: 'test-uninstall-item',
    name: 'Test Uninstall Item',
    category: 'gtk-theme',
    target_dir: '~/.themes',
    installed_folders: ['TestUninstallTheme'],
    primary_path: testThemeFolder,
    gtk4_fix_applied: false
  });

  if (!stateStore.isInstalled('test-uninstall-item')) {
    throw new Error('Failed to setup test item in state store');
  }

  const uninstallResult = await uninstaller.removeInstalledItem('test-uninstall-item');
  console.log('Uninstall result:', uninstallResult);

  if (!stateStore.isInstalled('test-uninstall-item')) {
    console.log('✓ Item properly removed from state store!');
  } else {
    throw new Error('Item still in state store after uninstall');
  }

  if (!fs.existsSync(testThemeFolder)) {
    console.log('✓ Installed theme directory successfully removed from disk!');
  } else {
    throw new Error('Theme directory still exists on disk');
  }

  console.log('\n=== ALL PHASE 4 TESTS PASSED! ===\n');
}

app.whenReady().then(async () => {
  try {
    registerCatalogIpc();
    registerInstallerIpc();
    registerDepsIpc();
    registerUninstallIpc();
    registerSystemIpc();
    await runPhase4Tests();
    app.exit(0);
  } catch (err) {
    console.error('Phase 4 Test Error:', err);
    app.exit(1);
  }
});
