// Uninstall Manager View - Batch Uninstall & Cache Cleaner Architecture
window.UninstallView = {
  container: null,
  activeFilter: 'all',
  installedItems: [],
  selectedIds: new Set(),
  cacheSize: '0 B',

  /**
   * Initializes and renders the Uninstall Manager screen
   * @param {HTMLElement} containerEl
   */
  async render(containerEl) {
    this.container = containerEl;
    this.selectedIds.clear();
    await this.fetchCacheSize();
    await this.loadItems();
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
      console.warn('[UninstallView] Failed to fetch cache size:', err);
    }
  },

  async loadItems() {
    try {
      const res = await window.electronAPI.uninstall.list();
      if (res && res.success) {
        this.installedItems = res.items || [];
      } else {
        this.installedItems = [];
      }
    } catch (err) {
      console.error('[UninstallView] Failed to load installed items:', err);
      this.installedItems = [];
    }

    // Filter out selected IDs that are no longer installed
    const validIds = new Set(this.installedItems.map(i => i.id));
    for (const id of this.selectedIds) {
      if (!validIds.has(id)) {
        this.selectedIds.delete(id);
      }
    }

    this.renderSubtabsAndToolbar();
    this.renderCards();
  },

  renderSubtabsAndToolbar() {
    const subtabsBar = document.querySelector('.subtabs-bar');
    if (!subtabsBar) return;

    subtabsBar.style.display = 'flex';

    const filtered = this.activeFilter === 'all'
      ? this.installedItems
      : this.installedItems.filter(i => i.category === this.activeFilter);

    const gtkCount = this.installedItems.filter(i => i.category === 'gtk-theme').length;
    const shellCount = this.installedItems.filter(i => i.category === 'shell-theme').length;
    const iconCount = this.installedItems.filter(i => i.category === 'icon-theme').length;
    const cursorCount = this.installedItems.filter(i => i.category === 'cursor-theme').length;

    const allFilteredSelected = filtered.length > 0 && filtered.every(i => this.selectedIds.has(i.id));
    const selectedCount = this.selectedIds.size;

    subtabsBar.innerHTML = `
      <div class="subtabs-with-toolbar">
        <div class="subtabs">
          <button class="subtab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-cat="all">
            <span>All Installed</span>
            <span class="badge count-badge">${this.installedItems.length}</span>
          </button>
          <button class="subtab-btn ${this.activeFilter === 'gtk-theme' ? 'active' : ''}" data-cat="gtk-theme">
            <span>GTK Themes</span>
            <span class="badge count-badge">${gtkCount}</span>
          </button>
          <button class="subtab-btn ${this.activeFilter === 'shell-theme' ? 'active' : ''}" data-cat="shell-theme">
            <span>Shell Themes</span>
            <span class="badge count-badge">${shellCount}</span>
          </button>
          <button class="subtab-btn ${this.activeFilter === 'icon-theme' ? 'active' : ''}" data-cat="icon-theme">
            <span>Icons</span>
            <span class="badge count-badge">${iconCount}</span>
          </button>
          <button class="subtab-btn ${this.activeFilter === 'cursor-theme' ? 'active' : ''}" data-cat="cursor-theme">
            <span>Cursors</span>
            <span class="badge count-badge">${cursorCount}</span>
          </button>
        </div>

        <div class="uninstall-toolbar-actions">
          ${filtered.length > 0 ? `
            <button class="toolbar-btn btn-select-all ${allFilteredSelected ? 'active' : ''}" id="btn-select-all-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${allFilteredSelected 
                  ? '<polyline points="20 6 9 17 4 12"></polyline>' 
                  : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>'}
              </svg>
              <span>${allFilteredSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          ` : ''}

          <button 
            class="toolbar-btn btn-batch-danger ${selectedCount > 0 ? 'visible' : ''}" 
            id="btn-batch-uninstall" 
            ${selectedCount === 0 ? 'disabled' : ''}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Uninstall Selected (${selectedCount})</span>
          </button>

          <button class="toolbar-btn btn-clear-cache" id="btn-clear-cache" title="Clear downloaded archives and temp clones">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            <span>Clear Cache</span>
            <span class="cache-badge">${this.cacheSize}</span>
          </button>
        </div>
      </div>
    `;

    // Category filter click
    subtabsBar.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-cat');
        this.renderSubtabsAndToolbar();
        this.renderCards();
      });
    });

    // Select All toggle
    const selectAllBtn = subtabsBar.querySelector('#btn-select-all-toggle');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        if (allFilteredSelected) {
          filtered.forEach(i => this.selectedIds.delete(i.id));
        } else {
          filtered.forEach(i => this.selectedIds.add(i.id));
        }
        this.renderSubtabsAndToolbar();
        this.renderCards();
      });
    }

    // Batch Uninstall button
    const batchBtn = subtabsBar.querySelector('#btn-batch-uninstall');
    if (batchBtn && selectedCount > 0) {
      batchBtn.addEventListener('click', () => {
        this.confirmBatchRemove();
      });
    }

    // Clear Cache button
    const clearCacheBtn = subtabsBar.querySelector('#btn-clear-cache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        this.confirmClearCache();
      });
    }
  },

  renderCards() {
    if (!this.container) return;

    const filtered = this.activeFilter === 'all'
      ? this.installedItems
      : this.installedItems.filter(i => i.category === this.activeFilter);

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3 class="empty-title">No Installed Items in this Filter</h3>
          <p class="empty-desc">Explore the Browse tabs to install new themes, icon packs, or cursor sets.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(item => this.renderCard(item)).join('');

    // Checkbox and card selection click
    this.container.querySelectorAll('.uninstall-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          this.selectedIds.add(id);
        } else {
          this.selectedIds.delete(id);
        }
        const card = this.container.querySelector(`.theme-card[data-id="${id}"]`);
        if (card) {
          card.classList.toggle('is-selected', chk.checked);
        }
        this.renderSubtabsAndToolbar();
      });
    });

    // Single uninstall button click
    this.container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.installedItems.find(i => i.id === id);
        if (item) this.confirmRemove(item);
      });
    });

    // Single apply button click
    this.container.querySelectorAll('.btn-apply-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.installedItems.find(i => i.id === id);
        if (item) this.applyItem(item);
      });
    });
  },

  renderCard(item) {
    const formattedDate = item.installed_at ? new Date(item.installed_at).toLocaleDateString() : 'Installed';
    const variantText = item.variant 
      ? `${item.variant.color || ''} ${item.variant.mode ? '(' + item.variant.mode + ')' : ''}`.trim()
      : (item.installed_folders && item.installed_folders.length > 0 ? item.installed_folders.join(', ') : 'Standard');

    const baseId = (item.id || '').replace(/-shell$/, '');
    const thumbnailSrc = item.thumbnail || `assets/previews/${baseId}.png`;
    const isSelected = this.selectedIds.has(item.id);

    let typeBadgeHtml = '';
    if (item.install_type === 'script' && (item.install_script || item.install_args_template)) {
      typeBadgeHtml = '<span class="badge-tag badge-script">Script</span>';
    } else if (item.install_type === 'script' || item.install_type === 'git') {
      typeBadgeHtml = '<span class="badge-tag badge-git">Git</span>';
    } else if (item.install_type === 'zip-static') {
      typeBadgeHtml = '<span class="badge-tag badge-zip">Zip</span>';
    }

    return `
      <div class="theme-card is-installed ${isSelected ? 'is-selected' : ''}" data-id="${item.id}">
        <div class="card-thumbnail-container">
          <label class="card-select-label" title="Select for batch action">
            <input 
              type="checkbox" 
              class="uninstall-checkbox" 
              data-id="${item.id}" 
              ${isSelected ? 'checked' : ''} 
            />
            <span class="custom-checkbox-ui"></span>
          </label>

          <img 
            src="${thumbnailSrc}" 
            alt="${item.name}" 
            class="card-thumbnail"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          />
          <div class="card-fallback-preview" style="display: none;">
            <svg class="card-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="M3 9h18"></path>
              <path d="M9 21V9"></path>
            </svg>
            <span class="card-fallback-name">${item.name}</span>
          </div>
          <div class="card-badges-floating">
            <div class="badge-type-slot">
              ${typeBadgeHtml}
            </div>
            <div class="badge-installed-slot">
              <span class="badge-tag badge-installed">Installed</span>
            </div>
          </div>
        </div>

        <div class="card-body">
          <div class="card-title-row">
            <h3 class="card-title">${item.name}</h3>
          </div>
          <p class="card-author">${item.category} • <span>${formattedDate}</span></p>

          <div class="card-meta-tags">
            <span class="meta-chip">${variantText}</span>
            ${item.gtk4_fix_applied ? '<span class="meta-chip chip-gtk4">GTK4 Active</span>' : ''}
          </div>

          <div class="card-footer" style="display: flex; gap: 6px;">
            <button class="card-btn btn-secondary btn-apply-item" data-id="${item.id}" style="flex: 1;">
              Apply
            </button>
            <button class="card-btn btn-danger btn-remove-item" data-id="${item.id}" style="flex: 1;">
              Uninstall
            </button>
          </div>
        </div>
      </div>
    `;
  },

  async applyItem(item) {
    const doApply = async (chosenTarget) => {
      try {
        if (item.category === 'gtk-theme') {
          await window.electronAPI.system.applyGtk(chosenTarget);
          showToast(`Applied ${chosenTarget} as active GTK theme`, 'success');
        } else if (item.category === 'shell-theme') {
          await window.electronAPI.system.applyShell(chosenTarget);
          showToast(`Applied ${chosenTarget} as active GNOME Shell theme`, 'success');
        } else if (item.category === 'icon-theme') {
          await window.electronAPI.system.applyIcons(chosenTarget);
          showToast(`Applied ${chosenTarget} as active icon pack`, 'success');
        } else if (item.category === 'cursor-theme') {
          await window.electronAPI.system.applyCursors(chosenTarget);
          showToast(`Applied ${chosenTarget} as active cursor set`, 'success');
        }
      } catch (err) {
        showToast(`Failed to apply ${item.name}: ${err.message}`, 'warning');
      }
    };

    // Check if multiple variants (e.g. Standard vs Compact) exist
    try {
      if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.getThemeVariants) {
        const res = await window.electronAPI.system.getThemeVariants({
          name: item.name,
          id: item.id,
          category: item.category
        });
        if (res && res.success && Array.isArray(res.variants) && res.variants.length > 1) {
          window.ApplyVariantPicker.show({
            title: `Apply ${item.name}`,
            subtitle: `Select flavor (Standard or Compact) to set active`,
            variants: res.variants,
            onApply: (selectedId) => {
              doApply(selectedId);
            }
          });
          return;
        }
      }
    } catch (_) {}

    const applyTargetName = (item.installed_folders && item.installed_folders[0]) || item.name;
    doApply(applyTargetName);
  },

  confirmRemove(item) {
    window.ConfirmDialog.show({
      title: `Uninstall ${item.name}`,
      subtitle: 'Remove theme files and restore defaults if active',
      message: `Are you sure you want to completely uninstall ${item.name}? This will delete the theme files from disk and reverse any GTK4 symlinks.`,
      confirmText: 'Uninstall Theme',
      cancelText: 'Cancel',
      onConfirm: async () => {
        showToast(`Uninstalling ${item.name}...`, 'info');
        try {
          const res = await window.electronAPI.uninstall.remove({ id: item.id });
          if (res && res.success) {
            showToast(`${item.name} uninstalled successfully`, 'success');
            this.selectedIds.delete(item.id);
            await this.fetchCacheSize();
            await this.loadItems();
            if (typeof window.refreshAppState === 'function') {
              window.refreshAppState();
            }
          } else {
            showToast(`Failed to uninstall: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error uninstalling: ${err.message}`, 'warning');
        }
      }
    });
  },

  confirmBatchRemove() {
    const count = this.selectedIds.size;
    if (count === 0) return;

    const names = Array.from(this.selectedIds)
      .map(id => {
        const it = this.installedItems.find(i => i.id === id);
        return it ? it.name : id;
      })
      .slice(0, 4)
      .join(', ');
    const moreText = count > 4 ? ` and ${count - 4} more...` : '';

    window.ConfirmDialog.show({
      title: `Batch Uninstall (${count} Items)`,
      subtitle: 'Remove selected themes and restore default appearance',
      message: `Are you sure you want to completely uninstall ${count} selected items (${names}${moreText})? This will delete all their files from disk and reset appearance to system defaults if active.`,
      confirmText: `Uninstall All ${count} Items`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        showToast(`Uninstalling ${count} items in batch...`, 'info');
        try {
          const idsToUninstall = Array.from(this.selectedIds);
          const res = await window.electronAPI.uninstall.batchRemove({ ids: idsToUninstall });
          if (res && res.success) {
            showToast(`Successfully uninstalled ${res.removedCount} items!`, 'success');
            this.selectedIds.clear();
            await this.fetchCacheSize();
            await this.loadItems();
            if (typeof window.refreshAppState === 'function') {
              window.refreshAppState();
            }
          } else {
            showToast(`Batch uninstall error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error in batch uninstall: ${err.message}`, 'warning');
        }
      }
    });
  },

  confirmClearCache() {
    window.ConfirmDialog.show({
      title: 'Clear Download Cache',
      subtitle: `Freed space: ${this.cacheSize}`,
      message: `Are you sure you want to delete all cached download archives (.zip, .tar.xz) and temporary Git clones? This frees up disk space and will NOT affect your installed themes.`,
      confirmText: 'Clear Cache',
      cancelText: 'Cancel',
      onConfirm: async () => {
        showToast('Clearing download and extraction cache...', 'info');
        try {
          const res = await window.electronAPI.uninstall.clearCache();
          if (res && res.success) {
            showToast('Download cache cleared successfully!', 'success');
            await this.fetchCacheSize();
            this.renderSubtabsAndToolbar();
          } else {
            showToast(`Failed to clear cache: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error clearing cache: ${err.message}`, 'warning');
        }
      }
    });
  }
};
