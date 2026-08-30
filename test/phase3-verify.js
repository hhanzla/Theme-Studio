const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const { registerCatalogIpc } = require('../main/ipc/catalog.ipc');
const { registerInstallerIpc } = require('../main/ipc/installer.ipc');
const { registerDepsIpc } = require('../main/ipc/deps.ipc');
const dependencyChecker = require('../main/lib/dependency-checker');
const installer = require('../main/lib/installer');
const stateStore = require('../main/lib/state-store');

async function runPhase3Tests() {
  console.log('=== Running Phase 3 Unit & Integration Tests ===');

  // 1. Test Dependency Checker
  console.log('\n--- 1. Testing Dependency Checker ---');
  const depCheck = await dependencyChecker.checkBinaries(['node', 'git', 'fake_missing_binary_12345']);
  console.log('Binary check result:', depCheck);
  if (depCheck.missing.includes('fake_missing_binary_12345') && !depCheck.missing.includes('git')) {
    console.log('✓ Dependency checker accurately identified existing vs missing binaries!');
  } else {
    throw new Error('Dependency checker failed binary identification');
  }

  // 2. Test Script Installer with mock git repo
  console.log('\n--- 2. Testing Script Installer Pipeline ---');
  const mockRepoDir = path.join(os.tmpdir(), 'mock-theme-repo');
  fs.mkdirSync(mockRepoDir, { recursive: true });

  const mockInstallSh = path.join(mockRepoDir, 'install.sh');
  fs.writeFileSync(mockInstallSh, `#!/usr/bin/env bash
echo "Installing mock theme with args: $@"
mkdir -p "$HOME/.themes/MockScriptTheme"
echo "theme installed" > "$HOME/.themes/MockScriptTheme/index.theme"
exit 0
`, { mode: 0o755 });

  const mockScriptItem = {
    id: 'mock-script-theme',
    name: 'Mock Script Theme',
    category: 'gtk-theme',
    install_type: 'script',
    variants: {
      color: ['purple', 'blue'],
      mode: ['dark', 'light']
    },
    install_args_template: '-t {color} -c {mode} -l',
    dependencies: ['bash'],
    target_dir: '~/.themes',
    source: {
      type: 'git',
      repo: 'mock-repo-url'
    }
  };

  // Mock gitClone for test
  const origGitClone = require('../main/lib/downloader').gitClone;
  require('../main/lib/downloader').gitClone = async (url, dest, onProg) => {
    onProg(50, 'Copying mock repo');
    const { execSync } = require('child_process');
    execSync(`cp -r "${mockRepoDir}" "${dest}"`);
    return dest;
  };

  const scriptResult = await installer.installScript(
    mockScriptItem,
    { variant: { color: 'purple', mode: 'dark' } },
    (p) => console.log(`[Script Progress ${p.percent}%] ${p.stage}: ${p.message}`)
  );

  console.log('Script install result:', scriptResult);

  if (stateStore.isInstalled('mock-script-theme')) {
    const installed = stateStore.getInstalledItem('mock-script-theme');
    console.log('Installed item in store:', installed);
    if (installed.variant && installed.variant.color === 'purple' && installed.variant.mode === 'dark') {
      console.log('✓ Script theme variant properly recorded in state store!');
    } else {
      throw new Error('Variant not recorded properly in state store');
    }
  } else {
    throw new Error('Script theme not found in state store');
  }

  // Cleanup
  stateStore.removeInstalled('mock-script-theme');
  const mockInstalledPath = path.join(os.homedir(), '.themes', 'MockScriptTheme');
  if (fs.existsSync(mockInstalledPath)) {
    fs.rmSync(mockInstalledPath, { recursive: true, force: true });
  }
  fs.rmSync(mockRepoDir, { recursive: true, force: true });
  require('../main/lib/downloader').gitClone = origGitClone;

  console.log('\n=== ALL PHASE 3 TESTS PASSED! ===\n');
}

app.whenReady().then(async () => {
  try {
    registerCatalogIpc();
    registerInstallerIpc();
    registerDepsIpc();
    await runPhase3Tests();
    app.exit(0);
  } catch (err) {
    console.error('Phase 3 Test Error:', err);
    app.exit(1);
  }
});
