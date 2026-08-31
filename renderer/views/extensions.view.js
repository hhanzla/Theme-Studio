// GNOME Shell Extensions Manager View (Local & Online extensions.gnome.org)
window.ExtensionsView = {
  container: null,
  activeMode: 'browse', // 'browse' | 'installed'
  installedFilter: 'all', // 'all' | 'enabled' | 'disabled' | 'user'
  installedExtensions: [],
  onlineExtensions: [],
  isLoading: false,
  searchQuery: '',
  searchDebounceTimer: null,
  installingUuids: new Set(),

  async render(containerEl) {
    this.container = containerEl;
    await this.loadInstalled();
    if (window.AppState && window.AppState.activeCategory !== 'extensions') return;
    if (this.activeMode === 'browse' && this.onlineExtensions.length === 0) {
      await this.loadOnline();
    } else {
      if (window.AppState && window.AppState.activeCategory !== 'extensions') return;
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
    if (window.AppState && window.AppState.activeCategory !== 'extensions') return;
    this.isLoading = true;
    this.renderSubtabs();
    this.renderLoading();

    try {
      const res = await window.electronAPI.extensions.search({ query, page: 1, sort: 'popularity' });
      if (res && res.success) {
        this.onlineExtensions = res.extensions || [];
      } else {
        this.onlineExtensions = [];
        if (res && res.error && (!window.AppState || window.AppState.activeCategory === 'extensions')) {
          showToast(`Error searching extensions: ${res.error}`, 'warning');
        }
      }
    } catch (err) {
      console.error('[ExtensionsView] Failed to query extensions.gnome.org:', err);
      this.onlineExtensions = [];
      if (!window.AppState || window.AppState.activeCategory === 'extensions') {
        showToast(`Failed to connect to extensions.gnome.org: ${err.message}`, 'warning');
      }
    } finally {
      this.isLoading = false;
      if (window.AppState && window.AppState.activeCategory !== 'extensions') {
        return; // Guard: Do not render if user switched away to another tab
      }
      this.renderSubtabs();
      this.renderView();
    }
  },

  renderSubtabs() {
    if (window.AppState && window.AppState.activeCategory !== 'extensions') return;
    const subtabsBar = document.querySelector('.subtabs-bar');
    if (!subtabsBar) return;

    subtabsBar.style.display = 'flex';

    const installedCount = this.installedExtensions.length;
    const onlineCount = this.onlineExtensions.length;
    const onlineCountDisplay = this.isLoading
      ? '...'
      : (onlineCount >= 100 ? '100+' : (onlineCount > 0 ? String(onlineCount) : '0'));

    subtabsBar.innerHTML = `
      <div class="subtabs">
        <button class="subtab-btn ${this.activeMode === 'browse' ? 'active' : ''}" data-mode="browse" id="ext-tab-browse">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -2px;"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <span>Browse Online</span>
          <span class="badge count-badge" id="ext-browse-badge">${onlineCountDisplay}</span>
        </button>
        <button class="subtab-btn ${this.activeMode === 'installed' ? 'active' : ''}" data-mode="installed" id="ext-tab-installed">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>Installed</span>
          <span class="badge count-badge" id="ext-installed-badge">${installedCount}</span>
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

  setSearchQuery(q) {
    this.searchQuery = (q || '').trim();

    if (this.activeMode === 'browse') {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(() => {
        this.loadOnline(this.searchQuery);
      }, 350);
    } else {
      this.renderView();
    }
  },

  renderLoading() {
    if (!this.container) return;
    if (window.AppState && window.AppState.activeCategory !== 'extensions') return;
    this.container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; width: 100%; padding: 60px 0;">
        <div style="width: 36px; height: 36px; border: 3px solid #e4e4e7; border-top-color: #cf4110; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 16px auto;"></div>
        <h3 class="empty-title">Loading extensions.gnome.org...</h3>
        <p class="empty-desc">Fetching latest and popular GNOME Shell extensions.</p>
      </div>
    `;
  },

  renderView() {
    if (!this.container) return;
    if (window.AppState && window.AppState.activeCategory !== 'extensions') return;

    if (this.activeMode === 'browse') {
      this.renderOnlineGrid();
    } else {
      this.renderInstalledGrid();
    }
  },

  renderOnlineGrid() {
    let items = this.onlineExtensions;

    if (items.length === 0 && !this.isLoading) {
      this.container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3 class="empty-title">No Extensions Found</h3>
          <p class="empty-desc">${this.searchQuery ? `No online extensions match "${this.searchQuery}".` : 'Could not load extensions from extensions.gnome.org.'}</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = items.map(ext => this.renderOnlineCard(ext)).join('');

    // Wire install buttons
    this.container.querySelectorAll('.btn-install-ext').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const pk = btn.getAttribute('data-pk');
        const uuid = btn.getAttribute('data-uuid');
        const name = btn.getAttribute('data-name');

        if (this.installingUuids.has(uuid)) return;
        this.installingUuids.add(uuid);

        btn.disabled = true;
        btn.innerHTML = `<span style="display:inline-block; width:10px; height:10px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:5px; vertical-align:-1px;"></span>Installing...`;
        showToast(`Downloading and installing ${name}...`, 'info');

        try {
          const res = await window.electronAPI.extensions.installOnline({ pk, uuid });
          if (res && res.success) {
            showToast(`${name} installed and enabled successfully!`, 'success');
            await this.loadInstalled();
            this.renderOnlineGrid();
          } else {
            showToast(`Failed to install ${name}: ${res ? res.error : 'Unknown error'}`, 'warning');
            btn.disabled = false;
            btn.textContent = 'Install';
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
          btn.disabled = false;
          btn.textContent = 'Install';
        } finally {
          this.installingUuids.delete(uuid);
        }
      });
    });
  },

  renderOnlineCard(ext) {
    const isInstalled = Boolean(ext.uuid && this.installedExtensions.some(x => x.uuid && x.uuid.trim().toLowerCase() === ext.uuid.trim().toLowerCase()));
    const downloadsFormatted = ext.downloads > 1000000 
      ? (ext.downloads / 1000000).toFixed(1) + 'M'
      : ext.downloads > 1000
        ? (ext.downloads / 1000).toFixed(0) + 'K'
        : ext.downloads;

    const iconHtml = ext.icon
      ? `<img src="${ext.icon}" alt="${ext.name}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: contain; background: #f4f4f5; padding: 3px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="ext-fallback-icon" style="display: none; width: 36px; height: 36px; border-radius: 6px; background: #f4f4f5; align-items: center; justify-content: center; color: #71717a;">
           <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
         </div>`
      : `<div style="width: 36px; height: 36px; border-radius: 6px; background: #f4f4f5; display: flex; align-items: center; justify-content: center; color: #71717a;">
           <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>
         </div>`;

    return `
      <div class="theme-card extension-card" data-uuid="${ext.uuid}">
        <div class="card-body" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 190px;">
          <div>
            <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px;">
              ${iconHtml}
              <div style="flex: 1; min-width: 0;">
                <h3 class="card-title" style="font-size: 13.5px; line-height: 1.3; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ext.name}">
                  ${ext.name}
                </h3>
                <span style="font-size: 10.5px; color: var(--text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  by ${ext.creator || 'GNOME Developer'}
                </span>
              </div>
            </div>

            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 10px;">
              ${ext.description || 'No description available for this GNOME Shell extension.'}
            </p>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                ${downloadsFormatted} downloads
              </span>
              ${ext.link ? `
                <a href="${ext.link}" target="_blank" style="font-size: 10.5px; font-weight: 600; color: #52525b; text-decoration: none;" title="${ext.link}">
                  Details ↗
                </a>
              ` : ''}
            </div>

            <div class="card-footer" style="padding: 0; margin-top: 0;">
              ${isInstalled ? `
                <button class="card-btn is-extension-installed" disabled>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 4px; vertical-align: -2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Installed
                </button>
              ` : `
                <button class="card-btn btn-primary btn-install-ext" data-pk="${ext.pk}" data-uuid="${ext.uuid}" data-name="${ext.name}">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Install
                </button>
              `}
            </div>
          </div>
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
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3 class="empty-title">No Installed Extensions Found</h3>
          <p class="empty-desc">You can browse and install new extensions from the "Browse Online" tab above.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(ext => this.renderInstalledCard(ext)).join('');

    // Wire toggle switches
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

    // Wire settings/prefs buttons
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

    // Wire uninstall buttons for user extensions
    this.container.querySelectorAll('.btn-uninstall-ext').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uuid = btn.getAttribute('data-uuid');
        const name = btn.getAttribute('data-name');

        window.ConfirmDialog.show({
          title: `Uninstall ${name}`,
          subtitle: 'Remove GNOME Shell Extension',
          message: `Are you sure you want to completely uninstall "${name}" (${uuid}) from your user extensions directory?`,
          confirmText: 'Uninstall Extension',
          cancelText: 'Cancel',
          onConfirm: async () => {
            showToast(`Uninstalling ${name}...`, 'info');
            try {
              const res = await window.electronAPI.extensions.uninstall(uuid);
              if (res && res.success) {
                showToast(`${name} uninstalled successfully!`, 'success');
                await this.loadInstalled();
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
      <div class="theme-card extension-card" data-uuid="${ext.uuid}">
        <div class="card-body" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; min-height: 180px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="max-width: 75%;">
                <h3 class="card-title" style="font-size: 13.5px; line-height: 1.3;">${ext.name}</h3>
                <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); display: block; word-break: break-all; margin-top: 2px;">
                  ${ext.uuid}
                </span>
              </div>
              <label class="switch" style="transform: scale(0.85); transform-origin: right center;">
                <input type="checkbox" class="extension-toggle" data-uuid="${ext.uuid}" ${ext.enabled ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>

            <p style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12px;">
              ${ext.description || 'No description available for this extension.'}
            </p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 4px;">
            <div style="display: flex; gap: 4px; align-items: center;">
              <span class="badge-tag ${isUser ? 'badge-installed' : 'badge-script'}">
                ${isUser ? 'User' : 'System'}
              </span>
              ${versionBadge ? `<span class="meta-chip" style="font-size: 9.5px;">${versionBadge}</span>` : ''}
            </div>
            
            <div style="display: flex; align-items: center; gap: 6px;">
              ${ext.has_prefs !== false ? `
                <button class="btn-prefs-ext" data-uuid="${ext.uuid}" data-name="${ext.name}" style="background: transparent; border: 1px solid var(--border-subtle); cursor: pointer; color: #52525b; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 600;" title="Extension Settings">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Settings</span>
                </button>
              ` : ''}
              ${ext.url ? `
                <a href="${ext.url}" target="_blank" style="font-size: 10.5px; font-weight: 600; color: #52525b; text-decoration: none;" title="${ext.url}">
                  Website ↗
                </a>
              ` : ''}
              ${isUser ? `
                <button class="btn-uninstall-ext" data-uuid="${ext.uuid}" data-name="${ext.name}" style="background: transparent; border: none; cursor: pointer; color: #dc2626; padding: 2px 4px; border-radius: 4px;" title="Uninstall Extension">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
