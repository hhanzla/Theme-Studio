const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchRawScript(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ThemeStudio-Test-Validator' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRawScript(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseSupportedFlagsFromBash(scriptContent) {
  const flags = new Set();
  
  // Match patterns like: -t|--theme), -i|-icon), --tweaks), -d|--dest)
  const caseMatches = scriptContent.match(/(-[a-zA-Z0-9_-]+(?:\|--?[a-zA-Z0-9_-]+)*)\)/g) || [];
  for (const m of caseMatches) {
    const rawPattern = m.replace(/\)$/, '');
    const subFlags = rawPattern.split('|').map(s => s.trim()).filter(Boolean);
    subFlags.forEach(f => flags.add(f));
  }

  // Also match show_help / usage definitions: -t, --theme, --tweaks
  const helpMatches = scriptContent.match(/(-{1,2}[a-zA-Z0-9_-]+)(?:,\s*(-{1,2}[a-zA-Z0-9_-]+))?/g) || [];
  for (const h of helpMatches) {
    const parts = h.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(p => {
      if (p.startsWith('-')) flags.add(p);
    });
  }

  return flags;
}

async function runLiveScriptArgsAudit() {
  console.log('=== Running Live Upstream Script Argument & CLI Switch Validator ===\n');

  const files = ['themes.json', 'shell-themes.json', 'icons.json'];
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(__dirname, '../sources', file);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`--- Auditing ${file} (${data.length} items) ---`);

    for (const item of data) {
      if (item.install_type !== 'script' || !item.install_script) {
        console.log(`  - [SKIP] ${item.name} (${item.id}) uses ${item.install_type}`);
        continue;
      }

      console.log(`\n  Checking: ${item.name} (${item.id})`);
      const tpl = item.install_args_template || '';

      // 1. Determine raw script URL
      const repoUrl = item.source && item.source.repo ? item.source.repo : '';
      if (!repoUrl) {
        console.warn(`    [!] No git repo specified on ${item.id}`);
        continue;
      }

      // Convert https://github.com/owner/repo.git -> https://raw.githubusercontent.com/owner/repo/master/install.sh
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        console.warn(`    [!] Non-github repo: ${repoUrl}`);
        continue;
      }

      const [, owner, repo] = match;
      const branch = item.source.branch || 'master';
      const cleanScriptPath = item.install_script.replace(/^\.\//, '');
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanScriptPath}`;

      console.log(`    Fetching upstream script: ${rawUrl}`);
      let scriptContent = '';
      try {
        scriptContent = await fetchRawScript(rawUrl);
        console.log(`    ✓ Fetched ${scriptContent.length} bytes from upstream`);
      } catch (err) {
        console.error(`    [FAIL] Could not fetch script from upstream: ${err.message}`);
        failed++;
        continue;
      }

      // 2. Parse supported switches from the actual bash script
      const supportedFlags = parseSupportedFlagsFromBash(scriptContent);
      console.log(`    Parsed ${supportedFlags.size} supported CLI switches from upstream script`);

      // 3. Extract all CLI flags present in our install_args_template
      const templateTokens = tpl.trim().split(/\s+/).filter(Boolean);
      const usedFlags = templateTokens.filter(tok => tok.startsWith('-'));

      let itemErrors = 0;

      for (const flag of usedFlags) {
        if (!supportedFlags.has(flag)) {
          // Check if it's a positional argument placeholder or invalid flag
          console.error(`    [FAIL] Flag "${flag}" in template "${tpl}" is NOT supported by upstream script!`);
          itemErrors++;
        } else {
          console.log(`    ✓ Verified flag "${flag}" is supported upstream`);
        }
      }

      // 4. Verify placeholders
      const placeholders = (tpl.match(/\{[a-zA-Z_]+\}/g) || []).map(p => p.slice(1, -1));
      console.log(`    Placeholders: [ ${placeholders.join(', ')} ]`);

      if (tpl.includes('{icon}') && !tpl.includes('-i {icon}')) {
        console.error(`    [FAIL] Bare {icon} placeholder found without -i flag!`);
        itemErrors++;
      }

      if (itemErrors === 0) {
        console.log(`    ==> ALL CLI switches for ${item.name} 100% verified against upstream script!`);
        passed++;
      } else {
        failed += itemErrors;
      }
    }
  }

  console.log(`\n================================================================`);
  console.log(`Live Script Verification Result: ${passed} Passed, ${failed} Failed`);
  console.log(`================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveScriptArgsAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
