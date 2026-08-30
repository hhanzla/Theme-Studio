// Settings View Component for Theme Studio
window.SettingsView = {
  container: null,

  async render(containerEl) {
    this.container = containerEl;
    await this.loadSettings();
  },

  async loadSettings() {
    let settings = {};
    let flatpakInstalled = false;

    try {
      const res = await window.electronAPI.settings.get();
      if (res && res.success) {
        settings = res.settings || {};
        flatpakInstalled = !!res.flatpakInstalled;
      }
    } catch (err) {
      console.error('[SettingsView] Failed to load settings:', err);
    }

    this.renderUI(settings, flatpakInstalled);
  },

  renderUI(settings, flatpakInstalled) {
    if (!this.container) return;

    const isFlatpakSync = !!settings.flatpak_theme_sync;

    this.container.innerHTML = `
      <div class="settings-view-container">
        <!-- Section: Integrations -->
        <div class="settings-section">
          <h3 class="settings-section-title">Integrations & Compatibility</h3>
          <p class="settings-section-desc">Manage system-level hooks and application sandboxing integration.</p>

          <div class="settings-card">
            <div class="settings-card-left">
              <div class="settings-option-title">
                <strong>Flatpak Theme Sync</strong>
                <span class="badge-tag ${flatpakInstalled ? 'badge-installed' : 'badge-script'}">
                  ${flatpakInstalled ? 'Flatpak Detected' : 'Flatpak Not Found'}
                </span>
              </div>
              <p class="settings-option-desc">
                Grants filesystem permissions to Flatpak sandbox (<code>~/.themes</code>, <code>~/.icons</code>, <code>~/.config/gtk-4.0</code>) so sandboxed apps automatically inherit installed themes.
              </p>
            </div>
            <div class="settings-card-right">
              <label class="switch">
                <input type="checkbox" id="toggle-flatpak-sync" ${isFlatpakSync ? 'checked' : ''} ${!flatpakInstalled ? 'disabled' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Section: Storage Paths -->
        <div class="settings-section">
          <h3 class="settings-section-title">System Paths & Storage</h3>
          <p class="settings-section-desc">Standard directory locations used for theme assets and configurations.</p>

          <div class="settings-paths-grid">
            <div class="path-card">
              <span class="path-label">GTK Themes Directory</span>
              <code class="path-value">~/.themes</code>
            </div>
            <div class="path-card">
              <span class="path-label">Icons & Cursors Directory</span>
              <code class="path-value">~/.icons</code>
            </div>
            <div class="path-card">
              <span class="path-label">GTK4 / Libadwaita Config</span>
              <code class="path-value">~/.config/gtk-4.0</code>
            </div>
            <div class="path-card">
              <span class="path-label">Download Cache</span>
              <code class="path-value">~/.cache/themestudio</code>
            </div>
          </div>
        </div>

        <!-- Section: System Maintenance -->
        <div class="settings-section">
          <h3 class="settings-section-title">System Maintenance</h3>
          <p class="settings-section-desc">Quick actions to restore system defaults or clear download cache.</p>

          <div class="settings-card">
            <div class="settings-card-left">
              <strong>Restore Desktop Defaults</strong>
              <p class="settings-option-desc">Resets active GTK theme, icons, and cursors back to default Ubuntu Yaru theme.</p>
            </div>
            <div class="settings-card-right">
              <button class="card-btn btn-secondary" id="btn-settings-reset-defaults">
                Reset Defaults
              </button>
            </div>
          </div>
        </div>

        <!-- Section: About -->
        <div class="settings-section">
          <h3 class="settings-section-title">About Theme Studio</h3>
          <div class="settings-card">
            <div class="settings-card-left">
              <strong>Theme Studio v1.0.0</strong>
              <p class="settings-option-desc">Curated GNOME Theme, Icon, and Cursor Manager for modern Linux.</p>
            </div>
            <div class="settings-card-right">
              <span class="meta-chip">Milestone 1</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire Flatpak Toggle
    const toggleEl = this.container.querySelector('#toggle-flatpak-sync');
    if (toggleEl) {
      toggleEl.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        showToast(enabled ? 'Applying Flatpak filesystem overrides...' : 'Removing Flatpak overrides...', 'info');

        try {
          const res = await window.electronAPI.settings.set({
            key: 'flatpak_theme_sync',
            value: enabled
          });

          if (res && res.success) {
            showToast(enabled ? 'Flatpak theme sync enabled!' : 'Flatpak theme sync disabled', 'success');
          } else {
            e.target.checked = !enabled;
            showToast(`Failed to update Flatpak override: ${res ? res.error : 'Unknown error'}`, 'warning');
          }
        } catch (err) {
          e.target.checked = !enabled;
          showToast(`Error: ${err.message}`, 'warning');
        }
      });
    }

    // Wire Reset Defaults Button inside Settings
    const resetBtn = this.container.querySelector('#btn-settings-reset-defaults');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        window.ConfirmDialog.show({
          title: 'Reset to Ubuntu Default',
          subtitle: 'Restore standard system appearance',
          message: 'This will reset your active GTK theme, icons, and cursor back to default Ubuntu themes (Yaru).',
          confirmText: 'Reset to Default',
          cancelText: 'Cancel',
          onConfirm: async () => {
            showToast('Resetting appearance to defaults...', 'info');
            try {
              const res = await window.electronAPI.system.resetDefault();
              if (res && res.success) {
                showToast('Desktop appearance reset to Ubuntu default (Yaru)', 'success');
              } else {
                showToast(`Reset failed: ${res ? res.error : 'Unknown error'}`, 'warning');
              }
            } catch (err) {
              showToast(`Error resetting: ${err.message}`, 'warning');
            }
          }
        });
      });
    }
  }
};
