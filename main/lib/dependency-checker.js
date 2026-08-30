const { execFile } = require('child_process');

/**
 * Checks which binaries from the list are missing on the system.
 * @param {string[]} binaryList - Array of binary names (e.g. ['sassc', 'python3'])
 * @returns {Promise<{ missing: string[] }>}
 */
function checkBinaries(binaryList = []) {
  return new Promise((resolve) => {
    if (!Array.isArray(binaryList) || binaryList.length === 0) {
      return resolve({ missing: [] });
    }

    const missing = [];
    let pending = binaryList.length;

    for (const bin of binaryList) {
      execFile('which', [bin], (err) => {
        if (err) {
          missing.push(bin);
        }
        pending--;
        if (pending === 0) {
          resolve({ missing });
        }
      });
    }
  });
}

/**
 * Installs missing packages using pkexec apt-get install.
 * @param {string[]} packages - Array of package names to install
 * @returns {Promise<{ success: boolean, output?: string, error?: string }>}
 */
function installDependencies(packages = []) {
  return new Promise((resolve) => {
    if (!Array.isArray(packages) || packages.length === 0) {
      return resolve({ success: true, message: 'No packages specified' });
    }

    const args = ['apt-get', 'install', '-y', ...packages];

    execFile('pkexec', args, (err, stdout, stderr) => {
      if (err) {
        console.error('[Deps] pkexec apt-get install failed:', stderr || err.message);
        return resolve({
          success: false,
          error: stderr || err.message
        });
      }
      resolve({
        success: true,
        output: stdout
      });
    });
  });
}

module.exports = {
  checkBinaries,
  installDependencies
};
