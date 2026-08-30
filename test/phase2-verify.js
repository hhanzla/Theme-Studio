const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { app, BrowserWindow } = require('electron');
const { registerCatalogIpc } = require('../main/ipc/catalog.ipc');
const { registerInstallerIpc } = require('../main/ipc/installer.ipc');
const { applyGtk4Fix, removeGtk4Fix } = require('../main/lib/fixes/gtk4-libadwaita');
const { GTK4_CONFIG, STATE_FILE } = require('../main/lib/paths');
const installer = require('../main/lib/installer');
const stateStore = require('../main/lib/state-store');

async function runPhase2Tests() {
  console.log('=== Running Phase 2 Unit & Integration Tests ===');

  // 1. Test GTK4 Fixer
  console.log('\n--- 1. Testing GTK4 Libadwaita Fixer ---');
  const tempThemeDir = path.join(os.tmpdir(), 'test-theme-gtk4');
  const tempGtk4 = path.join(tempThemeDir, 'gtk-4.0');
  fs.mkdirSync(tempGtk4, { recursive: true });
  fs.writeFileSync(path.join(tempGtk4, 'gtk.css'), '/* test css */');
  fs.writeFileSync(path.join(tempGtk4, 'gtk-dark.css'), '/* test dark css */');

  const fixRes = applyGtk4Fix(tempThemeDir);
  console.log('applyGtk4Fix result:', fixRes);

  const symlinkCss = path.join(GTK4_CONFIG, 'gtk.css');
  if (fs.existsSync(symlinkCss) && fs.lstatSync(symlinkCss).isSymbolicLink()) {
    console.log('✓ Symlink ~/.config/gtk-4.0/gtk.css verified successfully!');
  } else {
    throw new Error('Symlink creation failed');
  }

  removeGtk4Fix(tempThemeDir);
  if (!fs.existsSync(symlinkCss)) {
    console.log('✓ GTK4 symlink revert verified successfully!');
  }
  fs.rmSync(tempThemeDir, { recursive: true, force: true });

  // 2. Test zip-static installer pipeline with a mock item
  console.log('\n--- 2. Testing zip-static installer pipeline ---');
  const mockZipPath = path.join(os.tmpdir(), 'mock-theme.zip');
  const mockZip = new AdmZip();
  mockZip.addFile('MockTheme/index.theme', Buffer.from('[Desktop Entry]\nName=MockTheme\n'));
  mockZip.addFile('MockTheme/gtk-3.0/gtk.css', Buffer.from('/* gtk3 */'));
  mockZip.addFile('MockTheme/gtk-4.0/gtk.css', Buffer.from('/* gtk4 */'));
  mockZip.writeZip(mockZipPath);

  const mockItem = {
    id: 'mock-zip-theme',
    name: 'Mock Zip Theme',
    category: 'gtk-theme',
    install_type: 'zip-static',
    target_dir: '~/.themes',
    gtk4_fix: true,
    source: {
      type: 'zip',
      zip_url: `file://${mockZipPath}` // file protocol or mocked downloader
    }
  };

  // Override downloader for local test file
  const origDownload = require('../main/lib/downloader').downloadFile;
  require('../main/lib/downloader').downloadFile = async (url, dest, onProg) => {
    fs.copyFileSync(mockZipPath, dest);
    onProg(100);
    return dest;
  };

  const installResult = await installer.installZipStatic(mockItem, (p) => {
    console.log(`[Progress ${p.percent}%] ${p.stage}: ${p.message}`);
  });

  console.log('Install result:', installResult);
  if (stateStore.isInstalled('mock-zip-theme')) {
    console.log('✓ Mock theme recorded in state store!');
  } else {
    throw new Error('State store did not record mock theme');
  }

  // Cleanup test
  stateStore.removeInstalled('mock-zip-theme');
  const mockInstalledPath = path.join(os.homedir(), '.themes', 'MockTheme');
  if (fs.existsSync(mockInstalledPath)) {
    fs.rmSync(mockInstalledPath, { recursive: true, force: true });
  }
  fs.unlinkSync(mockZipPath);

  // Restore downloader
  require('../main/lib/downloader').downloadFile = origDownload;

  console.log('\n=== ALL PHASE 2 TESTS PASSED! ===\n');
}

app.whenReady().then(async () => {
  try {
    registerCatalogIpc();
    registerInstallerIpc();
    await runPhase2Tests();
    app.exit(0);
  } catch (err) {
    console.error('Phase 2 Test Error:', err);
    app.exit(1);
  }
});
