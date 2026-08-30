const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFile } = require('child_process');
const AdmZip = require('adm-zip');
const { DOWNLOAD_CACHE } = require('./paths');

const activeDownloads = new Map();

/**
 * Downloads a file from URL to destination path with progress tracking.
 * @param {string} url - Remote URL
 * @param {string} destPath - Local destination file path
 * @param {function} onProgress - Callback (percent, downloaded, total)
 * @param {string} [id] - Optional ID for cancellation
 * @returns {Promise<string>} - Resolves with destPath
 */
function downloadFile(url, destPath, onProgress = () => {}, id = null) {
  return new Promise((resolve, reject) => {
    // Ensure parent dir exists
    const parentDir = path.dirname(destPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(url, {
      headers: {
        'User-Agent': 'ThemeStudio/1.0 (Linux; Electron)'
      }
    }, (res) => {
      // Handle HTTP redirects (301, 302, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        res.resume(); // Drain stream
        return downloadFile(redirectUrl, destPath, onProgress, id)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed with HTTP ${res.statusCode} ${res.statusMessage}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(destPath);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
          onProgress(percent, downloadedBytes, totalBytes);
        } else {
          // If content-length not provided, estimate progress
          onProgress(50, downloadedBytes, 0);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        if (id) activeDownloads.delete(id);
        onProgress(100, downloadedBytes, totalBytes);
        resolve(destPath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        if (id) activeDownloads.delete(id);
        reject(err);
      });
    });

    req.on('error', (err) => {
      fs.unlink(destPath, () => {});
      if (id) activeDownloads.delete(id);
      reject(err);
    });

    if (id) {
      activeDownloads.set(id, { req, destPath });
    }
  });
}

/**
 * Extracts a ZIP file to destination directory.
 * @param {string} zipPath - Path to .zip file
 * @param {string} destDir - Target directory
 */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destDir, true);
      resolve(destDir);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Extracts a .tar.xz / .tar.gz / .tar file to destination directory.
 * @param {string} tarPath - Path to tarball
 * @param {string} destDir - Target directory
 */
function extractTar(tarPath, destDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    execFile('tar', ['-xf', tarPath, '-C', destDir], (err, _stdout, stderr) => {
      if (err) {
        return reject(new Error(`Tar extraction failed: ${stderr || err.message}`));
      }
      resolve(destDir);
    });
  });
}

/**
 * Clones a git repository with shallow depth.
 * @param {string} repoUrl - Remote git URL
 * @param {string} destDir - Destination directory
 * @param {function} onProgress - Progress callback
 */
function gitClone(repoUrl, destDir, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destDir)) {
      // If repo already exists, perform git pull or reset
      onProgress(30, 'Updating repository...');
      execFile('git', ['pull', '--depth', '1'], { cwd: destDir }, (pullErr) => {
        if (!pullErr) {
          onProgress(70, 'Repository updated');
          return resolve(destDir);
        }
        // Fallback: clean and re-clone
        try {
          fs.rmSync(destDir, { recursive: true, force: true });
        } catch (_) {}
        doClone();
      });
    } else {
      doClone();
    }

    function doClone() {
      const parentDir = path.dirname(destDir);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      onProgress(20, 'Cloning repository...');
      const gitProcess = execFile('git', ['clone', '--depth', '1', repoUrl, destDir], (err, _stdout, stderr) => {
        if (err) {
          return reject(new Error(`Git clone failed: ${stderr || err.message}`));
        }
        onProgress(70, 'Repository cloned successfully');
        resolve(destDir);
      });
    }
  });
}

/**
 * Cancels an active download by ID.
 * @param {string} id
 */
function cancelDownload(id) {
  if (activeDownloads.has(id)) {
    const { req, destPath } = activeDownloads.get(id);
    try {
      req.abort();
    } catch (_) {}
    try {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
    } catch (_) {}
    activeDownloads.delete(id);
    return true;
  }
  return false;
}

module.exports = {
  downloadFile,
  extractZip,
  extractTar,
  gitClone,
  cancelDownload,
  DOWNLOAD_CACHE
};
