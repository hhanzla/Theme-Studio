// renderer/views/settings.view.js
// Modern Settings & System Paths Explorer View

window.SettingsView = {
  container: null,
  cacheSize: '0 B',

  async render(containerEl) {
    this.container = containerEl;
    await this.loadSettings();

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

    const isFlatpakSync = !!settings.flatpak_theme_sync;

    const pathItems = [
      { label: 'GTK Themes (User)', tag: 'User', path: paths.userGtkThemes || '~/.themes', desc: 'Legacy user GTK 2/3 themes folder' },
      { label: 'Themes (Local Share)', tag: 'User', path: paths.localShareThemes || '~/.local/share/themes', desc: 'Modern user XDG theme directory' },
      { label: 'Icons & Cursors (User)', tag: 'User', path: paths.userIcons || '~/.icons', desc: 'Legacy user icon and cursor sets' },
      { label: 'Icons (Local Share)', tag: 'User', path: paths.localShareIcons || '~/.local/share/icons', desc: 'Modern user XDG icon themes' },
      { label: 'System Themes', tag: 'System', path: paths.systemThemes || '/usr/share/themes', desc: 'Global root system themes' },
      { label: 'System Icons & Cursors', tag: 'System', path: paths.systemIcons || '/usr/share/icons', desc: 'Global root system icons' },
      { label: 'GNOME Shell Extensions', tag: 'User', path: paths.userExtensions || '~/.local/share/gnome-shell/extensions', desc: 'User installed GNOME shell extensions' }
    ];

    const pathRowsHtml = pathItems.map(item => `
      <div class="flex items-center justify-between p-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors gap-3">
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-zinc-900">${item.label}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${item.tag === 'System' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}">${item.tag}</span>
          </div>
          <span class="text-[11px] text-zinc-400 mt-0.5">${item.desc}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <code class="px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded text-[11px] font-mono text-zinc-700 select-all">${item.path}</code>
          <button class="p-1.5 rounded-md hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 btn-copy-path transition-all" data-path="${item.path}" title="Copy path">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
          </button>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="max-w-4xl flex flex-col gap-6">
        <!-- Section: Flatpak Integration -->
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-zinc-900">Application Integration</h3>
          <div class="p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-4 shadow-sm">
            <div class="flex flex-col gap-0.5">
              <div class="flex items-center gap-2">
                <strong class="text-xs font-bold text-zinc-900">Sync Themes with Flatpak Apps</strong>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${flatpakInstalled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-zinc-100 text-zinc-500'}">
                  ${flatpakInstalled ? 'Flatpak Detected' : 'Flatpak Not Found'}
                </span>
              </div>
              <p class="text-[11.5px] text-zinc-500">
                Automatically grants filesystem permissions (<code>~/.themes</code> and <code>~/.icons</code>) to Flatpak apps so installed GTK and icon themes apply consistently across sandbox apps.
              </p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="chk-flatpak-sync" ${isFlatpakSync ? 'checked' : ''} ${!flatpakInstalled ? 'disabled' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- Section: Storage & Cache -->
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-zinc-900">Storage &amp; Downloads Cache</h3>
          <div class="p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-4 shadow-sm">
            <div class="flex flex-col gap-0.5">
              <strong class="text-xs font-bold text-zinc-900">Temporary Downloads Cache</strong>
              <p class="text-[11.5px] text-zinc-500">
                Downloaded theme archives and temporary git repositories stored in <code>~/.cache/theme-studio/</code>.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="px-2 py-1 bg-zinc-100 border border-zinc-200 rounded text-xs font-mono text-zinc-700 settings-cache-badge">${this.cacheSize}</span>
              <button class="btn btn-secondary px-3 py-1.5 text-xs font-medium" id="btn-clear-cache">
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        <!-- Section: System Directories Explorer -->
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-zinc-900">Theme Directory Paths</h3>
          <p class="text-xs text-zinc-500">
            Locations where user and system themes, icons, cursors, and GNOME extensions are discovered on your filesystem.
          </p>
          <div class="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            ${pathRowsHtml}
          </div>
        </div>

        <!-- Section: About & System Info -->
        <div class="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs text-zinc-500 mb-6">
          <div class="flex items-center gap-2">
            <span class="font-bold text-zinc-800">Theme Studio</span>
            <span>•</span>
            <span>Version 1.0.0 (Linux Desktop Customizer)</span>
          </div>
          <span class="font-mono text-[11px] text-zinc-400">GNOME 42+ &amp; GTK4 Compatible</span>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Copy path buttons
    this.container.querySelectorAll('.btn-copy-path').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path) {
          navigator.clipboard.writeText(path).then(() => {
            showToast(`Copied "${path}" to clipboard!`, 'info');
          });
        }
      });
    });

    // Flatpak Sync Toggle
    const flatpakToggle = this.container.querySelector('#chk-flatpak-sync');
    if (flatpakToggle) {
      flatpakToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        try {
          const res = await window.electronAPI.settings.set({ flatpak_theme_sync: enabled });
          if (res && res.success) {
            showToast(enabled ? 'Flatpak theme synchronization enabled!' : 'Flatpak sync disabled.', 'success');
          } else {
            showToast('Failed to update Flatpak settings.', 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        }
      });
    }

    // Clear Cache Button
    const clearCacheBtn = this.container.querySelector('#btn-clear-cache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', async () => {
        clearCacheBtn.disabled = true;
        clearCacheBtn.textContent = 'Clearing...';
        try {
          if (window.electronAPI && window.electronAPI.uninstall && window.electronAPI.uninstall.clearCache) {
            const res = await window.electronAPI.uninstall.clearCache();
            if (res && res.success) {
              this.cacheSize = '0 B';
              const badge = this.container.querySelector('.settings-cache-badge');
              if (badge) badge.textContent = '0 B';
              showToast('Downloads cache cleared successfully!', 'success');
            } else {
              showToast('Cache is already empty.', 'info');
            }
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          clearCacheBtn.disabled = false;
          clearCacheBtn.textContent = 'Clear Cache';
        }
      });
    }
  }
};
