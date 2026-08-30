// Uninstall Manager View - Direct Grid Architecture matching Browse tabs
window.UninstallView = {
  container: null,
  activeFilter: 'all',
  installedItems: [],

  /**
   * Initializes and renders the Uninstall Manager screen
   * @param {HTMLElement} containerEl
   */
  async render(containerEl) {
    this.container = containerEl;
    await this.loadItems();
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

    this.renderSubtabs();
    this.renderCards();
  },

  renderSubtabs() {
    const subtabsBar = document.querySelector('.subtabs-bar');
    if (!subtabsBar) return;

    subtabsBar.style.display = 'flex';

    const gtkCount = this.installedItems.filter(i => i.category === 'gtk-theme').length;
    const shellCount = this.installedItems.filter(i => i.category === 'shell-theme').length;
    const iconCount = this.installedItems.filter(i => i.category === 'icon-theme').length;
    const cursorCount = this.installedItems.filter(i => i.category === 'cursor-theme').length;

    subtabsBar.innerHTML = `
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
    `;

    subtabsBar.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.getAttribute('data-cat');
        this.renderSubtabs();
        this.renderCards();
      });
    });
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

    // Wire action buttons
    this.container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.installedItems.find(i => i.id === id);
        if (item) this.confirmRemove(item);
      });
    });

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

    const thumbnailSrc = item.thumbnail || `assets/previews/${item.id}.png`;

    return `
      <div class="theme-card is-installed" data-id="${item.id}">
        <div class="card-thumbnail-container">
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
              <span class="badge-tag ${item.install_type === 'script' ? 'badge-script' : 'badge-zip'}">
                ${item.install_type === 'script' ? 'Script' : 'Zip'}
              </span>
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
  }
};
