// renderer/views/extensions.view.js
// Modern GNOME Shell Extensions Manager View (Local & Online)

window.ExtensionsView = {
  container: null,
  activeMode: 'browse',
  installedFilter: 'all',
  installedExtensions: [],
  onlineExtensions: [],
  isLoading: false,
  searchQuery: '',
  searchDebounceTimer: null,
  installingUuids: new Set(),

  async render(containerEl) {
    this.container = containerEl;
    await this.loadInstalled();
    if (this.activeMode === 'browse' && this.onlineExtensions.length === 0) {
      await this.loadOnline();
    } else {
      this.renderSubtabs();
      this.renderView();
    }
  },

  async loadInstalled() {
    try {
      const res = await window.electronAPI.extensions.list();
      if (res && res.success) {
        this.installedExtensions = res.extensions || [];
      } else {
        this.installedExtensions = [];
      }
    } catch (err) {
      console.error('[ExtensionsView] Failed to load local extensions:', err);
      this.installedExtensions = [];
    }
  },

  async loadOnline(query = '') {
    this.isLoading = true;
    this.renderSubtabs();
    this.renderLoading();

    try {
      const res = await window.electronAPI.extensions.search({ query, page: 1, sort: 'popularity' });
      if (res && res.success) {
        this.onlineExtensions = res.extensions || [];
      } else {
        this.onlineExtensions = [];
        if (res && res.error) {
          showToast(`Error searching extensions: ${res.error}`, 'warning');
        }
      }
    } catch (err) {
      console.error('[ExtensionsView] Failed to query extensions.gnome.org:', err);
      this.onlineExtensions = [];
      showToast(`Failed to connect to extensions.gnome.org: ${err.message}`, 'warning');
    } finally {
      this.isLoading = false;
      this.renderSubtabs();
      this.renderView();
    }
  },

  renderSubtabs() {
    const subtabsBar = document.querySelector('.subtabs-bar');
    if (!subtabsBar) return;

    subtabsBar.style.display = 'flex';

    const installedCount = this.installedExtensions.length;
    const onlineCount = this.onlineExtensions.length;
    const onlineCountDisplay = this.isLoading
      ? '...'
      : (onlineCount >= 100 ? '100+' : (onlineCount > 0 ? String(onlineCount) : '0'));

    subtabsBar.innerHTML = `
      <div class="flex items-center gap-2 py-2 border-b border-zinc-200 w-full">
        <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeMode === 'browse' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-mode="browse" id="ext-tab-browse">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <span>Browse Online</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeMode === 'browse' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${onlineCountDisplay}</span>
        </button>
        <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeMode === 'installed' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-mode="installed" id="ext-tab-installed">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>Installed</span>
          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeMode === 'installed' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${installedCount}</span>
        </button>
      </div>
    `;

    subtabsBar.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode === this.activeMode) return;
        this.activeMode = mode;
        this.renderSubtabs();
        if (this.activeMode === 'browse' && this.onlineExtensions.length === 0) {
          this.loadOnline(this.searchQuery);
        } else {
          this.renderView();
        }
      });
    });
  },

  renderLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="col-span-full py-16 flex flex-col items-center justify-center text-zinc-400">
        <svg class="animate-spin -ml-1 mr-2.5 h-6 w-6 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-xs mt-2 font-medium">Querying extensions.gnome.org repository...</span>
      </div>
    `;
  },

  renderView() {
    if (!this.container) return;
    if (this.activeMode === 'browse') {
      this.renderOnlineGrid();
    } else {
      this.renderInstalledGrid();
    }
  },

  renderOnlineGrid() {
    if (this.onlineExtensions.length === 0) {
      this.container.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          </div>
          <h3 class="text-sm font-bold text-zinc-800">No Extensions Found</h3>
          <p class="text-xs text-zinc-500 mt-1 max-w-sm">No results match your search. Try searching for "Blur", "Dash to Dock", or "AppIndicator".</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.onlineExtensions.map(ext => this.renderOnlineCard(ext)).join('');

    // Wire install button
    this.container.querySelectorAll('.btn-install-ext').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const uuid = btn.getAttribute('data-uuid');
        const pk = btn.getAttribute('data-pk');
        const name = btn.getAttribute('data-name');

        btn.disabled = true;
        btn.innerHTML = `<svg class="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Installing...`;
        showToast(`Installing ${name}...`, 'info');

        try {
          const res = await window.electronAPI.extensions.install({ uuid, pk });
          if (res && res.success) {
            showToast(`${name} installed and enabled!`, 'success');
            await this.loadInstalled();
            this.renderSubtabs();
            this.renderOnlineGrid();
          } else {
            showToast(`Installation failed: ${res ? res.error : 'Unknown error'}`, 'warning');
            btn.disabled = false;
            btn.textContent = 'Install';
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
          btn.disabled = false;
          btn.textContent = 'Install';
        }
      });
    });
  },

  renderOnlineCard(ext) {
    const isInstalled = this.installedExtensions.some(e => e.uuid === ext.uuid);
    const downloadsText = ext.downloads ? `${Number(ext.downloads).toLocaleString()} downloads` : '';

    return `
      <div class="theme-card group relative bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col p-4" data-uuid="${ext.uuid}">
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <h4 class="text-xs font-bold text-zinc-900 leading-snug truncate flex-1">${ext.name}</h4>
          ${ext.icon ? `<img src="https://extensions.gnome.org${ext.icon}" class="w-6 h-6 rounded shrink-0 object-contain" onerror="this.remove()" />` : ''}
        </div>

        <span class="text-[11px] text-zinc-400 font-mono truncate mb-2">${ext.uuid}</span>

        <p class="text-xs text-zinc-500 line-clamp-3 leading-relaxed mb-3 flex-1">${ext.description || 'GNOME Shell extension.'}</p>

        <div class="flex items-center justify-between pt-2.5 border-t border-zinc-100 mt-auto">
          <span class="text-[10.5px] text-zinc-400 font-medium">${downloadsText}</span>
          ${isInstalled ? `
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Installed
            </span>
          ` : `
            <button class="btn btn-primary btn-install-ext px-3 py-1.5 text-xs font-semibold" data-pk="${ext.pk}" data-uuid="${ext.uuid}" data-name="${ext.name}">
              Install
            </button>
          `}
        </div>
      </div>
    `;
  },

  renderInstalledGrid() {
    let filtered = this.installedExtensions;

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const nameMatch = (e.name || '').toLowerCase().includes(q);
        const uuidMatch = (e.uuid || '').toLowerCase().includes(q);
        const descMatch = (e.description || '').toLowerCase().includes(q);
        return nameMatch || uuidMatch || descMatch;
      });
    }

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          </div>
          <h3 class="text-sm font-bold text-zinc-800">No Installed Extensions Found</h3>
          <p class="text-xs text-zinc-500 mt-1 max-w-sm">You can browse and install new extensions from the "Browse Online" tab above.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(ext => this.renderInstalledCard(ext)).join('');

    // Toggle switch handler
    this.container.querySelectorAll('.extension-toggle').forEach(input => {
      input.addEventListener('change', async () => {
        const uuid = input.getAttribute('data-uuid');
        const enable = input.checked;

        showToast(`${enable ? 'Enabling' : 'Disabling'} ${uuid}...`, 'info');

        try {
          const res = enable 
            ? await window.electronAPI.extensions.enable(uuid)
            : await window.electronAPI.extensions.disable(uuid);

          if (res && res.success) {
            showToast(`${uuid} ${enable ? 'enabled' : 'disabled'}!`, 'success');
            const target = this.installedExtensions.find(x => x.uuid === uuid);
            if (target) target.enabled = enable;
          } else {
            input.checked = !enable;
            showToast(`Failed to update extension: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          input.checked = !enable;
          showToast(`Error: ${err.message}`, 'warning');
        }
      });
    });

    // Preferences button handler
    this.container.querySelectorAll('.btn-prefs-ext').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uuid = btn.getAttribute('data-uuid');
        const name = btn.getAttribute('data-name');
        showToast(`Opening settings for ${name}...`, 'info');
        window.electronAPI.extensions.openPrefs(uuid).catch(err => {
          showToast(`Could not open settings: ${err.message}`, 'warning');
        });
      });
    });

    // Uninstall button handler
    this.container.querySelectorAll('.btn-uninstall-ext').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uuid = btn.getAttribute('data-uuid');
        const name = btn.getAttribute('data-name');

        window.ConfirmDialog.show({
          title: `Uninstall ${name}`,
          message: `Are you sure you want to completely uninstall "${name}" (${uuid})?`,
          confirmText: 'Uninstall Extension',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            showToast(`Uninstalling ${name}...`, 'info');
            try {
              const res = await window.electronAPI.extensions.uninstall(uuid);
              if (res && res.success) {
                showToast(`${name} uninstalled successfully!`, 'success');
                await this.loadInstalled();
                this.renderSubtabs();
                this.renderInstalledGrid();
              } else {
                showToast(`Failed to uninstall: ${res ? res.error : 'Unknown error'}`, 'warning');
              }
            } catch (err) {
              showToast(`Error: ${err.message}`, 'warning');
            }
          }
        });
      });
    });
  },

  renderInstalledCard(ext) {
    const isUser = !ext.is_system;
    const versionBadge = ext.version ? `v${ext.version}` : '';

    return `
      <div class="theme-card relative bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col p-4" data-uuid="${ext.uuid}">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex flex-col min-w-0">
            <h4 class="text-xs font-bold text-zinc-900 leading-snug truncate">${ext.name}</h4>
            <span class="text-[11px] text-zinc-400 font-mono truncate mt-0.5">${ext.uuid}</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" class="extension-toggle" data-uuid="${ext.uuid}" ${ext.enabled ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>

        <p class="text-xs text-zinc-500 line-clamp-3 leading-relaxed mb-3 flex-1">${ext.description || 'Installed GNOME extension.'}</p>

        <div class="flex items-center justify-between pt-2.5 border-t border-zinc-100 mt-auto">
          <div class="flex items-center gap-1.5">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${isUser ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}">
              ${isUser ? 'User' : 'System'}
            </span>
            ${versionBadge ? `<span class="text-[10.5px] font-mono text-zinc-400">${versionBadge}</span>` : ''}
          </div>

          <div class="flex items-center gap-1.5">
            ${ext.hasPrefs ? `
              <button class="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 btn-prefs-ext transition-all" data-uuid="${ext.uuid}" data-name="${ext.name}" title="Extension Settings">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
            ` : ''}

            ${isUser ? `
              <button class="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 btn-uninstall-ext transition-all" data-uuid="${ext.uuid}" data-name="${ext.name}" title="Uninstall Extension">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  onSearch(query) {
    this.searchQuery = query;
    if (this.activeMode === 'browse') {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.loadOnline(this.searchQuery);
      }, 350);
    } else {
      this.renderInstalledGrid();
    }
  }
};
