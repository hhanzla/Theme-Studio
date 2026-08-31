// renderer/views/tweaks.view.js
// Handles desktop tweaks, App Grid auto-folders organization, and UI controls

const TweaksView = {
  container: null,
  appFoldersStatus: null,
  desktopTweaks: null,
  isOrganizing: false,

  async render(containerEl) {
    if (containerEl) this.container = containerEl;
    if (this.container) {
      this.container.innerHTML = `
        <div class="tweaks-view-container" style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text-secondary);">
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
    const activeFolders = Array.isArray(status.activeFolders) ? status.activeFolders : [];
    const totalApps = status.totalApps || 0;

    const categoriesList = [
      { id: 'Internet', name: 'Internet & Web', icon: '🌐', desc: 'Browsers, Chat, Cloud & Mail' },
      { id: 'Development', name: 'Development', icon: '💻', desc: 'IDEs, Terminals & Code Tools' },
      { id: 'Media', name: 'Audio & Video', icon: '🎬', desc: 'Players, Streaming & Sound' },
      { id: 'Graphics', name: 'Graphics & Photos', icon: '🎨', desc: 'Image Viewers & Editors' },
      { id: 'Office', name: 'Office & Documents', icon: '📄', desc: 'Documents, Readers & PDFs' },
      { id: 'System', name: 'System & Tools', icon: '⚙️', desc: 'Monitor, Disk, Package Managers' },
      { id: 'Utilities', name: 'Utilities', icon: '🛠️', desc: 'Clock, Calculator, Text Tools' },
      { id: 'Games', name: 'Games', icon: '🎮', desc: 'Game Launchers & Emulators' }
    ];

    const categoryChipsHtml = categoriesList.map(cat => {
      const isFolderActive = activeFolders.includes(cat.id);
      return `
        <div class="tweak-category-chip ${isFolderActive ? 'active' : ''}">
          <span class="chip-icon">${cat.icon}</span>
          <div class="chip-content">
            <span class="chip-title">${cat.name}</span>
            <span class="chip-desc">${cat.desc}</span>
          </div>
          ${isFolderActive ? '<span class="chip-badge">Active</span>' : ''}
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="tweaks-view-container">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title-group">
            <h1 class="view-title">Desktop Tweaks</h1>
            <p class="view-subtitle">Customize GNOME App Menu layout, dock behavior, and window management</p>
          </div>
        </div>

        <div class="tweaks-content-layout">
          <!-- Featured: App Menu Auto Folders Card -->
          <div class="tweak-hero-card">
            <div class="tweak-hero-header">
              <div class="tweak-hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                  <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                </svg>
              </div>
              <div class="tweak-hero-info">
                <div class="tweak-hero-title-row">
                  <h2 class="tweak-hero-title">Smart App Menu Auto-Categorizer</h2>
                  <span class="status-pill ${isOrganized ? 'status-active' : 'status-default'}">
                    ${isOrganized ? '● Auto-Organized' : '○ Standard Grid'}
                  </span>
                </div>
                <p class="tweak-hero-desc">
                  Automatically scans all <strong>${totalApps} installed desktop apps</strong> and groups them cleanly into curated category folders (Internet, Development, Media, Graphics, Office, System, Utilities) in your GNOME App Grid.
                </p>
              </div>
            </div>

            <!-- Visual Preview of Folders -->
            <div class="tweak-categories-grid">
              ${categoryChipsHtml}
            </div>

            <!-- Action Controls -->
            <div class="tweak-hero-actions">
              <button class="btn btn-primary btn-lg" id="btn-organize-folders" ${this.isOrganizing ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
                <span>${this.isOrganizing ? 'Organizing Apps...' : 'Auto-Organize App Grid into Folders'}</span>
              </button>

              <button class="btn btn-secondary" id="btn-reset-folders" ${this.isOrganizing ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                <span>Restore Default Grid</span>
              </button>
            </div>
          </div>

          <!-- Section: Quick Desktop Tweaks -->
          <div class="tweaks-section-card">
            <h3 class="tweaks-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Interface & Window Behavior</span>
            </h3>

            <div class="tweak-row">
              <div class="tweak-row-text">
                <span class="tweak-row-label">Click to Minimize on Dock</span>
                <span class="tweak-row-sub">Clicking an active application icon on Ubuntu Dock minimizes its window</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="tweak-click-minimize" ${tweaks.clickToMinimize ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="tweak-row">
              <div class="tweak-row-text">
                <span class="tweak-row-label">Center New Windows</span>
                <span class="tweak-row-sub">Always spawn newly opened application windows in the center of the display</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="tweak-center-windows" ${tweaks.centerNewWindows ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>

            <div class="tweak-row">
              <div class="tweak-row-text">
                <span class="tweak-row-label">Window Control Buttons Layout</span>
                <span class="tweak-row-sub">Position of close, minimize, and maximize buttons on window titlebars</span>
              </div>
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
    // 1. Organize Folders Button
    const organizeBtn = this.container.querySelector('#btn-organize-folders');
    if (organizeBtn) {
      organizeBtn.addEventListener('click', async () => {
        this.isOrganizing = true;
        this.renderUI();
        try {
          showToast('Scanning applications and organizing App Grid...', 'info');
          const res = await window.electronAPI.tweaks.organizeAppFolders();
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

    // 2. Reset Folders Button
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

    // 3. Click to minimize toggle
    const minToggle = this.container.querySelector('#tweak-click-minimize');
    if (minToggle) {
      minToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        await window.electronAPI.tweaks.setDesktopTweak({ key: 'clickToMinimize', value: val });
        showToast(val ? 'Enabled Click to Minimize on Dock' : 'Disabled Click to Minimize', 'info');
      });
    }

    // 4. Center new windows toggle
    const centerToggle = this.container.querySelector('#tweak-center-windows');
    if (centerToggle) {
      centerToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        await window.electronAPI.tweaks.setDesktopTweak({ key: 'centerNewWindows', value: val });
        showToast(val ? 'New windows will open centered' : 'Default window placement restored', 'info');
      });
    }

    // 5. Button layout choices
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
