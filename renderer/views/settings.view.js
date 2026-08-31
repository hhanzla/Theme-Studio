// Settings View Component for Theme Studio
window.SettingsView = {
  container: null,
  cacheSize: '0 B',

  async render(containerEl) {
    this.container = containerEl;
    await this.loadSettings();

    // Fetch cache size asynchronously in background
    this.fetchCacheSize().then(() => {
      const badge = this.container?.querySelector('.settings-cache-badge');
      if (badge) badge.textContent = this.cacheSize;
    });
  },

  async fetchCacheSize() {
    try {
      if (window.electronAPI && window.electronAPI.uninstall && window.electronAPI.uninstall.getCacheSize) {
        const res = await window.electronAPI.uninstall.getCacheSize();
        if (res && res.success) {
          this.cacheSize = res.formatted || '0 B';
        }
      }
    } catch (err) {
      console.warn('[SettingsView] Failed to fetch cache size:', err);
    }
  },

  async loadSettings() {
    let settings = {};
    let flatpakInstalled = false;
    let paths = {};

    try {
      const res = await window.electronAPI.settings.get();
      if (res && res.success) {
        settings = res.settings || {};
        flatpakInstalled = !!res.flatpakInstalled;
        paths = res.paths || {};
      }
    } catch (err) {
      console.error('[SettingsView] Failed to load settings:', err);
    }

    this.renderUI(settings, flatpakInstalled, paths);
  },

  renderUI(settings, flatpakInstalled, paths = {}) {
    if (!this.container) return;
    if (window.AppState && window.AppState.activeCategory !== 'settings') return;

    const isFlatpakSync = !!settings.flatpak_theme_sync;

    const pathItems = [
      {
        label: 'GTK Themes (User)',
        tag: 'User',
        tagClass: 'path-tag-user',
        path: paths.userGtkThemes || '~/.themes',
        desc: 'Legacy user GTK 2/3 themes folder'
      },
      {
        label: 'Themes (Local Share)',
        tag: 'User',
        tagClass: 'path-tag-user',
        path: paths.localShareThemes || '~/.local/share/themes',
        desc: 'Modern user XDG theme directory'
      },
      {
        label: 'Icons & Cursors (User)',
        tag: 'User',
        tagClass: 'path-tag-user',
        path: paths.userIcons || '~/.icons',
        desc: 'Legacy user icon and cursor sets'
      },
      {
        label: 'Icons (Local Share)',
        tag: 'User',
        tagClass: 'path-tag-user',
        path: paths.localShareIcons || '~/.local/share/icons',
        desc: 'Modern user XDG icon themes'
      },
      {
        label: 'System Themes',
        tag: 'System',
        tagClass: 'path-tag-system',
        path: paths.systemThemes || '/usr/share/themes',
        desc: 'Global root system themes'
      },
      {
        label: 'System Icons & Cursors',
        tag: 'System',
        tagClass: 'path-tag-system',
        path: paths.systemIcons || '/usr/share/icons',
        desc: 'Global root system icons'
      },
      {
        label: 'GNOME Shell Extensions',
        tag: 'User',
        tagClass: 'path-tag-user',
        path: paths.extensions || '~/.local/share/gnome-shell/extensions',
        desc: 'Installed user shell extensions'
      },
      {
        label: 'Wallpapers Directory',
        tag: 'User',
        tagClass: 'path-tag-user',
        path: paths.backgrounds || '~/.local/share/backgrounds',
        desc: 'Desktop background images'
      },
      {
        label: 'GTK4 / Libadwaita Config',
        tag: 'Config',
        tagClass: 'path-tag-config',
        path: paths.gtk4Config || '~/.config/gtk-4.0',
        desc: 'Modern Libadwaita styling overrides'
      },
      {
        label: 'GTK3 Config',
        tag: 'Config',
        tagClass: 'path-tag-config',
        path: paths.gtk3Config || '~/.config/gtk-3.0',
        desc: 'GTK3 settings and CSS'
      },
      {
        label: 'Theme Studio State Store',
        tag: 'Config',
        tagClass: 'path-tag-config',
        path: paths.appData || '~/.config/themestudio',
        desc: 'Installed records & preferences'
      },
      {
        label: 'Download & Build Cache',
        tag: 'Cache',
        tagClass: 'path-tag-cache',
        path: paths.downloadCache || '~/.cache/themestudio/downloads',
        desc: 'Cloned repos & downloaded archives'
      }
    ];

    const pathsHtml = pathItems.map(p => `
      <div class="path-card">
        <div class="path-info">
          <div class="path-header">
            <span class="path-label">${p.label}</span>
            <span class="path-tag ${p.tagClass}">${p.tag}</span>
          </div>
          <code class="path-value" title="${p.path}">${p.path}</code>
        </div>
        <div class="path-actions">
          <button class="btn-open-path" data-path="${p.path}" title="Open folder in File Manager">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Open
          </button>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="settings-view-container">
        <!-- Section: Integrations -->
        <div class="settings-section">
          <h3 class="settings-section-title">Integrations & Compatibility</h3>
          <p class="settings-section-desc">Manage system-level hooks and application sandboxing integration.</p>

          <div class="settings-card">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Flatpak Theme Sync</strong>
                <span class="badge-tag ${flatpakInstalled ? 'badge-installed' : 'badge-script'}">
                  ${flatpakInstalled ? 'Flatpak Detected' : 'Flatpak Not Found'}
                </span>
              </div>
              <p class="settings-option-desc">
                Grants filesystem permissions to Flatpak sandbox (<code>~/.themes</code>, <code>~/.icons</code>, <code>~/.config/gtk-4.0</code>) so sandboxed apps automatically inherit installed themes.
              </p>
            </div>
            <div class="settings-card-right">
              <label class="switch">
                <input type="checkbox" id="toggle-flatpak-sync" ${isFlatpakSync ? 'checked' : ''} ${!flatpakInstalled ? 'disabled' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Section: Storage Paths -->
        <div class="settings-section">
          <h3 class="settings-section-title">System Paths & Storage (${pathItems.length} Directories)</h3>
          <p class="settings-section-desc">All standard theme directories, config folders, and cache paths used across GNOME and Theme Studio.</p>

          <div class="settings-paths-grid">
            ${pathsHtml}
          </div>
        </div>

        <!-- Section: System Maintenance -->
        <div class="settings-section">
          <h3 class="settings-section-title">System Maintenance</h3>
          <p class="settings-section-desc">Quick actions to manage storage and clear downloaded theme cache.</p>

          <div class="settings-card">
            <div class="settings-card-left">
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong>Clear Download Cache</strong>
                <span class="cache-badge settings-cache-badge">${this.cacheSize}</span>
              </div>
              <p class="settings-option-desc">Clears all cached git clones and downloaded zip archives from <code>~/.cache/themestudio</code> to free disk space without affecting installed themes.</p>
            </div>
            <div class="settings-card-right">
              <button class="card-btn btn-secondary" id="btn-settings-clear-cache" style="display: inline-flex; align-items: center; gap: 6px;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        <!-- Section: About -->
        <div class="settings-section">
          <h3 class="settings-section-title">About Theme Studio</h3>
          <div class="settings-card">
            <div class="settings-card-left">
              <strong>Theme Studio v1.0.0</strong>
              <p class="settings-option-desc">Curated GNOME Theme, Icon, and Cursor Manager for modern Linux.</p>
            </div>
            <div class="settings-card-right">
              <span class="meta-chip">Milestone 1</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire Open Path Buttons
    this.container.querySelectorAll('.btn-open-path').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetPath = btn.getAttribute('data-path');
        if (!targetPath) return;
        try {
          await window.electronAPI.settings.openPath(targetPath);
          showToast(`Opened folder in File Manager`, 'info');
        } catch (err) {
          showToast(`Failed to open folder: ${err.message}`, 'warning');
        }
      });
    });

    // Wire Clear Cache Button with identical confirmation dialog
    const clearCacheBtn = this.container.querySelector('#btn-settings-clear-cache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        window.ConfirmDialog.show({
          title: 'Clear Download Cache',
          subtitle: `Freed space: ${this.cacheSize}`,
          message: 'Are you sure you want to delete all cached download archives (.zip, .tar.xz) and temporary Git clones? This frees up disk space and will NOT affect your installed themes.',
          confirmText: 'Clear Cache',
          cancelText: 'Cancel',
          onConfirm: async () => {
            showToast('Clearing download and extraction cache...', 'info');
            try {
              const res = await window.electronAPI.uninstall.clearCache();
              if (res && res.success) {
                showToast('Download cache cleared successfully!', 'success');
                await this.fetchCacheSize();
                const badge = this.container?.querySelector('.settings-cache-badge');
                if (badge) badge.textContent = this.cacheSize;
              } else {
                showToast(`Failed to clear cache: ${res ? res.error : 'Unknown error'}`, 'warning');
              }
            } catch (err) {
              showToast(`Error clearing cache: ${err.message}`, 'warning');
            }
          }
        });
      });
    }

    // Wire Flatpak Toggle
    const toggleEl = this.container.querySelector('#toggle-flatpak-sync');
    if (toggleEl) {
      toggleEl.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        showToast(enabled ? 'Applying Flatpak filesystem overrides...' : 'Removing Flatpak overrides...', 'info');

        try {
          const res = await window.electronAPI.settings.set({
            key: 'flatpak_theme_sync',
            value: enabled
          });

          if (res && res.success) {
            showToast(enabled ? 'Flatpak theme sync enabled!' : 'Flatpak theme sync disabled', 'success');
          } else {
            e.target.checked = !enabled;
            showToast(`Failed to update Flatpak override: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          e.target.checked = !enabled;
          showToast(`Error: ${err.message}`, 'warning');
        }
      });
    }
  }
};
