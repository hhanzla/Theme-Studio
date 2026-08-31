// renderer/views/lockscreen.view.js
// Complete GDM Login / Lock Screen customization view: install/uninstall, blur, colors, themes, icons, background, button toggle

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
    const availableBackgrounds = (this.gdmStatus && this.gdmStatus.availableBackgrounds) || [];
    const availableThemes = (this.gdmStatus && this.gdmStatus.availableThemes) || [];
    const availableIcons = (this.gdmStatus && this.gdmStatus.availableIcons) || [];
    const hideButton = !!(this.gdmStatus && this.gdmStatus.hideButton);

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
            <strong>GDM Login &amp; Lock Screen Manager</strong>
            <p style="margin: 2px 0 0; font-size: 11.5px; opacity: 0.9;">
              Customize GNOME login screen appearance, background blur, themes, icons, and logo. Changes require admin (sudo) authorization.
            </p>
          </div>
        </div>

        ${!isGseInstalled ? `
          <!-- Setup Required Prompt Card -->
          <div class="settings-section">
            <div class="settings-card" style="border-left: 3px solid #cf4110; flex-direction: column; align-items: flex-start; gap: 14px; padding: 20px 22px;">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div class="settings-option-title">
                  <strong style="font-size: 14.5px; color: #18181b;">GSE-GDM Extension Setup Required</strong>
                  <span class="badge-tag badge-script">Setup Needed</span>
                </div>
                <button class="btn btn-secondary" id="btn-recheck-gdm" style="padding: 6px 12px; font-size: 11.5px;">
                  Re-check Status
                </button>
              </div>

              <p class="settings-option-desc" style="font-size: 12.5px; line-height: 1.5; color: var(--text-secondary); margin: 0;">
                To customize the GDM login and lock screen appearance on GNOME 42+, the <strong>GSE-GDM Extension</strong> (<code>gdm-extension@pratap.fastmail.fm</code>) is required. You can install it in 1 click below:
              </p>

              <div style="display: flex; flex-wrap: wrap; gap: 10px; width: 100%; align-items: center;">
                <button class="btn btn-primary" id="btn-clone-install-gdm" style="padding: 8px 16px; font-size: 12px; background: #cf4110; color: #ffffff; border: none; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  1-Click Clone &amp; Install GSE-GDM Extension
                </button>

                <a href="https://github.com/pratap-panabaka/gse-gdm-extension" target="_blank" class="btn btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; padding: 7px 13px;">
                  View on GitHub ↗
                </a>
              </div>
            </div>
          </div>
        ` : `
          <!-- Integration Active & Life-cycle Card -->
          <div class="settings-section">
            <div class="settings-card" style="padding: 16px 20px;">
              <div class="settings-card-left">
                <div class="settings-option-title">
                  <strong style="font-size: 14px;">GSE-GDM Extension Integration</strong>
                  <span class="badge-tag badge-installed">Installed &amp; Active</span>
                </div>
                <p class="settings-option-desc">
                  GSE-GDM extension is installed at <code>/usr/local/share/gnome-shell/extensions/${window.electronAPI.gdm ? 'gdm-extension@pratap.fastmail.fm' : ''}</code>.
                </p>
              </div>
              <div class="settings-card-right" style="display: flex; gap: 8px;">
                <button class="btn btn-primary" id="btn-enable-gdm-custom" style="padding: 7px 14px; font-size: 11.5px; background: #cf4110; color: #ffffff; border: none; font-weight: 600;">
                  Enable GDM Theming
                </button>
                <button class="btn btn-secondary" id="btn-uninstall-gse-gdm" style="padding: 7px 12px; font-size: 11.5px; color: #ef4444;" title="Uninstall GSE-GDM extension">
                  Uninstall Extension
                </button>
              </div>
            </div>
          </div>

          <!-- Section: Login Screen Visual Customizer -->
          <div class="settings-section">
            <h3 class="settings-section-title">Login Screen Visual Customization</h3>
            <p class="settings-section-desc">
              Configure background image, blur intensity, gradient colors, and lock screen settings directly in GDM dconf.
            </p>

            <div class="settings-card" style="flex-direction: column; align-items: stretch; gap: 16px; padding: 18px 20px;">
              <!-- Background Image -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div>
                  <strong style="font-size: 13px; color: #18181b;">Background Image</strong>
                  <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Select wallpaper from <code>/usr/share/backgrounds</code></span>
                </div>
                <select id="gdm-bg-select" class="form-select" style="padding: 6px 12px; border: 1px solid var(--border-card); border-radius: var(--radius); font-size: 12px; min-width: 200px;">
                  <option value="">Default GNOME Background</option>
                  ${availableBackgrounds.map(bg => `<option value="${bg}">${bg}</option>`).join('')}
                </select>
              </div>

              <div style="height: 1px; background: var(--border-subtle, #f4f4f5);"></div>

              <!-- Blur Radius & Brightness -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <strong style="font-size: 12.5px; color: #18181b;">Blur Radius</strong>
                    <span id="lbl-blur-radius" style="font-size: 11.5px; font-weight: 600; color: #cf4110;">0px</span>
                  </div>
                  <input type="range" id="gdm-blur-radius" min="0" max="100" value="0" style="width: 100%; accent-color: #cf4110;">
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <strong style="font-size: 12.5px; color: #18181b;">Blur Brightness</strong>
                    <span id="lbl-blur-brightness" style="font-size: 11.5px; font-weight: 600; color: #cf4110;">0.65</span>
                  </div>
                  <input type="range" id="gdm-blur-brightness" min="0" max="1" step="0.05" value="0.65" style="width: 100%; accent-color: #cf4110;">
                </div>
              </div>

              <div style="height: 1px; background: var(--border-subtle, #f4f4f5);"></div>

              <!-- Background Size & Button Visibility -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div>
                  <strong style="font-size: 13px; color: #18181b;">Background Size</strong>
                  <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Image scaling mode on login screen</span>
                </div>
                <select id="gdm-bg-size" class="form-select" style="padding: 6px 12px; border: 1px solid var(--border-card); border-radius: var(--radius); font-size: 12px; min-width: 140px;">
                  <option value="cover" selected>Cover</option>
                  <option value="contain">Contain</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div style="height: 1px; background: var(--border-subtle, #f4f4f5);"></div>

              <!-- Hide Button on Login Screen -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div>
                  <strong style="font-size: 13px; color: #18181b;">Hide Settings Button on Login Screen</strong>
                  <span style="font-size: 11.5px; color: var(--text-muted); display: block;">Hides the GSE-GDM gear button from the GDM top bar</span>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="chk-hide-gdm-btn" ${hideButton ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                <button class="btn btn-primary" id="btn-save-gdm-visuals" style="padding: 8px 18px; font-size: 12px; background: #cf4110; color: #ffffff; border: none; font-weight: 600;">
                  Apply Visual Settings
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
          <h3 class="settings-section-title">System Icons &amp; Cursors for GDM</h3>
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

        <!-- Section: Safety & Reset Recovery -->
        <div class="settings-section">
          <h3 class="settings-section-title">Safety &amp; Recovery</h3>
          <div class="settings-card" style="border-left: 3px solid #71717a;">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Reset Lock Screen to Default</strong>
              </div>
              <p class="settings-option-desc">
                Reverts all GDM session dconf settings (themes, backgrounds, blur, button visibility) back to standard Ubuntu defaults.
              </p>
            </div>
            <div class="settings-card-right">
              <button class="btn btn-secondary" id="btn-reset-gdm-default" style="padding: 6px 12px; font-size: 11.5px;">
                Reset GDM Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // 0. Clone & Install GSE-GDM Extension (1-Click)
    const cloneInstallBtn = this.container.querySelector('#btn-clone-install-gdm');
    if (cloneInstallBtn) {
      cloneInstallBtn.addEventListener('click', async () => {
        cloneInstallBtn.disabled = true;
        cloneInstallBtn.innerHTML = `
          <svg class="spin-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          Installing GSE-GDM...
        `;
        showToast('Cloning & running GSE-GDM installer (requires admin password)...', 'info');

        try {
          const res = await window.electronAPI.gdm.installGseGdm();
          if (res && res.success) {
            showToast('GSE-GDM Extension installed successfully!', 'success');
            await this.loadData();
            this.renderUI();
          } else if (res && res.cancelled) {
            showToast('Administrator authentication was cancelled.', 'info');
          } else {
            showToast(`Installation failed: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          if (cloneInstallBtn) {
            cloneInstallBtn.disabled = false;
            cloneInstallBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              1-Click Clone &amp; Install GSE-GDM Extension
            `;
          }
        }
      });
    }

    // 1. Uninstall GSE-GDM
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
            await this.loadData();
            this.renderUI();
          } else if (res && res.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Uninstall error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          if (uninstallBtn) uninstallBtn.disabled = false;
        }
      });
    }

    // 2. Re-check GDM status
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

    // 3. Enable GDM Customization
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

    // 4. Sliders live feedback
    const blurRadiusInput = this.container.querySelector('#gdm-blur-radius');
    const lblBlurRadius = this.container.querySelector('#lbl-blur-radius');
    if (blurRadiusInput && lblBlurRadius) {
      blurRadiusInput.addEventListener('input', () => {
        lblBlurRadius.textContent = `${blurRadiusInput.value}px`;
      });
    }

    const blurBrightnessInput = this.container.querySelector('#gdm-blur-brightness');
    const lblBlurBrightness = this.container.querySelector('#lbl-blur-brightness');
    if (blurBrightnessInput && lblBlurBrightness) {
      blurBrightnessInput.addEventListener('input', () => {
        lblBlurBrightness.textContent = blurBrightnessInput.value;
      });
    }

    // 5. Apply Visual Settings
    const saveVisualsBtn = this.container.querySelector('#btn-save-gdm-visuals');
    if (saveVisualsBtn) {
      saveVisualsBtn.addEventListener('click', async () => {
        saveVisualsBtn.disabled = true;
        saveVisualsBtn.textContent = 'Applying...';
        showToast('Applying visual settings to GDM (requires admin password)...', 'info');

        const bgSelect = this.container.querySelector('#gdm-bg-select');
        const bgSizeSelect = this.container.querySelector('#gdm-bg-size');
        const chkHideBtn = this.container.querySelector('#chk-hide-gdm-btn');

        const config = {
          backgroundImage: bgSelect ? bgSelect.value : undefined,
          backgroundSize: bgSizeSelect ? bgSizeSelect.value : undefined,
          blurRadius: blurRadiusInput ? parseInt(blurRadiusInput.value, 10) : undefined,
          blurBrightness: blurBrightnessInput ? parseFloat(blurBrightnessInput.value) : undefined,
          hideButton: chkHideBtn ? chkHideBtn.checked : undefined
        };

        try {
          const res = await window.electronAPI.gdm.updateConfig(config);
          if (res && res.success) {
            showToast('Login Screen visual settings applied successfully!', 'success');
          } else if (res && res.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Update error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          saveVisualsBtn.disabled = false;
          saveVisualsBtn.textContent = 'Apply Visual Settings';
        }
      });
    }

    // 6. Apply Shell Theme to Lock Screen
    this.container.querySelectorAll('.btn-apply-gdm-theme').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const themeName = btn.getAttribute('data-name');
        btn.disabled = true;
        btn.textContent = 'Applying...';
        showToast(`Applying ${themeName} to Lock Screen (requires admin password)...`, 'info');

        try {
          const copyRes = await window.electronAPI.gdm.copyAsset({ id, category: 'shell-theme' });
          if (copyRes && copyRes.cancelled) {
            showToast('Authentication cancelled.', 'info');
            return;
          }

          const setRes = await window.electronAPI.gdm.setShellTheme({ themeName });
          if (setRes && setRes.success) {
            showToast(`${themeName} applied to GDM Login Screen!`, 'success');
          } else if (setRes && setRes.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Theme copied to /usr/share/themes. Setting GDM: ${setRes ? setRes.error : ''}`, 'info');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Apply to Lock Screen';
        }
      });
    });

    // 7. Copy Icon Theme to System
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

    // 8. Reset GDM Settings
    const resetGdmBtn = this.container.querySelector('#btn-reset-gdm-default');
    if (resetGdmBtn) {
      resetGdmBtn.addEventListener('click', async () => {
        resetGdmBtn.disabled = true;
        resetGdmBtn.textContent = 'Resetting...';
        showToast('Resetting GDM session settings to defaults...', 'info');

        try {
          const res = await window.electronAPI.gdm.resetDefault();
          if (res && res.success) {
            showToast('GDM Lock Screen settings reset to default!', 'success');
          } else if (res && res.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Reset error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          resetGdmBtn.disabled = false;
          resetGdmBtn.textContent = 'Reset GDM Settings';
        }
      });
    }
  }
};

window.LockscreenView = LockscreenView;
