// renderer/views/tweaks.view.js
// Modern Tweaks & App Grid Smart Categorizer View

const TweaksView = {
  container: null,
  appFoldersStatus: null,
  desktopTweaks: null,
  isOrganizing: false,
  selectedFolderIds: new Set(['Internet', 'Development', 'Media', 'Graphics', 'Office', 'System', 'Utilities', 'Games']),

  async render(containerEl) {
    if (containerEl) this.container = containerEl;
    if (this.container) {
      this.container.innerHTML = `
        <div class="flex items-center justify-center p-12 text-zinc-400">
          <svg class="animate-spin -ml-1 mr-2.5 h-4 w-4 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-xs">Loading desktop tweaks...</span>
        </div>
      `;
    }
    await this.loadData();
    this.renderUI();
  },

  async init(containerEl) {
    return this.render(containerEl);
  },

  async loadData() {
    try {
      if (window.electronAPI && window.electronAPI.tweaks) {
        const foldersRes = await window.electronAPI.tweaks.getAppFolders();
        this.appFoldersStatus = foldersRes || {};

        if (this.appFoldersStatus && Array.isArray(this.appFoldersStatus.activeFolders) && this.appFoldersStatus.activeFolders.length > 0) {
          const currentActive = this.appFoldersStatus.activeFolders;
          if (currentActive.some(f => ['Internet', 'Development', 'Media', 'Graphics', 'Office', 'System'].includes(f))) {
            this.selectedFolderIds = new Set(currentActive);
          }
        }
      }
    } catch (err) {
      console.error('[TweaksView] Failed to load tweaks data:', err);
    }
  },

  renderUI() {
    if (!this.container) return;

    const status = this.appFoldersStatus || {};
    const isOrganized = !!status.isOrganized;
    const totalApps = status.totalApps || 0;
    const categories = Array.isArray(status.definedCategories) ? status.definedCategories : [
      { id: 'Internet', name: 'Internet & Web', icon: '🌐', count: 0 },
      { id: 'Development', name: 'Development', icon: '💻', count: 0 },
      { id: 'Media', name: 'Audio & Video', icon: '🎬', count: 0 },
      { id: 'Graphics', name: 'Graphics & Photos', icon: '🎨', count: 0 },
      { id: 'Office', name: 'Office & Documents', icon: '📄', count: 0 },
      { id: 'System', name: 'System & Tools', icon: '⚙️', count: 0 },
      { id: 'Utilities', name: 'Utilities', icon: '🛠️', count: 0 },
      { id: 'Games', name: 'Games', icon: '🎮', count: 0 }
    ];

    const folderCardsHtml = categories.map(cat => {
      const isSelected = this.selectedFolderIds.has(cat.id);
      return `
        <div class="tweak-folder-card p-3 rounded-xl border ${isSelected ? 'border-brand/40 bg-orange-50/50 shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'} flex items-center gap-3 cursor-pointer select-none transition-all duration-150" data-folder-id="${cat.id}">
          <input type="checkbox" class="folder-check-input accent-brand w-4 h-4 rounded cursor-pointer" ${isSelected ? 'checked' : ''} tabindex="-1">
          <div class="text-2xl">${cat.icon}</div>
          <div class="flex flex-col flex-1 min-w-0">
            <span class="text-xs font-bold ${isSelected ? 'text-brand' : 'text-zinc-900'} truncate">${cat.name}</span>
            <span class="text-[11px] text-zinc-400">${cat.count} ${cat.count === 1 ? 'app' : 'apps'} detected</span>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="max-w-4xl flex flex-col gap-6">
        <!-- Section: App Menu Auto-Categorizer -->
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-bold text-zinc-900">App Menu Smart Categorizer</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">
            Organize all ${totalApps} installed applications into clean GNOME app grid folders automatically based on freedesktop standards.
          </p>

          <!-- Selection Action Bar -->
          <div class="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 my-1">
            <div class="font-medium">
              <span><strong>${this.selectedFolderIds.size}</strong> of ${categories.length} folders selected</span>
            </div>
            <div class="flex items-center gap-2">
              <button class="text-xs font-semibold text-brand hover:text-brand-hover hover:underline" id="btn-select-all">Select All</button>
              <span class="text-zinc-300">•</span>
              <button class="text-xs font-semibold text-brand hover:text-brand-hover hover:underline" id="btn-deselect-all">Deselect All</button>
            </div>
          </div>

          <!-- Category Folders Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
            ${folderCardsHtml}
          </div>

          <!-- Action Footer Card -->
          <div class="mt-4 p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-4 shadow-sm">
            <div>
              <strong class="text-xs font-bold text-zinc-900 block">Apply Application Categories</strong>
              <p class="text-[11.5px] text-zinc-500 mt-0.5">
                ${isOrganized 
                  ? 'Your app folders are currently customized. You can re-categorize or reset at any time.' 
                  : 'Reorganizes your app launcher grid instantly without requiring root privileges.'}
              </p>
            </div>
            <div class="flex items-center gap-2.5">
              ${isOrganized ? `
                <button class="btn btn-secondary px-3 py-1.5 text-xs font-medium" id="btn-reset-folders">
                  Reset Folders
                </button>
              ` : ''}
              <button class="btn btn-primary px-4 py-1.5 text-xs font-semibold" id="btn-organize-folders">
                ${isOrganized ? 'Re-organize App Grid' : 'Organize App Grid'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Select/Deselect All
    const selectAllBtn = this.container.querySelector('#btn-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const cards = this.container.querySelectorAll('.tweak-folder-card');
        cards.forEach(card => {
          const id = card.getAttribute('data-folder-id');
          this.selectedFolderIds.add(id);
        });
        this.renderUI();
      });
    }

    const deselectAllBtn = this.container.querySelector('#btn-deselect-all');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        this.selectedFolderIds.clear();
        this.renderUI();
      });
    }

    // Toggle individual card selection
    this.container.querySelectorAll('.tweak-folder-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-folder-id');
        if (this.selectedFolderIds.has(id)) {
          this.selectedFolderIds.delete(id);
        } else {
          this.selectedFolderIds.add(id);
        }
        this.renderUI();
      });
    });

    // Organize button
    const organizeBtn = this.container.querySelector('#btn-organize-folders');
    if (organizeBtn) {
      organizeBtn.addEventListener('click', async () => {
        if (this.selectedFolderIds.size === 0) {
          showToast('Please select at least one folder category.', 'warning');
          return;
        }

        organizeBtn.disabled = true;
        organizeBtn.textContent = 'Organizing...';
        showToast('Categorizing apps into GNOME App Grid folders...', 'info');

        try {
          const folderList = Array.from(this.selectedFolderIds);
          const res = await window.electronAPI.tweaks.organizeAppFolders(folderList);
          if (res && res.success) {
            showToast(`Successfully created ${res.folderCount} smart app folders!`, 'success');
            await this.loadData();
            this.renderUI();
          } else {
            showToast(`Error organizing folders: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          organizeBtn.disabled = false;
          organizeBtn.textContent = 'Organize App Grid';
        }
      });
    }

    // Reset button
    const resetBtn = this.container.querySelector('#btn-reset-folders');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        resetBtn.disabled = true;
        resetBtn.textContent = 'Resetting...';
        showToast('Resetting app folders to default...', 'info');

        try {
          const res = await window.electronAPI.tweaks.resetAppFolders();
          if (res && res.success) {
            showToast('GNOME App Grid folders reset to default!', 'success');
            await this.loadData();
            this.renderUI();
          } else {
            showToast(`Error resetting: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          resetBtn.disabled = false;
          resetBtn.textContent = 'Reset Folders';
        }
      });
    }
  }
};

window.TweaksView = TweaksView;
