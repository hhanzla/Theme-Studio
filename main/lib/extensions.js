const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const AdmZip = require('adm-zip');

let cachedShellVersion = null;

/**
 * Gets the major GNOME Shell version (e.g. "46", "45", "44")
 */
function getGnomeShellVersion() {
  if (cachedShellVersion) return Promise.resolve(cachedShellVersion);

  return new Promise((resolve) => {
    execFile('gnome-shell', ['--version'], (err, stdout) => {
      if (err || !stdout) {
        cachedShellVersion = '46';
        return resolve('46');
      }
      const match = stdout.match(/GNOME Shell\s+([0-9]+)/i);
      cachedShellVersion = match && match[1] ? match[1] : '46';
      resolve(cachedShellVersion);
    });
  });
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) ThemeStudio/1.0'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGetJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
  });
}

function downloadFileToBuffer(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : `https://extensions.gnome.org${url}`;
    const req = https.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) ThemeStudio/1.0'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFileToBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} downloading extension`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
  });
}

/**
 * Searches or browses extensions on extensions.gnome.org
 */
async function searchOnlineExtensions({ query = '', page = 1, sort = 'popularity' } = {}) {
  try {
    const shellVer = await getGnomeShellVersion();
    let url = `https://extensions.gnome.org/extension-query/?page=${page}&n_per_page=18&shell_version=${shellVer}`;
    if (query && query.trim()) {
      url += `&search=${encodeURIComponent(query.trim())}`;
    } else {
      url += `&sort=${encodeURIComponent(sort || 'popularity')}`;
    }

    const data = await httpsGetJson(url);
    const rawList = data.extensions || [];

    const items = rawList.map(ext => {
      let iconUrl = '';
      if (ext.icon) {
        iconUrl = ext.icon.startsWith('http') ? ext.icon : `https://extensions.gnome.org${ext.icon}`;
      }
      let screenshotUrl = '';
      if (ext.screenshot) {
        screenshotUrl = ext.screenshot.startsWith('http') ? ext.screenshot : `https://extensions.gnome.org${ext.screenshot}`;
      }

      return {
        uuid: ext.uuid,
        name: ext.name,
        creator: ext.creator || '',
        creator_url: ext.creator_url ? `https://extensions.gnome.org${ext.creator_url}` : '',
        pk: ext.pk,
        description: ext.description || '',
        link: ext.link ? `https://extensions.gnome.org${ext.link}` : '',
        icon: iconUrl,
        screenshot: screenshotUrl,
        downloads: ext.downloads || 0,
        popularity: ext.popularity || 0,
        shell_version_map: ext.shell_version_map || {}
      };
    });

    return {
      success: true,
      extensions: items,
      total: data.total || items.length,
      shell_version: shellVer
    };
  } catch (err) {
    console.error('[Extensions searchOnlineExtensions] Error:', err);
    return { success: false, error: err.message, extensions: [] };
  }
}

/**
 * Downloads and installs an extension by pk and uuid from extensions.gnome.org
 */
async function installOnlineExtension({ pk, uuid }) {
  try {
    const shellVer = await getGnomeShellVersion();
    
    // 1. Fetch exact extension info
    let extInfo;
    try {
      extInfo = await httpsGetJson(`https://extensions.gnome.org/extension-info/?pk=${pk}&shell_version=${shellVer}`);
    } catch (_) {
      extInfo = await httpsGetJson(`https://extensions.gnome.org/extension-info/?pk=${pk}`);
    }

    const targetUuid = uuid || extInfo.uuid;
    const downloadUrl = extInfo.download_url;

    if (!targetUuid || !downloadUrl) {
      throw new Error(`Could not find compatible download URL for extension (PK: ${pk}, Shell: ${shellVer})`);
    }

    // 2. Download zip buffer
    const zipBuffer = await downloadFileToBuffer(downloadUrl);

    // 3. Extract to user's extensions folder: ~/.local/share/gnome-shell/extensions/<uuid>
    const userExtDir = path.join(os.homedir(), '.local', 'share', 'gnome-shell', 'extensions', targetUuid);
    if (!fs.existsSync(path.dirname(userExtDir))) {
      fs.mkdirSync(path.dirname(userExtDir), { recursive: true });
    }

    if (fs.existsSync(userExtDir)) {
      fs.rmSync(userExtDir, { recursive: true, force: true });
    }
    fs.mkdirSync(userExtDir, { recursive: true });

    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(userExtDir, true);

    // 4. Enable extension
    await new Promise((resolve) => {
      execFile('gnome-extensions', ['enable', targetUuid], () => {
        resolve();
      });
    });

    return {
      success: true,
      uuid: targetUuid,
      name: extInfo.name || targetUuid,
      installed_dir: userExtDir
    };
  } catch (err) {
    console.error('[Extensions installOnlineExtension] Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Uninstalls a user-installed GNOME extension
 */
async function uninstallExtension(uuid) {
  try {
    if (!uuid) return { success: false, error: 'No UUID provided' };

    // 1. Disable first
    await new Promise((resolve) => {
      execFile('gnome-extensions', ['disable', uuid], () => resolve());
    });

    // 2. Delete from ~/.local/share/gnome-shell/extensions/<uuid>
    const userExtDir = path.join(os.homedir(), '.local', 'share', 'gnome-shell', 'extensions', uuid);
    if (fs.existsSync(userExtDir)) {
      fs.rmSync(userExtDir, { recursive: true, force: true });
    }

    return { success: true, uuid };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getGnomeShellVersion,
  searchOnlineExtensions,
  installOnlineExtension,
  uninstallExtension
};
