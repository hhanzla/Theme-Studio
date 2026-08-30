const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFile, spawn } = require('child_process');
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

      const tempPartPath = `${destPath}.part`;
      const fileStream = fs.createWriteStream(tempPartPath);

      if (id) {
        activeDownloads.set(id, { req, destPath: tempPartPath, finalPath: destPath });
      }

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = Math.min(99, Math.round((downloadedBytes / totalBytes) * 100));
          const mbs = (downloadedBytes / (1024 * 1024)).toFixed(1);
          const totalMbs = (totalBytes / (1024 * 1024)).toFixed(1);
          onProgress(percent, downloadedBytes, totalBytes, `Downloading ${mbs}/${totalMbs} MB (${percent}%)`);
        } else {
          const mbs = (downloadedBytes / (1024 * 1024)).toFixed(1);
          onProgress(50, downloadedBytes, 0, `Downloading ${mbs} MB`);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          if (totalBytes > 0 && downloadedBytes < totalBytes) {
            try { fs.unlinkSync(tempPartPath); } catch (_) {}
            if (id) activeDownloads.delete(id);
            return reject(new Error(`Download interrupted: received ${downloadedBytes} of ${totalBytes} bytes`));
          }
          try {
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            fs.renameSync(tempPartPath, destPath);
          } catch (err) {
            return reject(err);
          }
          if (id) activeDownloads.delete(id);
          onProgress(100, downloadedBytes, totalBytes, 'Download complete');
          resolve(destPath);
        });
      });

      fileStream.on('error', (err) => {
        try { fs.unlinkSync(tempPartPath); } catch (_) {}
        if (id) activeDownloads.delete(id);
        reject(err);
      });
    });

    req.on('error', (err) => {
      try { fs.unlinkSync(`${destPath}.part`); } catch (_) {}
      if (id) activeDownloads.delete(id);
      reject(err);
    });

    if (id) {
      activeDownloads.set(id, { req, destPath: `${destPath}.part`, finalPath: destPath });
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
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    execFile('unzip', ['-o', '-q', zipPath, '-d', destDir], (err) => {
      if (err) {
        try {
          const zip = new AdmZip(zipPath);
          zip.extractAllTo(destDir, true);
          return resolve(destDir);
        } catch (admErr) {
          return reject(new Error(`ZIP extraction failed: ${err.message || admErr.message}`));
        }
      }
      resolve(destDir);
    });
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
function gitClone(repoUrl, destDir, onProgress = () => {}, id = null) {
  return new Promise((resolve, reject) => {
    let highestPercent = 0;

    const reportProgress = (pct, msg) => {
      highestPercent = Math.max(highestPercent, Math.min(99, pct));
      onProgress(highestPercent, msg);
    };

    if (fs.existsSync(destDir)) {
      // If repo already exists, perform git pull or reset
      reportProgress(10, 'Updating repository...');
      const pullProc = spawn('git', ['pull', '--depth', '1', '--progress'], { cwd: destDir });
      if (id) {
        activeDownloads.set(id, { proc: pullProc, destPath: destDir });
      }

      pullProc.stderr.on('data', (data) => {
        const text = data.toString();
        const match = text.match(/Receiving objects:\s*(\d+)%/i) || text.match(/(\d+)%/);
        if (match) {
          const pct = Math.min(95, Math.max(10, parseInt(match[1], 10)));
          reportProgress(pct, `Updating repository (${pct}%)...`);
        }
      });

      pullProc.on('close', (code) => {
        if (id) activeDownloads.delete(id);
        if (code === 0) {
          onProgress(100, 'Repository updated');
          return resolve(destDir);
        }
        // Fallback: clean and re-clone
        try {
          fs.rmSync(destDir, { recursive: true, force: true });
        } catch (_) {}
        doClone();
      });

      pullProc.on('error', () => {
        if (id) activeDownloads.delete(id);
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

      reportProgress(0, 'Connecting...');

      const cloneArgs = ['clone', '--depth', '1', '--progress', repoUrl, destDir];

      const gitProcess = spawn('git', cloneArgs);
      if (id) {
        activeDownloads.set(id, { proc: gitProcess, destPath: destDir });
      }

      let lastMessage = 'Cloning repository...';

      gitProcess.stderr.on('data', (data) => {
        const text = data.toString();
        const recvMatch = text.match(/Receiving objects:\s*(\d+)%(?:.*?,\s*([\d.]+\s*[KMG]iB(?:\s*\|\s*[\d.]+\s*[KMG]iB\/s)?))?/i);
        const deltaMatch = text.match(/Resolving deltas:\s*(\d+)%/i);
        const mibMatch = text.match(/([\d.]+)\s*MiB(?:\s*\|\s*([\d.]+\s*[KMG]iB\/s))?/i);
        const kibMatch = text.match(/([\d.]+)\s*KiB(?:\s*\|\s*([\d.]+\s*[KMG]iB\/s))?/i);

        if (recvMatch) {
          const pct = parseInt(recvMatch[1], 10);
          const speed = recvMatch[2] ? ` (${recvMatch[2]})` : '';
          if (pct > 0) {
            lastMessage = `Downloading ${pct}%${speed}`;
            reportProgress(Math.round(15 + (pct * 0.60)), lastMessage);
          } else if (mibMatch) {
            const mbs = parseFloat(mibMatch[1]);
            const spd = mibMatch[2] ? ` (${mibMatch[2]})` : '';
            lastMessage = `Downloading ${mbs.toFixed(1)} MB${spd}`;
            reportProgress(Math.min(70, Math.round(15 + (mbs * 1.5))), lastMessage);
          } else if (kibMatch) {
            const kbs = parseFloat(kibMatch[1]);
            const spd = kibMatch[2] ? ` (${kibMatch[2]})` : '';
            lastMessage = `Downloading ${Math.round(kbs)} KB${spd}`;
            reportProgress(16, lastMessage);
          }
        } else if (deltaMatch) {
          const pct = parseInt(deltaMatch[1], 10);
          lastMessage = `Extracting ${pct}%`;
          reportProgress(Math.round(75 + (pct * 0.20)), lastMessage);
        } else if (mibMatch) {
          const mbs = parseFloat(mibMatch[1]);
          const spd = mibMatch[2] ? ` (${mibMatch[2]})` : '';
          lastMessage = `Downloading ${mbs.toFixed(1)} MB${spd}`;
          reportProgress(Math.min(70, Math.round(15 + (mbs * 1.5))), lastMessage);
        }
      });

      gitProcess.on('close', async (code) => {
        if (code !== 0) {
          if (id) activeDownloads.delete(id);
          return reject(new Error(`Git clone failed with code ${code}: ${lastMessage}`));
        }

        if (id) activeDownloads.delete(id);
        onProgress(100, 'Repository cloned successfully');
        resolve(destDir);
      });

      gitProcess.on('error', (err) => {
        if (id) activeDownloads.delete(id);
        reject(new Error(`Git clone process error: ${err.message}`));
      });
    }
  });
}

/**
 * Cancels an active download or git process by ID and removes cached files.
 * @param {string} id
 */
function cancelDownload(id) {
  if (activeDownloads.has(id)) {
    const entry = activeDownloads.get(id);
    activeDownloads.delete(id);
    if (entry.req) {
      try { entry.req.abort(); } catch (_) {}
    }
    if (entry.proc) {
      try { entry.proc.kill('SIGKILL'); } catch (_) {}
    }
    if (entry.destPath && fs.existsSync(entry.destPath)) {
      try {
        if (fs.statSync(entry.destPath).isDirectory()) {
          fs.rmSync(entry.destPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(entry.destPath);
        }
      } catch (_) {}
    }
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
