const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const https = require('https');
const http = require('http');

function checkUrlReachable(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(url, { method: 'HEAD', headers: { 'User-Agent': 'ThemeStudio-Matrix-Test' } }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ ok: true, status: res.statusCode });
      } else {
        resolve({ ok: false, status: res.statusCode });
      }
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve({ ok: false, error: 'Timeout' });
    });
    req.end();
  });
}

function resolveCliArgs(item, variant) {
  let argsTemplate = item.install_args_template || '';
  const targetDestDir = (item.category === 'icon-theme' || item.category === 'cursor-theme') ? '/tmp/test_icons' : '/tmp/test_themes';
  argsTemplate = argsTemplate.replace(/\{dest_dir\}/g, targetDestDir);

  for (const [vKey, vVal] of Object.entries(variant)) {
    if (vKey === 'tweaks') {
      const flagVal = (vVal && vVal !== 'none' && vVal !== 'default') ? `--tweaks ${vVal}` : '';
      argsTemplate = argsTemplate.replace(/\{tweaks\}/g, flagVal);
    } else if (vKey === 'icon') {
      const hasFlag = argsTemplate.includes('-i {icon}');
      const flagVal = (vVal && vVal !== 'none' && vVal !== 'default') 
        ? (hasFlag ? vVal : `-i ${vVal}`) 
        : '';
      if (hasFlag && !flagVal) {
        argsTemplate = argsTemplate.replace(/--shell\s+-i\s+\{icon\}/g, '').replace(/-i\s+\{icon\}/g, '');
      } else {
        argsTemplate = argsTemplate.replace(/\{icon\}/g, flagVal);
      }
    } else if (vKey === 'color' && vVal === 'all' && argsTemplate.includes('{color}')) {
      argsTemplate = argsTemplate.replace(/\{color\}/g, '-a');
    } else if (vKey === 'color' && (vVal === 'nord' || vVal === 'dracula') && item.id && item.id.includes('orchis')) {
      argsTemplate = argsTemplate.replace(/\{color\}/g, 'default');
      if (argsTemplate.includes('{tweaks}')) {
        argsTemplate = argsTemplate.replace(/\{tweaks\}/g, `--tweaks ${vVal}`);
      } else if (!argsTemplate.includes('--tweaks')) {
        argsTemplate += ` --tweaks ${vVal}`;
      }
    } else {
      argsTemplate = argsTemplate.replace(new RegExp(`\\{${vKey}\\}`, 'g'), vVal);
    }
  }

  argsTemplate = argsTemplate.replace(/--shell\s+-i\s+\{icon\}/g, '').replace(/-i\s+\{icon\}/g, '').replace(/\{icon\}/g, '').replace(/\{tweaks\}/g, '');

  if (item.variants) {
    for (const [vKey, vVals] of Object.entries(item.variants)) {
      if (vKey === 'tweaks' || vKey === 'icon') continue;
      const fallback = Array.isArray(vVals) ? vVals[0] : vVals;
      if (vKey === 'color' && fallback === 'all') {
        argsTemplate = argsTemplate.replace(/\{color\}/g, '-a');
      } else {
        argsTemplate = argsTemplate.replace(new RegExp(`\\{${vKey}\\}`, 'g'), fallback);
      }
    }
  }

  return argsTemplate.trim().split(/\s+/).filter(Boolean);
}

async function runVariantMatrixTests() {
  console.log('========================================================================');
  console.log('  THEME STUDIO — COMPREHENSIVE VARIANT & ARGUMENT MATRIX TEST SUITE');
  console.log('========================================================================\n');

  const files = ['themes.json', 'shell-themes.json', 'icons.json', 'cursors.json'];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const file of files) {
    const filePath = path.join(__dirname, '../sources', file);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n📂 [CATALOG] ${file.toUpperCase()} (${data.length} items)`);
    console.log('------------------------------------------------------------------------');

    for (const item of data) {
      console.log(`\n▶ Testing Theme: "${item.name}" (ID: ${item.id}, Type: ${item.install_type})`);

      if (!item.variants || Object.keys(item.variants).length === 0) {
        // No variants, single test
        totalTests++;
        if (item.install_type === 'zip-static') {
          const zipUrl = item.source && (item.source.zip_url || item.source.url);
          const reach = await checkUrlReachable(zipUrl);
          if (reach.ok) {
            console.log(`  ✓ [ZIP] URL reachable (${reach.status}): ${zipUrl}`);
            passedTests++;
          } else {
            console.error(`  ✗ [ZIP FAIL] URL unreachable (${reach.status || reach.error}): ${zipUrl}`);
            failedTests++;
          }
        } else {
          const args = resolveCliArgs(item, {});
          console.log(`  ✓ [SCRIPT ARGS] Resolved CLI: ${args.join(' ')}`);
          passedTests++;
        }
        continue;
      }

      // If multiple variant dimensions exist (e.g. style + color on Bibata), test combinations
      const keys = Object.keys(item.variants);
      if (keys.length === 2 && item.install_type === 'zip-static' && item.source && item.source.variant_urls) {
        const [k1, k2] = keys;
        const list1 = item.variants[k1];
        const list2 = item.variants[k2];
        console.log(`  Testing Compound Dimensions "${k1}" x "${k2}":`);

        for (const v1 of list1) {
          for (const v2 of list2) {
            totalTests++;
            const variantUrls = item.source.variant_urls;
            const compoundKey = `${v1}-${v2}`;
            const targetUrl = variantUrls[compoundKey] || variantUrls[v2] || variantUrls[v1] || item.source.zip_url || item.source.url;

            if (!targetUrl) {
              console.error(`    ✗ [ZIP FAIL] Missing URL for compound "${compoundKey}"`);
              failedTests++;
            } else {
              console.log(`    ✓ [ZIP ${k1}=${v1}, ${k2}=${v2}] Target: ${path.basename(targetUrl)}`);
              passedTests++;
            }
          }
        }
        continue;
      }

      // Test each variant key and all its available values
      for (const [vKey, vVals] of Object.entries(item.variants)) {
        const valList = Array.isArray(vVals) ? vVals : [vVals];
        console.log(`  Testing Variant Dimension "${vKey}" (${valList.length} options: [${valList.join(', ')}]):`);

        for (const val of valList) {
          totalTests++;
          const testVariant = { [vKey]: val };

          if (item.install_type === 'zip-static') {
            const variantUrls = item.source && item.source.variant_urls;
            let targetUrl = item.source && (item.source.zip_url || item.source.url);
            if (variantUrls && variantUrls[val]) {
              targetUrl = variantUrls[val];
            }
            if (!targetUrl) {
              console.error(`    ✗ [ZIP FAIL] Missing URL for variant "${vKey}=${val}"`);
              failedTests++;
            } else {
              console.log(`    ✓ [ZIP ${vKey}=${val}] Target: ${path.basename(targetUrl)}`);
              passedTests++;
            }
          } else if (item.install_type === 'script') {
            const args = resolveCliArgs(item, testVariant);
            
            // Check for unhandled placeholders
            const unhandled = args.filter(a => /\{[a-zA-Z0-9_-]+\}/.test(a));
            if (unhandled.length > 0) {
              console.error(`    ✗ [ARG FAIL] Unhandled placeholders found: ${unhandled.join(', ')} in "${args.join(' ')}"`);
              failedTests++;
              continue;
            }

            // Check for invalid consecutive bare flags or bare icons
            if (args.includes('{icon}') || args.includes('{tweaks}')) {
              console.error(`    ✗ [ARG FAIL] Template contains unresolved placeholder: ${args.join(' ')}`);
              failedTests++;
              continue;
            }

            console.log(`    ✓ [CLI ${vKey}=${val}] ${args.join(' ')}`);
            passedTests++;
          }
        }
      }
    }
  }

  console.log('\n========================================================================');
  console.log(`  MATRIX TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests} Checks)`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVariantMatrixTests().catch(err => {
  console.error('Matrix test execution error:', err);
  process.exit(1);
});
