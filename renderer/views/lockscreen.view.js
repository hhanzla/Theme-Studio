// renderer/views/lockscreen.view.js
// GDM Lock Screen Management & Interactive Setup Guide

const LockscreenView = {
  container: null,
  gdmStatus: null,
  installedItems: [],
  isLoading: false,

  async render(containerEl) {
    if (containerEl) this.container = containerEl;
    if (this.gdmStatus) {
      this.renderUI();
    }
    await this.loadData();
    this.renderUI();
  },

  async init(containerEl) {
    return this.render(containerEl);
  },

  async loadData() {
    try {
      if (window.electronAPI && window.electronAPI.gdm) {
        const [statusRes, installedRes] = await Promise.all([
          window.electronAPI.gdm.status(),
          (window.electronAPI.uninstall && window.electronAPI.uninstall.list) 
            ? window.electronAPI.uninstall.list() 
            : (window.electronAPI.installer && window.electronAPI.installer.list ? window.electronAPI.installer.list() : Promise.resolve({ items: [] }))
        ]);
        this.gdmStatus = statusRes || {};
        this.installedItems = (installedRes && installedRes.items) ? installedRes.items : [];
      }
    } catch (err) {
      console.error('[LockscreenView] Failed to load data:', err);
    }
  },

  renderUI() {
    if (!this.container) return;
    if (window.AppState && window.AppState.activeCategory !== 'lockscreen') return;

    const isGseInstalled = !!(this.gdmStatus && this.gdmStatus.gseGdmInstalled);
    const availableBackgrounds = (this.gdmStatus && this.gdmStatus.availableBackgrounds) || [];

    this.container.innerHTML = `
      <div class="lockscreen-view-wrapper">
        <!-- Top Status Header Card -->
        <div class="lockscreen-header-card">
          <div class="lockscreen-header-left">
            <div class="lockscreen-status-row">
              <span class="badge-tag ${isGseInstalled ? 'badge-installed' : 'badge-script'}">
                ${isGseInstalled ? 'Installed &amp; Active' : 'Setup Needed'}
              </span>
              <span class="lockscreen-version-text">GNOME Shell 46</span>
            </div>
            <h3 class="lockscreen-header-title">GDM Login &amp; Logout Screen Customizer</h3>
            <p class="lockscreen-header-desc">
              ${isGseInstalled 
                ? 'GSE-GDM extension is installed. First sync your themes/wallpapers below, then log out to customize GDM directly on the login screen.' 
                : 'Install the bundled GSE-GDM extension in 1 click below to unlock live login/logout screen wallpaper, blur effects, and on-screen controls.'}
            </p>
          </div>
          <div class="lockscreen-header-actions">
            ${!isGseInstalled ? `
              <button class="btn btn-primary" id="btn-clone-install-gdm">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Install</span>
              </button>
              <button class="btn btn-secondary" id="btn-recheck-gdm">
                Re-check
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-test-logout-screen" title="Log out of user session to test GDM login screen">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout (Test GDM)</span>
              </button>
              <button class="btn btn-secondary" id="btn-recheck-gdm">
                Re-check
              </button>
              <button class="btn btn-secondary" id="btn-uninstall-gse-gdm" style="color: #ef4444;" title="Uninstall GSE-GDM extension">
                Uninstall
              </button>
            `}
          </div>
        </div>

        <!-- Visual Step-by-Step Instructions & Guide -->
        <div class="settings-section">
          <h3 class="settings-section-title">How to Customize GDM Login / Logout Screen</h3>
          <p class="settings-section-desc">
            GSE-GDM runs inside the <strong>GDM Display Manager</strong> (the screen that appears after logging out, switching user, or booting up).
          </p>

          <div class="lockscreen-guide-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 14px;">
            <!-- Guide Card 1 -->
            <div class="lockscreen-card" style="display: flex; flex-direction: column; gap: 10px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 20px;">🔄</div>
                <span class="badge-tag badge-script">Step 1</span>
              </div>
              <strong style="font-size: 13.5px; color: var(--text-primary);">Sync Themes &amp; Wallpapers</strong>
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Click the <strong>"Sync to GDM System"</strong> button below to copy all your installed themes (Orchis, etc.) and wallpapers into <code>/usr/local/share/</code> so GDM can read them.
              </p>
            </div>

            <!-- Guide Card 2 -->
            <div class="lockscreen-card" style="display: flex; flex-direction: column; gap: 10px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 20px;">🚪</div>
                <span class="badge-tag badge-script">Step 2</span>
              </div>
              <strong style="font-size: 13.5px; color: var(--text-primary);">Log Out to GDM Screen</strong>
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Click <strong>"Logout (Test GDM)"</strong> above or log out of your GNOME session. The GDM login screen will load.
              </p>
            </div>

            <!-- Guide Card 3 -->
            <div class="lockscreen-card" style="display: flex; flex-direction: column; gap: 10px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 20px;">⚙️</div>
                <span class="badge-tag badge-script">Step 3</span>
              </div>
              <strong style="font-size: 13.5px; color: var(--text-primary);">Open GDM Customization Menu</strong>
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                On the login/logout screen, look at the top-right panel bar. Click the <strong>gear/sliders icon</strong> to open the live dropdown menus.
              </p>
            </div>

            <!-- Guide Card 4 -->
            <div class="lockscreen-card" style="display: flex; flex-direction: column; gap: 10px; padding: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 20px;">🎨</div>
                <span class="badge-tag badge-script">Step 4</span>
              </div>
              <strong style="font-size: 13.5px; color: var(--text-primary);">Pick Wallpaper, Blur &amp; Theme</strong>
              <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.45; margin: 0;">
                Select any synced wallpaper, shell theme, blur radius, or custom banner. All changes are auto-saved in the GDM database permanently.
              </p>
            </div>
          </div>
        </div>

        <!-- System Assets Sync for GDM (Themes, Icons & Wallpapers) -->
        <div class="settings-section">
          <h3 class="settings-section-title">GDM Themes &amp; Wallpapers Sync</h3>
          <p class="settings-section-desc">
            GDM login screen runs under a separate system user and strictly reads assets from <code>/usr/local/share/</code> or <code>/usr/share/</code>.
          </p>

          <div class="lockscreen-card" style="margin-top: 10px;">
            <div class="lockscreen-row">
              <div class="lockscreen-row-info">
                <strong>Sync All Themes, Icons &amp; Wallpapers to GDM</strong>
                <span>1-Click copies all your installed themes (Orchis, etc.), icons (Tela, etc.), and catalog wallpapers to <code>/usr/local/share/</code> so they immediately appear in GDM's login dropdown menus.</span>
              </div>
              <div class="lockscreen-row-control">
                <button class="btn btn-primary" id="btn-sync-all-gdm">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                  </svg>
                  <span>Sync to GDM System</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Helper: Copy Custom Wallpaper into System Backgrounds -->
        <div class="settings-section">
          <h3 class="settings-section-title">Custom Wallpaper File Copy</h3>
          <p class="settings-section-desc">
            Want to use a personal photo on GDM? Select any image file from your PC to copy it into <code>/usr/local/share/backgrounds/</code>.
          </p>

          <div class="lockscreen-card" style="margin-top: 10px;">
            <div class="lockscreen-row">
              <div class="lockscreen-row-info">
                <strong>Select &amp; Copy Personal Wallpaper</strong>
                <span>Browse and copy an individual image file for GDM access (Requires admin password).</span>
              </div>
              <div class="lockscreen-row-control">
                <button class="btn btn-secondary" id="btn-copy-custom-wallpaper">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <circle cx="9" cy="9" r="2"></circle>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                  </svg>
                  <span>Select Image</span>
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
    // 1. Install GSE-GDM
    const cloneInstallBtn = this.container.querySelector('#btn-clone-install-gdm');
    if (cloneInstallBtn) {
      cloneInstallBtn.addEventListener('click', async () => {
        cloneInstallBtn.disabled = true;
        cloneInstallBtn.innerHTML = `
          <svg class="spin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          Installing...
        `;
        showToast('Installing GSE-GDM Extension (requires admin password)...', 'info');

        try {
          const res = await window.electronAPI.gdm.installGseGdm();
          if (res && res.success) {
            showToast('GSE-GDM Extension installed successfully!', 'success');
          } else if (res && res.cancelled) {
            showToast('Administrator authentication was cancelled.', 'info');
          } else {
            showToast(`Installation failed: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          await this.loadData();
          this.renderUI();
        }
      });
    }

    // 2. Logout / GDM Test
    const logoutBtn = this.container.querySelector('#btn-test-logout-screen');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (!confirm('Log out of current user session to open the GDM login screen? (Please save any open files first)')) return;
        showToast('Logging out to GDM screen...', 'info');
        setTimeout(async () => {
          if (window.electronAPI && window.electronAPI.gdm && window.electronAPI.gdm.logoutSession) {
            await window.electronAPI.gdm.logoutSession();
          }
        }, 800);
      });
    }

    // 3. Re-check GDM status
    const recheckBtn = this.container.querySelector('#btn-recheck-gdm');
    if (recheckBtn) {
      recheckBtn.addEventListener('click', async () => {
        recheckBtn.disabled = true;
        recheckBtn.textContent = 'Checking...';
        await this.loadData();
        this.renderUI();
        showToast('GDM extension status refreshed.', 'info');
      });
    }

    // 4. Uninstall GSE-GDM
    const uninstallBtn = this.container.querySelector('#btn-uninstall-gse-gdm');
    if (uninstallBtn) {
      uninstallBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to uninstall the GSE-GDM extension from your system?')) return;
        uninstallBtn.disabled = true;
        showToast('Uninstalling GSE-GDM extension (requires admin password)...', 'info');

        try {
          const res = await window.electronAPI.gdm.uninstallGseGdm();
          if (res && res.success) {
            showToast('GSE-GDM extension uninstalled successfully!', 'success');
          } else if (res && res.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Uninstall error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          await this.loadData();
          this.renderUI();
        }
      });
    }

    // 5. Sync All Themes & Wallpapers to GDM
    const syncAllBtn = this.container.querySelector('#btn-sync-all-gdm');
    if (syncAllBtn) {
      syncAllBtn.addEventListener('click', async () => {
        syncAllBtn.disabled = true;
        syncAllBtn.innerHTML = `
          <svg class="spin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          Syncing...
        `;
        showToast('Syncing all themes, icons & wallpapers to /usr/local/share (requires admin password)...', 'info');

        try {
          const res = await window.electronAPI.gdm.syncAssets();
          if (res && res.success) {
            showToast('All themes, icons & wallpapers synced to GDM successfully!', 'success');
          } else if (res && res.cancelled) {
            showToast('Administrator authentication was cancelled.', 'info');
          } else {
            showToast(`Sync failed: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          await this.loadData();
          this.renderUI();
        }
      });
    }

    // 5. Select and Copy Custom Wallpaper
    const copyWallBtn = this.container.querySelector('#btn-copy-custom-wallpaper');
    if (copyWallBtn) {
      copyWallBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          showToast(`Copying ${file.name} to /usr/share/backgrounds (requires admin password)...`, 'info');
          try {
            const res = await window.electronAPI.gdm.copyAsset({
              path: file.path,
              category: 'wallpaper'
            });

            if (res && res.success) {
              showToast(`${file.name} successfully copied to system backgrounds for GDM!`, 'success');
              await this.loadData();
              this.renderUI();
            } else if (res && res.cancelled) {
              showToast('Administrator authentication was cancelled.', 'info');
            } else {
              showToast(`Failed to copy: ${res ? res.error : 'Unknown error'}`, 'warning');
            }
          } catch (err) {
            showToast(`Error: ${err.message}`, 'warning');
          }
        };
        fileInput.click();
      });
    }
  }
};

window.LockscreenView = LockscreenView;
