// renderer/components/variant-picker.js
// High-end Modal Dialogs for Single Theme Variants & Composite Look Presets

const VariantPicker = {
  activeModal: null,

  close() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  },

  /**
   * Single-theme variant selection modal (Orchis, WhiteSur, Bibata, Tela, etc.)
   */
  showVariantPicker(item, onConfirm) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'variant-picker-modal';

    const variantKeys = item.variants ? Object.keys(item.variants) : [];

    const KEY_LABELS = {
      color: 'Color Accent',
      mode: 'Color Scheme Mode',
      opacity: 'Window Opacity',
      alt: 'Window Controls Style',
      scheme: 'Theme Color Palette',
      nautilus: 'Nautilus File Manager Style',
      size: 'Window Density',
      icon: 'Top Panel Logo Icon',
      style: 'Cursor Design Style',
      background: 'Desktop Wallpaper',
      tweaks: 'Theme Tweaks'
    };

    const COLOR_HEX_MAP = {
      default: '#3b82f6',
      purple: '#a855f7',
      nord: '#88c0d0',
      teal: '#14b8a6',
      pink: '#ec4899',
      red: '#ef4444',
      orange: '#f97316',
      yellow: '#eab308',
      green: '#22c55e',
      grey: '#71717a',
      dracula: '#bd93f9',
      standard: '#3b82f6',
      black: '#18181b',
      blue: '#2563eb',
      ubuntu: '#e95420',
      manjaro: '#35bf5c',
      brown: '#78350f',
      ice: '#f8fafc',
      classic: '#18181b',
      amber: '#f59e0b',
      light: '#ffffff',
      dark: '#18181b'
    };

    const TWEAK_INFO_MAP = {
      macos: { label: 'macOS Controls', desc: 'Changes window buttons to macOS circular traffic lights style.' },
      black: { label: 'Deep Black (OLED)', desc: 'Uses pure #000000 true black background (ideal for OLED screens).' },
      solid: { label: 'Solid Panel', desc: 'Removes translucency and makes the top panel solid opaque.' },
      primary: { label: 'Primary Accent', desc: 'Highlights active window controls and switches with selected accent color.' },
      nord: { label: 'Nord Palette', desc: 'Applies Arctic Nord cold blue and pastel grey aesthetic.' },
      dracula: { label: 'Dracula Palette', desc: 'Applies gothic purple and neon vibrant dark Dracula color scheme.' },
      submenu: { label: 'Submenu Icons', desc: 'Adds icons next to context menus and dropdown menu items.' },
      compact: { label: 'Compact Spacing', desc: 'Reduces window margins and title bar height to save screen space.' },
      dock: { label: 'Floating Dock Fix', desc: 'Optimizes margins and border radius for floating dock panels.' }
    };

    const formatLabel = (val, key) => {
      const displayVal = (val || '').toLowerCase();
      const isIconTheme = item.category === 'icon' || item.category === 'icon-theme';
      if (displayVal === 'ubuntu') return isIconTheme ? 'Ubuntu (Orange)' : 'Ubuntu Circle';
      if (displayVal === 'manjaro') return isIconTheme ? 'Manjaro (Teal)' : 'Manjaro';
      if (displayVal === 'dracula') return 'Dracula (Purple)';
      if (displayVal === 'nord') return 'Nord (Ice)';
      if (displayVal === 'default') return isIconTheme ? 'Standard (Blue)' : 'Default (Standard)';
      if (displayVal === 'compact') return 'Compact';
      if (displayVal === 'dark') return 'Dark Mode';
      if (displayVal === 'light') return 'Light Mode';
      if (displayVal === 'solid') return 'Solid (Opaque)';
      if (displayVal === 'modern') return 'Modern (Rounded)';
      if (displayVal === 'original') return 'Original (Sharp)';
      if (displayVal === 'ice') return 'Ice (White)';
      if (displayVal === 'classic') return 'Classic (Black)';
      if (displayVal === 'amber') return 'Amber (Gold)';
      if (displayVal === 'apple') return 'Apple Logo';
      if (displayVal === 'simple') return 'Simple Apple';
      if (displayVal === 'gnome') return 'GNOME Footprint';
      if (displayVal === 'arch') return 'Arch Linux';
      if (displayVal === 'fedora') return 'Fedora';
      if (displayVal === 'debian') return 'Debian';
      if (displayVal === 'all') return 'All Options (-a)';
      return displayVal.charAt(0).toUpperCase() + displayVal.slice(1);
    };

    let standardFormGroupsHtml = '';
    let tweaksHtml = '';

    variantKeys.forEach(key => {
      const options = item.variants[key];
      if (!Array.isArray(options) || options.length === 0) return;
      const label = KEY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);

      if (key === 'tweaks') {
        // Multi-select Tweaks Grid
        const tweaksList = options.map(opt => {
          const info = TWEAK_INFO_MAP[opt.toLowerCase()] || { label: formatLabel(opt, key), desc: 'Optional tweak' };
          return `
            <label class="tweak-checkbox-item flex items-center gap-2 p-2.5 border border-zinc-200 rounded-md bg-white hover:bg-zinc-50 cursor-pointer transition-all select-none">
              <input type="checkbox" class="tweak-checkbox accent-brand w-4 h-4 cursor-pointer" value="${opt}" />
              <div class="flex-1 min-w-0">
                <span class="text-xs font-semibold text-zinc-800 block truncate">${info.label}</span>
                <span class="text-[10.5px] text-zinc-400 block truncate">${info.desc}</span>
              </div>
            </label>
          `;
        }).join('');

        tweaksHtml = `
          <div class="form-group col-span-full mt-2">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-zinc-800">Theme Tweaks <small class="text-[10px] text-zinc-400 font-normal">(Optional multi-select)</small></span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              ${tweaksList}
            </div>
          </div>
        `;
        return;
      }

      // Standard Custom Select
      const defaultOpt = options[0];
      const defaultLabel = formatLabel(defaultOpt, key);
      const defaultDot = COLOR_HEX_MAP[defaultOpt.toLowerCase()]
        ? `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${COLOR_HEX_MAP[defaultOpt.toLowerCase()]}; border:1px solid rgba(0,0,0,0.15); margin-right:6px; flex-shrink:0;"></span>`
        : '';

      const optionsHtml = options.map((opt, idx) => {
        const itemLabel = formatLabel(opt, key);
        const colorDot = COLOR_HEX_MAP[opt.toLowerCase()]
          ? `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${COLOR_HEX_MAP[opt.toLowerCase()]}; border:1px solid rgba(0,0,0,0.15); margin-right:6px; flex-shrink:0;"></span>`
          : '';
        return `
          <div class="custom-select-option ${idx === 0 ? 'selected' : ''}" data-value="${opt}" data-label="${itemLabel}">
            <div style="display:flex; align-items:center;">
              ${colorDot}
              <span>${itemLabel}</span>
            </div>
            ${idx === 0 ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
        `;
      }).join('');

      standardFormGroupsHtml += `
        <div class="form-group">
          <label class="form-label">${label}</label>
          <div class="custom-select variant-input-field" data-variant-key="${key}" data-value="${defaultOpt}">
            <button type="button" class="custom-select-trigger">
              <div style="display:flex; align-items:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${defaultDot}
                <span class="custom-select-label">${defaultLabel}</span>
              </div>
              <svg class="custom-select-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="custom-select-menu">
              ${optionsHtml}
            </div>
          </div>
        </div>
      `;
    });

    overlay.innerHTML = `
      <div class="modal-dialog animate-modal-enter">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${item.name} Options</h3>
            <p class="modal-subtitle">Choose colors, appearance, and tweaks for installation</p>
          </div>
          <button class="modal-close-btn" id="variant-close-btn" title="Close">×</button>
        </div>

        <div class="modal-body">
          <div class="grid grid-cols-2 gap-3">
            ${standardFormGroupsHtml}
          </div>

          ${tweaksHtml}

          <div class="p-3 bg-zinc-50 border border-zinc-200 rounded-md flex items-center justify-between text-xs text-zinc-600 mt-1">
            <span>Required Dependencies:</span>
            <strong class="text-zinc-900 font-mono">${(item.dependencies && item.dependencies.length > 0) ? item.dependencies.join(', ') : 'None (Ready)'}</strong>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="variant-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="variant-confirm-btn">Install Theme</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Handlers
    const close = () => this.close();
    overlay.querySelector('#variant-close-btn').addEventListener('click', close);
    overlay.querySelector('#variant-cancel-btn').addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Custom select event wiring
    overlay.querySelectorAll('.custom-select').forEach((selectEl) => {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const labelSpan = selectEl.querySelector('.custom-select-label');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = selectEl.classList.contains('is-open');
        overlay.querySelectorAll('.custom-select').forEach(s => {
          s.classList.remove('is-open');
          s.closest('.form-group')?.classList.remove('has-open-select');
        });
        if (!isOpen) {
          selectEl.classList.add('is-open');
          selectEl.closest('.form-group')?.classList.add('has-open-select');
        }
      });

      selectEl.querySelectorAll('.custom-select-option').forEach((optEl) => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value');
          const label = optEl.getAttribute('data-label');
          selectEl.setAttribute('data-value', val);
          if (labelSpan) labelSpan.textContent = label;

          selectEl.querySelectorAll('.custom-select-option').forEach(o => {
            o.classList.remove('selected');
            const check = o.querySelector('svg');
            if (check) check.remove();
          });
          optEl.classList.add('selected');
          optEl.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>');

          selectEl.classList.remove('is-open');
          selectEl.closest('.form-group')?.classList.remove('has-open-select');
        });
      });
    });

    // Close select on outside click
    document.addEventListener('click', () => {
      overlay.querySelectorAll('.custom-select').forEach(s => {
        s.classList.remove('is-open');
        s.closest('.form-group')?.classList.remove('has-open-select');
      });
    });

    // Confirm button
    overlay.querySelector('#variant-confirm-btn').addEventListener('click', () => {
      const selectedVariant = {};
      overlay.querySelectorAll('.custom-select.variant-input-field').forEach((selectEl) => {
        const key = selectEl.getAttribute('data-variant-key');
        const val = selectEl.getAttribute('data-value');
        if (key && val) selectedVariant[key] = val;
      });

      const checkedTweaks = [];
      overlay.querySelectorAll('.tweak-checkbox:checked').forEach(chk => {
        checkedTweaks.push(chk.value);
      });
      if (checkedTweaks.length > 0) {
        selectedVariant.tweaks = checkedTweaks.join(' ');
      }

      this.close();
      if (onConfirm) onConfirm(selectedVariant);
    });
  },

  /**
   * Composite Look / Preset Customizer Modal (Orchis + Tela + Bibata)
   */
  showLookVariantPicker(item, onConfirm) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'look-variant-picker-modal';

    const COLOR_HEX_MAP = {
      default: '#3b82f6',
      purple: '#a855f7',
      nord: '#88c0d0',
      teal: '#14b8a6',
      pink: '#ec4899',
      red: '#ef4444',
      orange: '#f97316',
      yellow: '#eab308',
      green: '#22c55e',
      grey: '#71717a',
      dracula: '#bd93f9',
      standard: '#3b82f6',
      black: '#18181b',
      blue: '#2563eb',
      ubuntu: '#e95420',
      manjaro: '#35bf5c',
      brown: '#78350f',
      ice: '#f8fafc',
      classic: '#18181b',
      amber: '#f59e0b'
    };

    const renderCustomSelect = (fieldId, defaultVal, options) => {
      const optionsHtml = options.map((opt, idx) => {
        const isSelected = opt.value === defaultVal;
        const colorDot = COLOR_HEX_MAP[opt.value] 
          ? `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${COLOR_HEX_MAP[opt.value]}; border:1px solid rgba(0,0,0,0.15); margin-right:6px; flex-shrink:0;"></span>` 
          : '';
        return `
          <div class="custom-select-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}" data-label="${opt.label}">
            <div style="display:flex; align-items:center;">
              ${colorDot}
              <span>${opt.label}</span>
            </div>
            ${isSelected ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
        `;
      }).join('');

      const defaultObj = options.find(o => o.value === defaultVal) || options[0];
      const defaultDot = COLOR_HEX_MAP[defaultObj.value] 
        ? `<span style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${COLOR_HEX_MAP[defaultObj.value]}; border:1px solid rgba(0,0,0,0.15); margin-right:6px; flex-shrink:0;"></span>` 
        : '';

      return `
        <div class="custom-select look-custom-select" id="${fieldId}" data-value="${defaultObj.value}">
          <button type="button" class="custom-select-trigger">
            <div style="display:flex; align-items:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${defaultDot}
              <span class="custom-select-label">${defaultObj.label}</span>
            </div>
            <svg class="custom-select-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div class="custom-select-menu">
            ${optionsHtml}
          </div>
        </div>
      `;
    };

    const orchisColorOptions = [
      { value: 'default', label: 'Default (Blue)' },
      { value: 'purple', label: 'Purple' },
      { value: 'nord', label: 'Nord Ice' },
      { value: 'teal', label: 'Teal Green' },
      { value: 'pink', label: 'Pink' },
      { value: 'red', label: 'Red' },
      { value: 'orange', label: 'Orange' },
      { value: 'yellow', label: 'Yellow' },
      { value: 'green', label: 'Green' },
      { value: 'grey', label: 'Grey' },
      { value: 'all', label: 'All Colors (-a)' }
    ];

    const orchisModeOptions = [
      { value: 'dark', label: 'Dark Mode' },
      { value: 'light', label: 'Light Mode' },
      { value: 'standard', label: 'Standard' }
    ];

    const orchisSizeOptions = [
      { value: 'compact', label: 'Compact' },
      { value: 'standard', label: 'Standard' }
    ];

    const orchisIconOptions = [
      { value: 'default', label: 'Default (Standard)' },
      { value: 'ubuntu', label: 'Ubuntu Circle' },
      { value: 'gnome', label: 'GNOME Footprint' },
      { value: 'apple', label: 'Apple Logo' },
      { value: 'arch', label: 'Arch Linux' },
      { value: 'fedora', label: 'Fedora' },
      { value: 'debian', label: 'Debian' },
      { value: 'manjaro', label: 'Manjaro' }
    ];

    const telaColorOptions = [
      { value: 'dracula', label: 'Dracula (Purple)' },
      { value: 'nord', label: 'Nord (Ice)' },
      { value: 'standard', label: 'Standard (Blue)' },
      { value: 'black', label: 'Black' },
      { value: 'blue', label: 'Blue' },
      { value: 'green', label: 'Green' },
      { value: 'grey', label: 'Grey' },
      { value: 'orange', label: 'Orange' },
      { value: 'pink', label: 'Pink' },
      { value: 'purple', label: 'Purple' },
      { value: 'red', label: 'Red' },
      { value: 'ubuntu', label: 'Ubuntu (Orange)' },
      { value: 'manjaro', label: 'Manjaro (Teal)' },
      { value: 'yellow', label: 'Yellow' },
      { value: 'brown', label: 'Brown' },
      { value: 'all', label: 'All 15 Folders (-a)' }
    ];

    const bibataStyleOptions = [
      { value: 'modern', label: 'Modern (Rounded)' },
      { value: 'original', label: 'Original (Sharp)' }
    ];

    const bibataColorOptions = [
      { value: 'ice', label: 'Ice (White)' },
      { value: 'classic', label: 'Classic (Black)' },
      { value: 'amber', label: 'Amber (Gold)' }
    ];

    overlay.innerHTML = `
      <div class="modal-dialog animate-modal-enter">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${item.name}</h3>
            <p class="modal-subtitle">Choose components and styling variants before applying preset</p>
          </div>
          <button class="modal-close-btn" id="look-variant-close" title="Close">×</button>
        </div>

        <div class="modal-body">
          <!-- Section 1: Orchis GTK & Shell -->
          <div class="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-sm flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="p-1 rounded bg-brand/10 text-brand">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M9 21V9"></path>
                </svg>
              </span>
              <strong class="text-xs font-bold text-zinc-900">1. Orchis Theme (GTK &amp; Shell)</strong>
            </div>

            <div class="grid grid-cols-3 gap-2.5">
              <div class="form-group">
                <label class="form-label">Color Accent</label>
                ${renderCustomSelect('look-orchis-color', 'default', orchisColorOptions)}
              </div>

              <div class="form-group">
                <label class="form-label">Mode</label>
                ${renderCustomSelect('look-orchis-mode', 'dark', orchisModeOptions)}
              </div>

              <div class="form-group">
                <label class="form-label">Size</label>
                ${renderCustomSelect('look-orchis-size', 'compact', orchisSizeOptions)}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Top Panel Logo Icon</label>
              ${renderCustomSelect('look-orchis-icon', 'default', orchisIconOptions)}
            </div>

            <div class="form-group">
              <label class="form-label">Theme Tweaks <small class="text-[10px] text-zinc-400 font-normal">(Multi-select)</small></label>
              <div class="tweaks-grid-container">
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="macos" />
                  <span class="tweak-checkbox-label">macOS Controls</span>
                  <span class="tweak-info-badge" title="Changes window buttons to macOS circular traffic lights">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="black" />
                  <span class="tweak-checkbox-label">Deep Black (OLED)</span>
                  <span class="tweak-info-badge" title="Uses pure #000000 true black background">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="solid" />
                  <span class="tweak-checkbox-label">Solid Panel</span>
                  <span class="tweak-info-badge" title="Removes translucency and makes top panel solid opaque">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="primary" />
                  <span class="tweak-checkbox-label">Primary Accent</span>
                  <span class="tweak-info-badge" title="Highlights active controls with accent color">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="nord" />
                  <span class="tweak-checkbox-label">Nord Palette</span>
                  <span class="tweak-info-badge" title="Applies Arctic Nord cold blue palette">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="dracula" />
                  <span class="tweak-checkbox-label">Dracula Palette</span>
                  <span class="tweak-info-badge" title="Applies vibrant dark Dracula color scheme">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="submenu" />
                  <span class="tweak-checkbox-label">Submenu Icons</span>
                  <span class="tweak-info-badge" title="Adds icons next to context menus">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="compact" />
                  <span class="tweak-checkbox-label">Compact Spacing</span>
                  <span class="tweak-info-badge" title="Reduces window margins to save screen space">ⓘ</span>
                </label>
                <label class="tweak-checkbox-item col-span-2">
                  <input type="checkbox" class="look-tweak-checkbox" value="dock" />
                  <span class="tweak-checkbox-label">Floating Dock Fix</span>
                  <span class="tweak-info-badge" title="Optimizes margins for floating dock panels">ⓘ</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: Tela Icon Theme -->
          <div class="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-sm flex flex-col gap-2.5">
            <div class="flex items-center gap-2">
              <span class="p-1 rounded bg-blue-500/10 text-blue-600">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                  <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                </svg>
              </span>
              <strong class="text-xs font-bold text-zinc-900">2. Tela Icon Theme</strong>
            </div>

            <div class="form-group">
              <label class="form-label">Folder Color Scheme</label>
              ${renderCustomSelect('look-tela-color', 'dracula', telaColorOptions)}
            </div>
          </div>

          <!-- Section 3: Bibata Cursor -->
          <div class="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-sm flex flex-col gap-2.5">
            <div class="flex items-center gap-2">
              <span class="p-1 rounded bg-emerald-500/10 text-emerald-600">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                  <path d="m13 13 6 6"></path>
                </svg>
              </span>
              <strong class="text-xs font-bold text-zinc-900">3. Bibata Cursor</strong>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div class="form-group">
                <label class="form-label">Style</label>
                ${renderCustomSelect('look-bibata-style', 'modern', bibataStyleOptions)}
              </div>

              <div class="form-group">
                <label class="form-label">Color</label>
                ${renderCustomSelect('look-bibata-color', 'ice', bibataColorOptions)}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="look-variant-cancel">Cancel</button>
          <button class="btn btn-primary" id="look-variant-confirm">Install &amp; Apply Full Look</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.activeModal = overlay;

    const close = () => this.close();
    overlay.querySelector('#look-variant-close').addEventListener('click', close);
    overlay.querySelector('#look-variant-cancel').addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Custom select dropdowns wiring
    overlay.querySelectorAll('.look-custom-select').forEach((selectEl) => {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const labelSpan = selectEl.querySelector('.custom-select-label');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = selectEl.classList.contains('is-open');
        overlay.querySelectorAll('.look-custom-select').forEach(s => {
          s.classList.remove('is-open');
          s.closest('.form-group')?.classList.remove('has-open-select');
        });
        if (!isOpen) {
          selectEl.classList.add('is-open');
          selectEl.closest('.form-group')?.classList.add('has-open-select');
        }
      });

      selectEl.querySelectorAll('.custom-select-option').forEach((optEl) => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value');
          const label = optEl.getAttribute('data-label');
          selectEl.setAttribute('data-value', val);
          if (labelSpan) labelSpan.textContent = label;

          selectEl.querySelectorAll('.custom-select-option').forEach(o => {
            o.classList.remove('selected');
            const check = o.querySelector('svg');
            if (check) check.remove();
          });
          optEl.classList.add('selected');
          optEl.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>');

          selectEl.classList.remove('is-open');
          selectEl.closest('.form-group')?.classList.remove('has-open-select');
        });
      });
    });

    document.addEventListener('click', () => {
      overlay.querySelectorAll('.look-custom-select').forEach(s => {
        s.classList.remove('is-open');
        s.closest('.form-group')?.classList.remove('has-open-select');
      });
    });

    // Confirm button
    overlay.querySelector('#look-variant-confirm').addEventListener('click', () => {
      const getVal = id => overlay.querySelector(`#${id}`)?.getAttribute('data-value');

      const orchisColor = getVal('look-orchis-color') || 'default';
      const orchisMode = getVal('look-orchis-mode') || 'dark';
      const orchisSize = getVal('look-orchis-size') || 'compact';
      const orchisIcon = getVal('look-orchis-icon') || 'default';
      const telaColor = getVal('look-tela-color') || 'dracula';
      const bibataStyle = getVal('look-bibata-style') || 'modern';
      const bibataColor = getVal('look-bibata-color') || 'ice';

      const checkedTweaks = [];
      overlay.querySelectorAll('.look-tweak-checkbox:checked').forEach(chk => {
        checkedTweaks.push(chk.value);
      });
      const tweaksArg = checkedTweaks.length > 0 ? checkedTweaks.join(' ') : '';

      const customizedItems = (item.items || []).map(presetItem => {
        const copy = JSON.parse(JSON.stringify(presetItem));
        if (copy.id === 'orchis' || copy.id === 'orchis-shell') {
          copy.variant = {
            color: orchisColor,
            mode: orchisMode,
            size: orchisSize,
            icon: orchisIcon,
            tweaks: tweaksArg
          };
        } else if (copy.id === 'tela-icon-theme') {
          copy.variant = {
            color: telaColor
          };
        } else if (copy.id === 'bibata-modern-ice') {
          copy.variant = {
            style: bibataStyle,
            color: bibataColor
          };
        }
        return copy;
      });

      this.close();
      if (onConfirm) onConfirm(customizedItems);
    });
  }
};

window.VariantPicker = VariantPicker;
