// test/m2-phase1-verify.js
// Verification for Milestone 2 - Phase 1: System Copy Mechanism & GDM IPC Wiring

const assert = require('assert');
const path = require('path');
const paths = require('../main/lib/paths');
const gdmAssets = require('../main/lib/fixes/gdm-assets');

async function runM2Phase1Tests() {
  console.log('=== Running Milestone 2: Phase 1 Unit Tests ===\n');

  // 1. Verify paths.js system directory constants
  console.log('--- 1. Testing paths.js System Constants ---');
  assert.strictEqual(paths.SYS_THEMES, '/usr/share/themes');
  assert.strictEqual(paths.SYS_ICONS, '/usr/share/icons');
  assert.strictEqual(paths.SYS_BACKGROUNDS, '/usr/share/backgrounds');
  assert.strictEqual(paths.SYS_FONTS, '/usr/share/fonts');
  assert.strictEqual(paths.SYS_PIXMAPS, '/usr/share/pixmaps');
  console.log('✓ paths.js system constants verified successfully!\n');

  // 2. Verify gdm-assets directory mapping
  console.log('--- 2. Testing gdm-assets Category Mapping ---');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['theme'], '/usr/share/themes');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['gtk-theme'], '/usr/share/themes');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['shell-theme'], '/usr/share/themes');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['icon'], '/usr/share/icons');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['icons'], '/usr/share/icons');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['cursor'], '/usr/share/icons');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['wallpaper'], '/usr/share/backgrounds');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['font'], '/usr/share/fonts');
  assert.strictEqual(gdmAssets.CATEGORY_DIR_MAP['logo'], '/usr/share/pixmaps');
  console.log('✓ Category directory mappings verified successfully!\n');

  // 3. Verify non-existent source asset error handling
  console.log('--- 3. Testing copyToSystemDir validation ---');
  const resMissing = await gdmAssets.copyToSystemDir('/fake/non/existent/path.png', 'logo');
  assert.strictEqual(resMissing.success, false);
  assert(resMissing.error.includes('Source asset not found'));
  console.log('✓ Validation and safe error returns verified successfully!\n');

  console.log('=== ALL MILESTONE 2: PHASE 1 TESTS PASSED! ===\n');
}

runM2Phase1Tests().catch(err => {
  console.error('Phase 1 Test Error:', err);
  process.exit(1);
});
