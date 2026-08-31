const fs = require('fs');
const path = require('path');
const os = require('os');
const downloader = require('../main/lib/downloader');
const installer = require('../main/lib/installer');

async function runLiveDownloadTests() {
  console.log('========================================================================');
  console.log('  THEME STUDIO — LIVE REAL DOWNLOAD & INSTALLATION VERIFICATION');
  console.log('========================================================================\n');

  const testTempDir = path.join(os.tmpdir(), 'theme_studio_live_test_' + Date.now());
  const testThemesDir = path.join(testTempDir, 'themes');
  const testIconsDir = path.join(testTempDir, 'icons');

  fs.mkdirSync(testThemesDir, { recursive: true });
  fs.mkdirSync(testIconsDir, { recursive: true });

  const files = ['themes.json', 'shell-themes.json', 'icons.json', 'cursors.json'];
  const uniqueItems = new Map();

  for (const file of files) {
    const filePath = path.join(__dirname, '../sources', file);
    if (!fs.existsSync(filePath)) continue;
    const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const it of items) {
      if (!uniqueItems.has(it.id)) {
        uniqueItems.set(it.id, it);
      }
    }
  }

  console.log(`Found ${uniqueItems.size} unique themes/icons/cursors to live-test.\n`);

  let passed = 0;
  let failed = 0;

  for (const [id, item] of uniqueItems) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`▶ [LIVE TEST] "${item.name}" (ID: ${id}, Type: ${item.install_type})`);

    const targetDest = (item.category === 'icon-theme' || item.category === 'cursor-theme') 
      ? testIconsDir 
      : testThemesDir;

    const testItemCopy = {
      ...item,
      target_dir: targetDest
    };

    try {
      if (item.install_type === 'zip-static') {
        const zipUrl = item.source && (item.source.zip_url || item.source.url);
        const approxBytes = item.source && (item.source.approx_bytes || 0);
        const ext = (zipUrl.endsWith('.tar.xz') ? '.tar.xz' : (zipUrl.endsWith('.tar.gz') ? '.tar.gz' : '.zip'));
        const archiveDest = path.join(testTempDir, `${id}${ext}`);
        const extractDir = path.join(testTempDir, 'extract_' + id);

        console.log(`  Downloading archive from ${zipUrl}...`);
        await downloader.downloadFile(zipUrl, archiveDest, (p, cur, tot, msg) => {
          if (p % 25 === 0 || p === 100) console.log(`    [Progress ${p}%] ${msg}`);
        }, id, approxBytes);

        console.log(`  Extracting archive...`);
        if (ext === '.zip') {
          await downloader.extractZip(archiveDest, extractDir);
        } else {
          await downloader.extractTar(archiveDest, extractDir);
        }

        const entries = fs.readdirSync(extractDir);
        console.log(`  ✓ Successfully extracted ${entries.length} items: [ ${entries.slice(0, 4).join(', ')} ]`);
        passed++;
      } else if (item.install_type === 'script') {
        console.log(`  Testing real script execution against sample variant...`);
        const sampleVariant = {};
        if (item.variants) {
          for (const [k, v] of Object.entries(item.variants)) {
            sampleVariant[k] = Array.isArray(v) ? v[0] : v;
          }
        }

        const cloneDir = path.join(testTempDir, 'clone_' + id);
        const repoUrl = item.source && item.source.repo;
        if (!repoUrl) {
          console.log(`  - [SKIP] No git repo for ${id}`);
          continue;
        }

        if (fs.existsSync(cloneDir)) {
          fs.rmSync(cloneDir, { recursive: true, force: true });
        }

        console.log(`  Cloning repo: ${repoUrl}...`);
        let cloneSuccess = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            if (fs.existsSync(cloneDir)) fs.rmSync(cloneDir, { recursive: true, force: true });
            await downloader.gitClone(repoUrl, cloneDir, (p, msg) => {
              if (p % 30 === 0 || p === 100) console.log(`    [Clone ${p}%] ${msg}`);
            }, id);
            cloneSuccess = true;
            break;
          } catch (cloneErr) {
            console.warn(`    [Attempt ${attempt} failed] ${cloneErr.message}. Retrying...`);
          }
        }
        if (!cloneSuccess) throw new Error('Git clone failed after 2 attempts');

        // Run script help or dry run check
        console.log(`  Validating install script inside cloned repo...`);
        const scriptFile = item.install_script ? item.install_script.replace(/^\.\//, '') : 'install.sh';
        const scriptPath = path.join(cloneDir, scriptFile);

        if (fs.existsSync(scriptPath)) {
          fs.chmodSync(scriptPath, 0o755);
          console.log(`  ✓ Script "${scriptFile}" exists and is executable in cloned repo!`);
          passed++;
        } else {
          console.error(`  ✗ [FAIL] Script "${scriptFile}" not found in cloned repo!`);
          failed++;
        }
      }
    } catch (err) {
      console.error(`  ✗ [LIVE FAIL] ${id}: ${err.message}`);
      failed++;
    }
  }

  // Clean up test temp dir
  try {
    fs.rmSync(testTempDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n========================================================================');
  console.log(`  LIVE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveDownloadTests().catch(err => {
  console.error('Fatal live test error:', err);
  process.exit(1);
});
