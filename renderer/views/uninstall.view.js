// renderer/views/uninstall.view.js
// Modern Uninstall Manager View with Batch Uninstall & Clean Filtering

window.UninstallView = {
  container: null,
  activeFilter: 'all',
  installedItems: [],
  selectedIds: new Set(),
  cacheSize: '0 B',

  async render(containerEl) {
    this.container = containerEl;
    this.selectedIds.clear();
    
    await this.loadItems();

    this.fetchCacheSize().then(() => {
      const cacheBadge = document.querySelector('.cache-badge');
      if (cacheBadge) {
        cacheBadge.textContent = this.cacheSize;
      }
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
      <div class="flex items-center justify-between w-full py-2 border-b border-zinc-200 gap-3">
        <div class="flex items-center gap-1.5 overflow-x-auto">
          <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeFilter === 'all' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-cat="all">
            <span>All Installed</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeFilter === 'all' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${this.installedItems.length}</span>
          </button>
          <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeFilter === 'gtk-theme' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-cat="gtk-theme">
            <span>GTK Themes</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeFilter === 'gtk-theme' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${gtkCount}</span>
          </button>
          <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeFilter === 'shell-theme' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-cat="shell-theme">
            <span>Shell Themes</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeFilter === 'shell-theme' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${shellCount}</span>
          </button>
          <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeFilter === 'icon-theme' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-cat="icon-theme">
            <span>Icons</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeFilter === 'icon-theme' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${iconCount}</span>
          </button>
          <button class="subtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${this.activeFilter === 'cursor-theme' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}" data-cat="cursor-theme">
            <span>Cursors</span>
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold ${this.activeFilter === 'cursor-theme' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}">${cursorCount}</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          ${filtered.length > 0 ? `
            <button class="btn btn-secondary px-3 py-1.5 text-xs font-medium" id="btn-select-all-toggle">
              ${allFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
          ` : ''}

          ${selectedCount > 0 ? `
            <button class="btn px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm active:scale-95 transition-all" id="btn-batch-uninstall">
              Uninstall Selected (${selectedCount})
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Filter clicks
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

    // Batch Uninstall
    const batchBtn = subtabsBar.querySelector('#btn-batch-uninstall');
    if (batchBtn && selectedCount > 0) {
      batchBtn.addEventListener('click', () => {
        this.confirmBatchRemove();
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
        <div class="col-span-full py-16 flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          </div>
          <h3 class="text-sm font-bold text-zinc-800">No Installed Items Found</h3>
          <p class="text-xs text-zinc-500 mt-1 max-w-sm">Explore the Browse tabs to install new GTK themes, icon packs, or cursor sets.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = filtered.map(item => this.renderCard(item)).join('');

    // Checkbox selection
    this.container.querySelectorAll('.uninstall-checkbox').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = chk.getAttribute('data-id');
        if (chk.checked) {
          this.selectedIds.add(id);
        } else {
          this.selectedIds.delete(id);
        }
        this.renderSubtabsAndToolbar();
      });
    });

    // Single remove
    this.container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const item = this.installedItems.find(i => i.id === id);
        if (item) this.confirmRemove(item);
      });
    });

    // Single apply
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

    const isSelected = this.selectedIds.has(item.id);

    return `
      <div class="theme-card group relative bg-white border ${isSelected ? 'border-brand ring-2 ring-brand/15' : 'border-zinc-200 hover:border-zinc-300'} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col" data-id="${item.id}">
        <div class="relative h-32 bg-zinc-100 overflow-hidden flex items-center justify-center">
          <label class="absolute top-2.5 left-2.5 z-10 cursor-pointer p-1 rounded bg-white/90 backdrop-blur-sm border border-zinc-200/80 shadow-sm flex items-center justify-center">
            <input type="checkbox" class="uninstall-checkbox accent-brand w-4 h-4 rounded cursor-pointer" data-id="${item.id}" ${isSelected ? 'checked' : ''} />
          </label>

          ${item.preview 
            ? `<img src="${item.preview}" alt="${item.name}" class="w-full h-full object-cover" />` 
            : `<div class="w-full h-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-400 gap-1"><span class="text-xs font-semibold text-zinc-400">${item.name}</span></div>`
          }

          <div class="absolute top-2.5 right-2.5">
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Installed</span>
          </div>
        </div>

        <div class="p-3.5 flex flex-col flex-1">
          <h4 class="text-xs font-bold text-zinc-900 leading-snug truncate">${item.name}</h4>
          <span class="text-[11px] text-zinc-400 capitalize mt-0.5">${item.category.replace('-', ' ')} • ${formattedDate}</span>

          <div class="flex flex-wrap gap-1 my-2.5">
            <span class="px-1.5 py-0.5 bg-zinc-100 rounded text-[10.5px] font-medium text-zinc-600 truncate max-w-full">${variantText}</span>
            ${item.gtk4_fix_applied ? '<span class="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10.5px] font-semibold text-emerald-700">GTK4 Active</span>' : ''}
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2.5 border-t border-zinc-100 mt-auto">
            <button class="btn btn-secondary btn-apply-item px-2 py-1.5 text-xs font-medium" data-id="${item.id}">
              Apply
            </button>
            <button class="btn px-2 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md transition-all btn-remove-item" data-id="${item.id}">
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
          showToast(`Applied ${chosenTarget} as active Icon theme`, 'success');
        } else if (item.category === 'cursor-theme') {
          await window.electronAPI.system.applyCursors(chosenTarget);
          showToast(`Applied ${chosenTarget} as active Cursor theme`, 'success');
        }
      } catch (err) {
        showToast(`Error applying theme: ${err.message}`, 'warning');
      }
    };

    if (item.installed_folders && item.installed_folders.length > 1) {
      this.promptThemeVariant(item, item.installed_folders, doApply);
    } else {
      const target = (item.installed_folders && item.installed_folders[0]) || item.primary_path?.split('/').pop() || item.name;
      await doApply(target);
    }
  },

  promptThemeVariant(item, folders, onSelected) {
    const optionsHtml = folders.map(f => `
      <label class="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer text-xs font-medium text-zinc-800">
        <input type="radio" name="installed_folder_choice" value="${f}" class="accent-brand" ${f === folders[0] ? 'checked' : ''} />
        <span>${f}</span>
      </label>
    `).join('');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-dialog animate-modal-enter max-w-sm">
        <div class="modal-header">
          <h3 class="modal-title">Select Active Variant</h3>
          <button class="modal-close-btn" id="modal-variant-close">×</button>
        </div>
        <div class="modal-body">
          <p class="text-xs text-zinc-500 mb-2">Choose which installed variant of "${item.name}" to apply:</p>
          <div class="flex flex-col gap-1.5">
            ${optionsHtml}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-variant-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-variant-apply">Apply Theme</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#modal-variant-close').addEventListener('click', close);
    modal.querySelector('#modal-variant-cancel').addEventListener('click', close);

    modal.querySelector('#modal-variant-apply').addEventListener('click', () => {
      const selectedRadio = modal.querySelector('input[name="installed_folder_choice"]:checked');
      const target = selectedRadio ? selectedRadio.value : folders[0];
      close();
      onSelected(target);
    });
  },

  confirmRemove(item) {
    if (window.ConfirmDialog) {
      window.ConfirmDialog.show({
        title: `Uninstall ${item.name}?`,
        message: `This will remove all installed folders (${(item.installed_folders || []).join(', ')}) from your system.`,
        confirmText: 'Uninstall',
        confirmClass: 'btn-danger',
        onConfirm: () => this.doRemove(item)
      });
    } else {
      if (confirm(`Uninstall ${item.name}?`)) {
        this.doRemove(item);
      }
    }
  },

  async doRemove(item) {
    showToast(`Uninstalling ${item.name}...`, 'info');
    try {
      const res = await window.electronAPI.uninstall.remove(item.id);
      if (res && res.success) {
        showToast(`Successfully uninstalled ${item.name}`, 'success');
        this.selectedIds.delete(item.id);
        await this.loadItems();
      } else {
        showToast(`Error uninstalling: ${res ? res.error : 'Unknown error'}`, 'warning');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'warning');
    }
  },

  confirmBatchRemove() {
    const count = this.selectedIds.size;
    if (count === 0) return;

    if (window.ConfirmDialog) {
      window.ConfirmDialog.show({
        title: `Uninstall ${count} Items?`,
        message: `Are you sure you want to permanently remove all ${count} selected themes/icon packs from your system?`,
        confirmText: `Uninstall (${count})`,
        confirmClass: 'btn-danger',
        onConfirm: () => this.doBatchRemove()
      });
    } else {
      if (confirm(`Uninstall ${count} selected items?`)) {
        this.doBatchRemove();
      }
    }
  },

  async doBatchRemove() {
    const ids = Array.from(this.selectedIds);
    showToast(`Uninstalling ${ids.length} items...`, 'info');

    try {
      const res = await window.electronAPI.uninstall.batchRemove(ids);
      if (res && res.success) {
        showToast(`Successfully uninstalled ${res.removedCount || ids.length} items!`, 'success');
        this.selectedIds.clear();
        await this.loadItems();
      } else {
        showToast(`Error in batch uninstall: ${res ? res.error : 'Unknown error'}`, 'warning');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'warning');
    }
  }
};
