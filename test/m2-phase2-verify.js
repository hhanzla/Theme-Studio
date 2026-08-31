// test/m2-phase2-verify.js
// Verification for Milestone 2 - Phase 2: GDM Session Enablement & Status Checks

const assert = require('assert');
const gdm = require('../main/lib/gdm');

async function runM2Phase2Tests() {
  console.log('=== Running Milestone 2: Phase 2 Unit Tests ===\n');

  // 1. Verify Extension UUIDs
  console.log('--- 1. Testing Extension UUIDs ---');
  assert.strictEqual(gdm.GSE_GDM_UUID, 'gdm-extension@pratap.fastmail.fm');
  assert.strictEqual(gdm.USER_THEMES_UUID, 'user-theme@gnome-shell-extensions.gcampax.github.com');
  console.log('✓ Extension UUIDs verified successfully!\n');

  // 2. Verify checkGdmStatus structure
  console.log('--- 2. Testing checkGdmStatus Structure ---');
  const status = await gdm.checkGdmStatus();
  assert.strictEqual(status.success, true);
  assert.strictEqual(typeof status.gseGdmInstalled, 'boolean');
  console.log(`✓ checkGdmStatus verified (Installed: ${status.gseGdmInstalled})\n`);

  // 3. Verify validation on missing parameters
  console.log('--- 3. Testing Parameter Validations ---');
  const emptyThemeRes = await gdm.setGdmShellTheme('');
  assert.strictEqual(emptyThemeRes.success, false);
  assert.strictEqual(emptyThemeRes.error, 'Theme name required');

  const emptyBgRes = await gdm.setGdmBackground('');
  assert.strictEqual(emptyBgRes.success, false);
  assert.strictEqual(emptyBgRes.error, 'Background path required');
  console.log('✓ Parameter validation verified successfully!\n');

  console.log('=== ALL MILESTONE 2: PHASE 2 TESTS PASSED! ===\n');
}

runM2Phase2Tests().catch(err => {
  console.error('Phase 2 Test Error:', err);
  process.exit(1);
});
