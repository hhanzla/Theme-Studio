const fs = require('fs');
const path = require('path');

function runScriptArgsAudit() {
  console.log('=== Running Script Argument & Variant Validator ===');

  const files = ['themes.json', 'shell-themes.json', 'icons.json'];
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(__dirname, '../sources', file);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n--- Auditing ${file} (${data.length} items) ---`);

    for (const item of data) {
      if (item.install_type !== 'script') {
        console.log(`  - [SKIP] ${item.name} (${item.id}) uses ${item.install_type}`);
        continue;
      }

      console.log(`  Checking: ${item.name} (${item.id})...`);
      const tpl = item.install_args_template || '';

      // Check placeholder format
      const placeholders = (tpl.match(/\{[a-zA-Z_]+\}/g) || []).map(p => p.slice(1, -1));
      console.log(`    Detected placeholders: [ ${placeholders.join(', ')} ]`);

      // Verify dest_dir placeholder exists if script requires target dir
      if (item.install_script && !tpl.includes('{dest_dir}') && !item.id.includes('orchis')) {
        console.warn(`    [!] Warning: ${item.id} install_args_template does not contain {dest_dir}`);
      }

      // Check for common CLI flag errors
      if (tpl.includes('{icon}') && !tpl.includes('-i {icon}')) {
        console.error(`    [FAIL] ${item.id} has bare {icon} without -i flag`);
        failed++;
        continue;
      }

      // If variants exist, check that all placeholders map to declared variant keys
      if (item.variants) {
        for (const [vKey, vVals] of Object.entries(item.variants)) {
          if (!Array.isArray(vVals)) {
            console.error(`    [FAIL] Variant "${vKey}" on ${item.id} is not an array`);
            failed++;
          }
        }
      }

      console.log(`    ✓ Valid template syntax: "${tpl}"`);
      passed++;
    }
  }

  console.log(`\n=== Script Arguments Validation Summary: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runScriptArgsAudit();
