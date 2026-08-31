// renderer/views/lockscreen.view.js
// Complete GDM Login / Lock Screen Management Studio with refined minimalist UI

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
    if (window.AppState && window.AppState.activeCategory !== 'lockscreen') return;

    const isGseInstalled = !!(this.gdmStatus && this.gdmStatus.gseGdmInstalled);
    const availableBackgrounds = (this.gdmStatus && this.gdmStatus.availableBackgrounds) || [];
    const availableThemes = (this.gdmStatus && this.gdmStatus.availableThemes) || [];
    const availableIcons = (this.gdmStatus && this.gdmStatus.availableIcons) || [];
    const availableLogos = (this.gdmStatus && this.gdmStatus.availableLogos) || [];
    const current = (this.gdmStatus && this.gdmStatus.settings) || {};

    const shellThemes = this.installedItems.filter(i => (i.category === 'shell-theme' || i.category === 'gtk-theme') && i.gdm_eligible !== false);
    const iconsAndCursors = this.installedItems.filter(i => (i.category === 'icon' || i.category === 'icon-theme' || i.category === 'cursor' || i.category === 'cursors'));

    // Selected wallpaper label & value
    const curBg = current.backgroundImage || '';
    const curBgBase = curBg ? curBg.split('/').pop() : 'Default GNOME Background';

    // Selected scaling label & value
    const curScale = current.backgroundSize || 'cover';
    const curScaleLabel = curScale.charAt(0).toUpperCase() + curScale.slice(1);

    // Selected logo label & value
    const curLogo = current.logo || '';
    const curLogoBase = curLogo ? curLogo.split('/').pop() : '(Default System Logo)';

    this.container.innerHTML = `
      <div class="lockscreen-view-wrapper">
        <!-- Top Status Header Card -->
        <div class="lockscreen-header-card">
          <div class="lockscreen-header-left">
            <div class="lockscreen-status-row">
              <span class="badge-tag ${isGseInstalled ? 'badge-installed' : 'badge-script'}">
                ${isGseInstalled ? 'Installed &amp; Active' : 'Setup Needed'}
              </span>
              <span class="lockscreen-version-text">GNOME Shell ${status.gnomeVersion || '46'}</span>
            </div>
            <h3 class="lockscreen-header-title">GDM Customization Studio</h3>
            <p class="lockscreen-header-desc">
              ${isGseInstalled 
                ? 'GSE-GDM integration is active. Background blur, custom wallpaper, welcome message, and lock screen settings are fully unlocked.' 
                : 'Install the GSE-GDM extension in 1 click below to unlock background blur, custom wallpaper, and login screen customization.'}
            </p>
          </div>
          <div class="lockscreen-header-actions">
            ${!isGseInstalled ? `
              <button class="btn btn-primary" id="btn-clone-install-gdm">
                Install
              </button>
              <button class="btn btn-secondary" id="btn-recheck-gdm">
                Re-check
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-enable-gdm-custom">
                Enable
              </button>
              <button class="btn btn-secondary" id="btn-uninstall-gse-gdm" style="color: #ef4444;" title="Uninstall GSE-GDM extension">
                Uninstall
              </button>
            `}
          </div>
        </div>

        <!-- Customization Controls Wrapper (Disabled with overlay when not installed) -->
        <div class="lockscreen-controls-group ${!isGseInstalled ? 'lockscreen-disabled-area' : ''}">
          <!-- Section 1: Background & Blur Visual Studio -->
          <div class="settings-section">
            <h3 class="settings-section-title">Background &amp; Blur Effects</h3>
            <p class="settings-section-desc">
              Select login screen wallpaper, adjust blur radius and brightness, and configure image scaling.
            </p>

            <div class="lockscreen-card" style="z-index: 30;">
              <!-- Custom Wallpaper Dropdown -->
              <div class="lockscreen-row">
                <div class="lockscreen-row-info">
                  <strong>Background Image</strong>
                  <span>Select wallpaper from <code>/usr/share/backgrounds</code></span>
                </div>
                <div class="lockscreen-row-control">
                  <div class="custom-select lockscreen-custom-select" id="gdm-bg-select" data-value="${curBg}">
                    <button type="button" class="custom-select-trigger">
                      <span class="custom-select-label">${curBgBase}</span>
                      <svg class="custom-select-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="custom-select-menu">
                      <div class="custom-select-option ${!curBg ? 'selected' : ''}" data-value="" data-label="Default GNOME Background">
                        Default GNOME Background
                      </div>
                      ${availableBackgrounds.map(bg => {
                        const base = bg.split('/').pop();
                        const isSel = curBg === bg || curBg.endsWith(base);
                        return `
                          <div class="custom-select-option ${isSel ? 'selected' : ''}" data-value="${bg}" data-label="${base}">
                            ${base}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Blur Radius -->
              <div class="lockscreen-row">
                <div class="lockscreen-row-info">
                  <strong>Blur Radius</strong>
                  <span>Intensity of login screen blur (0px = disabled)</span>
                </div>
                <div class="lockscreen-row-control">
                  <div class="lockscreen-slider-control">
                    <input type="range" id="gdm-blur-radius" min="0" max="100" value="${current.blurRadius || 0}" ${!isGseInstalled ? 'disabled' : ''}>
                    <span id="lbl-blur-radius" class="slider-badge">${current.blurRadius || 0}px</span>
                  </div>
                </div>
              </div>

              <!-- Blur Brightness -->
              <div class="lockscreen-row">
                <div class="lockscreen-row-info">
                  <strong>Blur Brightness</strong>
                  <span>Brightness level when blur is active</span>
                </div>
                <div class="lockscreen-row-control">
                  <div class="lockscreen-slider-control">
                    <input type="range" id="gdm-blur-brightness" min="0" max="1" step="0.05" value="${current.blurBrightness || 0.65}" ${!isGseInstalled ? 'disabled' : ''}>
                    <span id="lbl-blur-brightness" class="slider-badge">${current.blurBrightness || 0.65}</span>
                  </div>
                </div>
              </div>

              <!-- Custom Scaling Dropdown -->
              <div class="lockscreen-row">
                <div class="lockscreen-row-info">
                  <strong>Scaling Mode</strong>
                  <span>Image fitting format on login screen</span>
                </div>
                <div class="lockscreen-row-control">
                  <div class="custom-select lockscreen-custom-select" id="gdm-bg-size" data-value="${curScale}">
                    <button type="button" class="custom-select-trigger">
                      <span class="custom-select-label">${curScaleLabel}</span>
                      <svg class="custom-select-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="custom-select-menu">
                      <div class="custom-select-option ${curScale === 'cover' ? 'selected' : ''}" data-value="cover" data-label="Cover">Cover</div>
                      <div class="custom-select-option ${curScale === 'contain' ? 'selected' : ''}" data-value="contain" data-label="Contain">Contain</div>
                      <div class="custom-select-option ${curScale === 'auto' ? 'selected' : ''}" data-value="auto" data-label="Auto">Auto</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Welcome Banner & Logo -->
          <div class="settings-section">
            <h3 class="settings-section-title">Welcome Banner Title &amp; Logo</h3>
            <p class="settings-section-desc">
              Display a custom welcome title message and brand logo on the GDM login screen.
            </p>

            <div class="lockscreen-card" style="z-index: 20;">
              <!-- Banner Message Toggle -->
              <div class="lockscreen-row">
                <div class="lockscreen-row-info">
                  <strong>Show Banner Message Title</strong>
                  <span>Enable custom text greeting above login username</span>
                </div>
                <div class="lockscreen-row-control">
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-gdm-banner-enable" ${current.bannerMessageEnable ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <!-- Banner Text Input -->
              <div class="lockscreen-row" id="banner-text-row">
                <div class="lockscreen-row-info">
                  <strong>Banner Title Text</strong>
                  <span>Heading text displayed on login screen</span>
                </div>
                <div class="lockscreen-row-control">
                  <input type="text" id="txt-gdm-banner" class="lockscreen-input" placeholder="e.g. Welcome to Ubuntu" value="${current.bannerMessageText || ''}" ${!isGseInstalled ? 'disabled' : ''}>
                </div>
              </div>

              <!-- Custom Logo Dropdown -->
              <div class="lockscreen-row">
                <div class="lockscreen-row-info">
                  <strong>Login Screen Logo</strong>
                  <span>Bottom logo icon from <code>/usr/share/pixmaps</code></span>
                </div>
                <div class="lockscreen-row-control">
                  <div class="custom-select lockscreen-custom-select" id="gdm-logo-select" data-value="${curLogo}">
                    <button type="button" class="custom-select-trigger">
                      <span class="custom-select-label">${curLogoBase}</span>
                      <svg class="custom-select-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="custom-select-menu">
                      <div class="custom-select-option ${!curLogo ? 'selected' : ''}" data-value="" data-label="(Default System Logo)">
                        (Default System Logo)
                      </div>
                      ${availableLogos.map(logo => {
                        const base = logo.split('/').pop();
                        const isSel = curLogo === logo || curLogo.endsWith(base);
                        return `
                          <div class="custom-select-option ${isSel ? 'selected' : ''}" data-value="${logo}" data-label="${base}">
                            ${base}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Clock, Top Bar & Touchpad Controls -->
          <div class="settings-section">
            <h3 class="settings-section-title">Clock, Status Bar &amp; Touchpad</h3>
            <p class="settings-section-desc">
              Configure clock format, battery indicator, and touchpad behavior on the login screen.
            </p>

            <div class="lockscreen-card" style="z-index: 10;">
              <div class="lockscreen-grid-2col">
                <div class="lockscreen-grid-cell">
                  <span class="lockscreen-cell-label">Show Date in Clock</span>
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-gdm-clock-date" ${current.clockShowDate !== false ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="lockscreen-grid-cell">
                  <span class="lockscreen-cell-label">Show Seconds in Clock</span>
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-gdm-clock-seconds" ${current.clockShowSeconds ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="lockscreen-grid-cell">
                  <span class="lockscreen-cell-label">Show Weekday in Clock</span>
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-gdm-clock-weekday" ${current.clockShowWeekday !== false ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="lockscreen-grid-cell">
                  <span class="lockscreen-cell-label">Show Battery Percentage</span>
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-gdm-battery" ${current.showBatteryPercentage !== false ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="lockscreen-grid-cell">
                  <span class="lockscreen-cell-label">Tap-to-Click on Login</span>
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-gdm-tap-click" ${current.tapToClick !== false ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="lockscreen-grid-cell">
                  <span class="lockscreen-cell-label">Hide Extension Gear Button</span>
                  <label class="toggle-switch">
                    <input type="checkbox" id="chk-hide-gdm-btn" ${current.hideButton ? 'checked' : ''} ${!isGseInstalled ? 'disabled' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <!-- Dedicated Card Action Footer -->
              <div class="lockscreen-card-footer">
                <button class="btn btn-primary" id="btn-save-gdm-all" ${!isGseInstalled ? 'disabled' : ''}>
                  Apply All Lock Screen Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 4: Shell Themes -->
        <div class="settings-section">
          <h3 class="settings-section-title">Lock Screen Shell Themes</h3>
          <p class="settings-section-desc">
            Copy installed shell themes to <code>/usr/share/themes</code> and set for the login screen.
          </p>

          <div class="gdm-items-list">
            ${shellThemes.length === 0 ? `
              <div class="gdm-empty-card">
                No installed shell themes found. Install <strong>Orchis</strong> or <strong>WhiteSur</strong> from the Shell Themes tab first.
              </div>
            ` : shellThemes.map(theme => `
              <div class="gdm-item-row">
                <div>
                  <strong>${theme.name}</strong>
                  <span>
                    ${theme.installed_folders && theme.installed_folders[0] ? theme.installed_folders[0] : theme.name}
                  </span>
                </div>
                <button class="btn btn-primary btn-apply-gdm-theme" data-id="${theme.id}" data-name="${theme.installed_folders && theme.installed_folders[0] ? theme.installed_folders[0] : theme.name}" data-category="shell-theme">
                  Apply to Lock Screen
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 5: Icons & Cursors -->
        <div class="settings-section">
          <h3 class="settings-section-title">System Icons &amp; Cursors for GDM</h3>
          <p class="settings-section-desc">
            Copies custom icon and cursor packs into <code>/usr/share/icons</code> for system-wide and login screen display.
          </p>

          <div class="gdm-items-list">
            ${iconsAndCursors.length === 0 ? `
              <div class="gdm-empty-card">
                No installed icons or cursors found. Install icons from the Icons/Cursors tabs first.
              </div>
            ` : iconsAndCursors.map(item => `
              <div class="gdm-item-row">
                <div>
                  <strong>${item.name}</strong>
                  <span>
                    ${item.category === 'cursor' ? 'Cursor Pack' : 'Icon Theme'}
                  </span>
                </div>
                <button class="btn btn-secondary btn-copy-gdm-icon" data-id="${item.id}" data-category="icon">
                  Copy to System
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 6: Safety & Reset Recovery -->
        <div class="settings-section">
          <h3 class="settings-section-title">Safety &amp; Recovery</h3>
          <div class="lockscreen-reset-card">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Reset Lock Screen to Default</strong>
              </div>
              <p class="settings-option-desc">
                Reverts all GDM login screen dconf settings (wallpaper, blur, clock, banner) back to standard Ubuntu defaults.
              </p>
            </div>
            <div class="settings-card-right">
              <button class="btn btn-secondary" id="btn-reset-gdm-default" style="padding: 7px 16px; font-size: 11.5px;">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // 0. Wire Custom Dropdowns
    const customSelects = this.container.querySelectorAll('.lockscreen-custom-select');
    customSelects.forEach(selectEl => {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const labelSpan = selectEl.querySelector('.custom-select-label');

      if (trigger) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = selectEl.classList.contains('is-open');
          customSelects.forEach(s => {
            s.classList.remove('is-open');
            const parentRow = s.closest('.lockscreen-form-row');
            if (parentRow) parentRow.style.zIndex = '';
          });
          if (!isOpen) {
            selectEl.classList.add('is-open');
            const parentRow = selectEl.closest('.lockscreen-form-row');
            if (parentRow) parentRow.style.zIndex = '1000';
          }
        });
      }

      selectEl.querySelectorAll('.custom-select-option').forEach(optEl => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value') || '';
          const lbl = optEl.getAttribute('data-label') || '';
          selectEl.setAttribute('data-value', val);
          if (labelSpan) labelSpan.textContent = lbl;

          selectEl.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
          optEl.classList.add('selected');
          selectEl.classList.remove('is-open');
          const parentRow = selectEl.closest('.lockscreen-form-row');
          if (parentRow) parentRow.style.zIndex = '';
        });
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      if (this.container) {
        this.container.querySelectorAll('.lockscreen-custom-select').forEach(s => {
          s.classList.remove('is-open');
          const parentRow = s.closest('.lockscreen-form-row');
          if (parentRow) parentRow.style.zIndex = '';
        });
      }
    });

    // 1. Install GSE-GDM Extension
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
            showToast('GSE-GDM Extension installed successfully! Controls unlocked.', 'success');
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
            cloneInstallBtn.textContent = 'Install';
          }
        }
      });
    }

    // 2. Uninstall GSE-GDM
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

    // 4. Enable GDM Customization
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
          enableBtn.textContent = 'Enable';
        }
      });
    }

    // 5. Sliders live feedback
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

    // 6. Apply All Settings
    const saveAllBtn = this.container.querySelector('#btn-save-gdm-all');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', async () => {
        saveAllBtn.disabled = true;
        saveAllBtn.textContent = 'Applying...';
        showToast('Applying all Lock Screen settings to GDM dconf (requires admin password)...', 'info');

        const bgSelect = this.container.querySelector('#gdm-bg-select');
        const bgSizeSelect = this.container.querySelector('#gdm-bg-size');
        const chkBannerEnable = this.container.querySelector('#chk-gdm-banner-enable');
        const txtBanner = this.container.querySelector('#txt-gdm-banner');
        const logoSelect = this.container.querySelector('#gdm-logo-select');
        const chkClockDate = this.container.querySelector('#chk-gdm-clock-date');
        const chkClockSec = this.container.querySelector('#chk-gdm-clock-seconds');
        const chkClockWk = this.container.querySelector('#chk-gdm-clock-weekday');
        const chkBattery = this.container.querySelector('#chk-gdm-battery');
        const chkTapClick = this.container.querySelector('#chk-gdm-tap-click');
        const chkHideBtn = this.container.querySelector('#chk-hide-gdm-btn');

        const payload = {
          backgroundImage: bgSelect ? bgSelect.getAttribute('data-value') : '',
          backgroundSize: bgSizeSelect ? bgSizeSelect.getAttribute('data-value') : 'cover',
          blurRadius: blurRadiusInput ? parseInt(blurRadiusInput.value, 10) : 0,
          blurBrightness: blurBrightnessInput ? parseFloat(blurBrightnessInput.value) : 0.65,
          bannerMessageEnable: chkBannerEnable ? chkBannerEnable.checked : false,
          bannerMessageText: txtBanner ? txtBanner.value.trim() : '',
          logo: logoSelect ? logoSelect.getAttribute('data-value') : '',
          clockShowDate: chkClockDate ? chkClockDate.checked : true,
          clockShowSeconds: chkClockSec ? chkClockSec.checked : false,
          clockShowWeekday: chkClockWk ? chkClockWk.checked : true,
          showBatteryPercentage: chkBattery ? chkBattery.checked : true,
          tapToClick: chkTapClick ? chkTapClick.checked : true,
          hideButton: chkHideBtn ? chkHideBtn.checked : false
        };

        try {
          const res = await window.electronAPI.gdm.updateConfig(payload);
          if (res && res.success) {
            showToast('All Lock Screen settings applied successfully to GDM!', 'success');
            await this.loadData();
            this.renderUI();
          } else if (res && res.cancelled) {
            showToast('Administrator authentication was cancelled.', 'info');
          } else {
            showToast(`Update error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          if (saveAllBtn) {
            saveAllBtn.disabled = false;
            saveAllBtn.textContent = 'Apply All Lock Screen Settings';
          }
        }
      });
    }

    // 7. Apply Shell Theme to Lock Screen
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
            await this.loadData();
            this.renderUI();
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

    // 8. Copy Icon Theme to System
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
            await this.loadData();
            this.renderUI();
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

    // 9. Reset GDM Settings
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
            await this.loadData();
            this.renderUI();
          } else if (res && res.cancelled) {
            showToast('Authentication cancelled.', 'info');
          } else {
            showToast(`Reset error: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'warning');
        } finally {
          resetGdmBtn.disabled = false;
          resetGdmBtn.textContent = 'Reset';
        }
      });
    }
  }
};

window.LockscreenView = LockscreenView;
