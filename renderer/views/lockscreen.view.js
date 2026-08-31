// renderer/views/lockscreen.view.js
// Handles GDM Login / Lock Screen customization view, system copying, and extension enablement

const LockscreenView = {
  container: null,
  gdmStatus: null,
  installedItems: [],
  isLoading: false,

  async render(containerEl) {
    if (containerEl) this.container = containerEl;
    if (this.container) {
      this.container.innerHTML = `
        <div class="settings-view-container" style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text-secondary);">
          <span>Loading Lock Screen settings...</span>
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
      if (window.electronAPI && window.electronAPI.gdm) {
        const [statusRes, installedRes] = await Promise.all([
          window.electronAPI.gdm.status(),
          window.electronAPI.installer ? window.electronAPI.installer.list() : Promise.resolve({ items: [] })
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

    const isGseInstalled = !!(this.gdmStatus && this.gdmStatus.gseGdmInstalled);

    // Filter installed items that are gdm-eligible
    const shellThemes = this.installedItems.filter(i => (i.category === 'shell-theme' || i.category === 'gtk-theme') && i.gdm_eligible !== false);
    const iconsAndCursors = this.installedItems.filter(i => (i.category === 'icon' || i.category === 'icon-theme' || i.category === 'cursor' || i.category === 'cursors'));

    this.container.innerHTML = `
      <div class="settings-view-container lockscreen-view-wrapper">
        <!-- Top Banner -->
        <div class="lockscreen-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <div>
            <strong>GDM Login & Lock Screen Customizer</strong>
            <p style="margin: 2px 0 0; font-size: 11.5px; opacity: 0.9;">
              Changes here apply to the system login/lock screen and require your administrator (sudo) password.
            </p>
          </div>
        </div>

        ${!isGseInstalled ? `
          <!-- Setup Required Prompt Card -->
          <div class="settings-section">
            <div class="settings-card" style="border-left: 3px solid #cf4110; flex-direction: column; align-items: flex-start; gap: 12px; padding: 18px 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div class="settings-option-title">
                  <strong style="font-size: 14px;">GSE-GDM Extension Setup Required</strong>
                  <span class="badge-tag badge-script">Setup Needed</span>
                </div>
                <button class="btn btn-secondary" id="btn-recheck-gdm" style="padding: 5px 12px; font-size: 11.5px;">
                  Re-check Status
                </button>
              </div>

              <p class="settings-option-desc" style="font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
                To customize the GDM login and lock screen appearance on GNOME 42+, the <strong>GSE-GDM Extension</strong> (<code>gdm-extension@pratap.fastmail.fm</code>) must be installed.
              </p>

              <div style="background: #f4f4f5; padding: 10px 14px; border-radius: var(--radius); width: 100%; border: 1px solid #e4e4e7;">
                <span style="font-size: 11px; font-weight: 700; color: #18181b; display: block; margin-bottom: 4px;">Quick Install Command (Terminal):</span>
                <code style="font-size: 11.5px; color: #cf4110; user-select: all; font-family: monospace; display: block;">
                  git clone https://github.com/pratap-panabaka/gse-gdm-extension.git &amp;&amp; cd gse-gdm-extension &amp;&amp; sudo ./install.sh
                </code>
              </div>

              <div style="display: flex; gap: 10px; margin-top: 4px;">
                <a href="https://github.com/pratap-panabaka/gse-gdm-extension" target="_blank" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; padding: 6px 12px;">
                  View on GitHub ↗
                </a>
              </div>
            </div>
          </div>
        ` : `
          <!-- Extension Active Card -->
          <div class="settings-section">
            <div class="settings-card">
              <div class="settings-card-left">
                <div class="settings-option-title">
                  <strong>GSE-GDM Integration Active</strong>
                  <span class="badge-tag badge-installed">Extension Installed</span>
                </div>
                <p class="settings-option-desc">
                  Enable theming in the GDM system user session so custom themes and icons are loaded at the login screen.
                </p>
              </div>
              <div class="settings-card-right">
                <button class="btn btn-primary" id="btn-enable-gdm-custom" style="padding: 7px 14px; font-size: 11.5px; background: #cf4110; color: #ffffff; border: none;">
                  Enable GDM Theming
                </button>
              </div>
            </div>
          </div>
        `}

        <!-- Section: Shell Themes -->
        <div class="settings-section">
          <h3 class="settings-section-title">Lock Screen Shell Themes</h3>
          <p class="settings-section-desc">
            Copy installed shell themes to <code>/usr/share/themes</code> and set for the login screen.
          </p>

          <div class="gdm-items-list">
            ${shellThemes.length === 0 ? `
              <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px; background: #fafafa; border: 1px dashed var(--border-card); border-radius: var(--radius);">
                No installed shell themes found. Install <strong>Orchis</strong> or <strong>WhiteSur</strong> from the Shell Themes tab first.
              </div>
            ` : shellThemes.map(theme => `
              <div class="gdm-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #ffffff; border: 1px solid var(--border-card); border-radius: var(--radius); margin-bottom: 8px;">
                <div>
                  <strong style="font-size: 13px; color: #000000;">${theme.name}</strong>
                  <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 1px;">
                    ${theme.installed_folders && theme.installed_folders[0] ? theme.installed_folders[0] : theme.name}
                  </span>
                </div>
                <button class="btn btn-primary btn-apply-gdm-theme" data-id="${theme.id}" data-name="${theme.installed_folders && theme.installed_folders[0] ? theme.installed_folders[0] : theme.name}" data-category="shell-theme" style="padding: 6px 12px; font-size: 11.5px; background: #cf4110; color: #fff; border: none;">
                  Apply to Lock Screen
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section: Icons & Cursors -->
        <div class="settings-section">
          <h3 class="settings-section-title">System Icons & Cursors for GDM</h3>
          <p class="settings-section-desc">
            Copies custom icon and cursor packs into <code>/usr/share/icons</code> for system-wide and login screen display.
          </p>

          <div class="gdm-items-list">
            ${iconsAndCursors.length === 0 ? `
              <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px; background: #fafafa; border: 1px dashed var(--border-card); border-radius: var(--radius);">
                No installed icons or cursors found. Install icons from the Icons/Cursors tabs first.
              </div>
            ` : iconsAndCursors.map(item => `
              <div class="gdm-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #ffffff; border: 1px solid var(--border-card); border-radius: var(--radius); margin-bottom: 8px;">
                <div>
                  <strong style="font-size: 13px; color: #000000;">${item.name}</strong>
                  <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 1px;">
                    ${item.category === 'cursor' ? 'Cursor Pack' : 'Icon Theme'}
                  </span>
                </div>
                <button class="btn btn-secondary btn-copy-gdm-icon" data-id="${item.id}" data-category="icon" style="padding: 6px 12px; font-size: 11.5px;">
                  Copy to System
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // 1. Re-check GDM status
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

    // 2. Enable GDM Customization
    const enableBtn = this.container.querySelector('#btn-enable-gdm-custom');
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        enableBtn.disabled = true;
        enableBtn.textContent = 'Enabling...';
        showToast('Enabling GDM session theming (requires admin password)...', 'info');

        try {
          const res = await window.electronAPI.gdm.enableExtension();
          if (res && res.success) {
            showToast('GDM Login Screen theming enabled successfully!', 'success');
          } else if (res && res.cancelled) {
            showToast('Administrator authentication was cancelled.', 'info');
          } else {
            showToast(`Failed to enable: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          enableBtn.disabled = false;
          enableBtn.textContent = 'Enable GDM Theming';
        }
      });
    }

    // 3. Apply Shell Theme to Lock Screen
    this.container.querySelectorAll('.btn-apply-gdm-theme').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const themeName = btn.getAttribute('data-name');
        btn.disabled = true;
        btn.textContent = 'Applying...';
        showToast(`Applying ${themeName} to Lock Screen (requires admin password)...`, 'info');

        try {
          // Step 1: Copy theme folder to /usr/share/themes
          const copyRes = await window.electronAPI.gdm.copyAsset({ id, category: 'shell-theme' });
          if (copyRes && copyRes.cancelled) {
            showToast('Authentication cancelled.', 'info');
            return;
          }

          // Step 2: Set shell theme in GDM dconf
          const setRes = await window.electronAPI.gdm.setShellTheme({ themeName });
          if (setRes && setRes.success) {
            showToast(`${themeName} applied to GDM Login Screen!`, 'success');
          } else if (setRes && setRes.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Theme copied to /usr/share/themes. Setting GDM dconf: ${setRes ? setRes.error : ''}`, 'info');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Apply to Lock Screen';
        }
      });
    });

    // 4. Copy Icon Theme to System
    this.container.querySelectorAll('.btn-copy-gdm-icon').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Copying...';
        showToast('Copying to /usr/share/icons (requires admin password)...', 'info');

        try {
          const res = await window.electronAPI.gdm.copyAsset({ id, category: 'icon' });
          if (res && res.success) {
            showToast('Icons copied to /usr/share/icons for GDM!', 'success');
          } else if (res && res.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Copy failed: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Copy to System';
        }
      });
    });
  }
};

window.LockscreenView = LockscreenView;
