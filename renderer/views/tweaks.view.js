// renderer/views/tweaks.view.js
// Handles desktop tweaks, App Grid auto-folders organization, and UI controls

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
        <div class="settings-view-container" style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text-secondary);">
          <span>Loading desktop tweaks...</span>
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
        const [foldersRes, tweaksRes] = await Promise.all([
          window.electronAPI.tweaks.getAppFolders(),
          window.electronAPI.tweaks.getDesktopTweaks()
        ]);
        this.appFoldersStatus = foldersRes || {};
        this.desktopTweaks = tweaksRes || {};

        // If system already has organized active folders, sync selection
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
    const tweaks = this.desktopTweaks || {};
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
        <div class="tweak-folder-card ${isSelected ? 'selected' : ''}" data-folder-id="${cat.id}">
          <div class="tweak-folder-checkbox">
            <input type="checkbox" class="folder-check-input" ${isSelected ? 'checked' : ''} tabindex="-1">
          </div>
          <div class="tweak-folder-icon">${cat.icon}</div>
          <div class="tweak-folder-info">
            <span class="tweak-folder-name">${cat.name}</span>
            <span class="tweak-folder-count">${cat.count} ${cat.count === 1 ? 'app' : 'apps'} detected</span>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="settings-view-container tweaks-view-wrapper">
        <!-- Section: App Menu Auto-Categorizer -->
        <div class="settings-section">
          <div class="settings-section-header-row" style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h3 class="settings-section-title">App Menu Smart Categorizer</h3>
              <p class="settings-section-desc">
                Select which category folders to create in your GNOME Application Grid. (${totalApps} installed apps detected)
              </p>
            </div>
            <span class="badge-tag ${isOrganized ? 'badge-installed' : 'badge-script'}">
              ${isOrganized ? '● Grid Auto-Organized' : '○ Standard Grid'}
            </span>
          </div>

          <!-- Selection Action Bar -->
          <div class="tweak-selection-bar">
            <div class="tweak-selection-count">
              <span><strong>${this.selectedFolderIds.size}</strong> of ${categories.length} folders selected</span>
            </div>
            <div class="tweak-selection-buttons">
              <button class="btn-text-action" id="btn-select-all">Select All</button>
              <span class="btn-divider">•</span>
              <button class="btn-text-action" id="btn-deselect-all">Deselect All</button>
            </div>
          </div>

          <!-- Selectable Folders Grid -->
          <div class="tweak-folders-grid">
            ${folderCardsHtml}
          </div>

          <!-- Apply / Restore Action Row -->
          <div class="tweak-actions-row">
            <button class="btn btn-primary" id="btn-organize-folders" ${this.isOrganizing || this.selectedFolderIds.size === 0 ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              <span>${this.isOrganizing ? 'Applying...' : `Organize App Grid (${this.selectedFolderIds.size} Folders)`}</span>
            </button>

            <button class="btn btn-secondary" id="btn-reset-folders" ${this.isOrganizing ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              <span>Restore Default Grid</span>
            </button>
          </div>
        </div>

        <!-- Section: Desktop & Window Behavior -->
        <div class="settings-section">
          <h3 class="settings-section-title">Desktop & Window Behavior</h3>
          <p class="settings-section-desc">Fine-tune Ubuntu Dock interaction and application window placement.</p>

          <div class="settings-card">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Click to Minimize on Dock</strong>
              </div>
              <p class="settings-option-desc">
                Clicking an active application icon in the Ubuntu Dock minimizes or restores its window.
              </p>
            </div>
            <div class="settings-card-right">
              <label class="switch">
                <input type="checkbox" id="tweak-click-minimize" ${tweaks.clickToMinimize ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Center New Windows</strong>
              </div>
              <p class="settings-option-desc">
                Always spawn newly opened application windows in the exact center of your display.
              </p>
            </div>
            <div class="settings-card-right">
              <label class="switch">
                <input type="checkbox" id="tweak-center-windows" ${tweaks.centerNewWindows ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Window Control Buttons Layout</strong>
              </div>
              <p class="settings-option-desc">
                Configure position of titlebar close, minimize, and maximize buttons.
              </p>
            </div>
            <div class="settings-card-right">
              <div class="tweak-btn-group">
                <button class="tweak-choice-btn ${tweaks.buttonLayout === 'appmenu:minimize,maximize,close' || tweaks.buttonLayout === 'appmenu:close' ? 'active' : ''}" data-layout="appmenu:minimize,maximize,close">
                  Right (Standard)
                </button>
                <button class="tweak-choice-btn ${tweaks.buttonLayout === 'close,minimize,maximize:appmenu' || tweaks.buttonLayout === 'close,minimize,maximize:' ? 'active' : ''}" data-layout="close,minimize,maximize:appmenu">
                  Left (macOS)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // 1. Selectable Folder Cards Click
    const folderCards = this.container.querySelectorAll('.tweak-folder-card');
    folderCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const folderId = card.getAttribute('data-folder-id');
        if (!folderId) return;

        if (this.selectedFolderIds.has(folderId)) {
          this.selectedFolderIds.delete(folderId);
        } else {
          this.selectedFolderIds.add(folderId);
        }
        this.renderUI();
      });
    });

    // 2. Select All
    const selectAllBtn = this.container.querySelector('#btn-select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const categories = this.appFoldersStatus?.definedCategories || [];
        categories.forEach(c => this.selectedFolderIds.add(c.id));
        this.renderUI();
      });
    }

    // 3. Deselect All
    const deselectAllBtn = this.container.querySelector('#btn-deselect-all');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        this.selectedFolderIds.clear();
        this.renderUI();
      });
    }

    // 4. Organize Folders Button
    const organizeBtn = this.container.querySelector('#btn-organize-folders');
    if (organizeBtn) {
      organizeBtn.addEventListener('click', async () => {
        if (this.selectedFolderIds.size === 0) {
          showToast('Please select at least 1 category folder', 'warning');
          return;
        }
        this.isOrganizing = true;
        this.renderUI();
        try {
          showToast(`Organizing apps into ${this.selectedFolderIds.size} folders...`, 'info');
          const res = await window.electronAPI.tweaks.organizeAppFolders({
            selectedFolders: Array.from(this.selectedFolderIds)
          });
          if (res && res.success) {
            showToast(res.message || 'Applications organized into category folders!', 'success');
          } else {
            showToast(res.error || 'Failed to organize app folders', 'warning');
          }
        } catch (err) {
          showToast('Error organizing apps: ' + err.message, 'warning');
        } finally {
          this.isOrganizing = false;
          await this.loadData();
          this.renderUI();
        }
      });
    }

    // 5. Reset Folders Button
    const resetBtn = this.container.querySelector('#btn-reset-folders');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        this.isOrganizing = true;
        this.renderUI();
        try {
          showToast('Restoring default App Grid layout...', 'info');
          const res = await window.electronAPI.tweaks.resetAppFolders();
          if (res && res.success) {
            showToast('App Grid restored to default.', 'success');
          }
        } catch (err) {
          showToast('Error resetting folders: ' + err.message, 'warning');
        } finally {
          this.isOrganizing = false;
          await this.loadData();
          this.renderUI();
        }
      });
    }

    // 6. Click to minimize toggle
    const minToggle = this.container.querySelector('#tweak-click-minimize');
    if (minToggle) {
      minToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        await window.electronAPI.tweaks.setDesktopTweak({ key: 'clickToMinimize', value: val });
        showToast(val ? 'Enabled Click to Minimize on Dock' : 'Disabled Click to Minimize', 'info');
      });
    }

    // 7. Center new windows toggle
    const centerToggle = this.container.querySelector('#tweak-center-windows');
    if (centerToggle) {
      centerToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        await window.electronAPI.tweaks.setDesktopTweak({ key: 'centerNewWindows', value: val });
        showToast(val ? 'New windows will open centered' : 'Default window placement restored', 'info');
      });
    }

    // 8. Button layout choices
    const choiceBtns = this.container.querySelectorAll('.tweak-choice-btn');
    choiceBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const layout = btn.getAttribute('data-layout');
        choiceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        await window.electronAPI.tweaks.setDesktopTweak({ key: 'buttonLayout', value: layout });
        showToast(`Window buttons set to ${layout.startsWith('close') ? 'Left (macOS)' : 'Right'}`, 'success');
      });
    });
  }
};

window.TweaksView = TweaksView;
