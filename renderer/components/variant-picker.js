// Variant Picker Modal Component for Theme Studio with Custom Sleek Dropdown
window.VariantPicker = {
  /**
   * Opens the variant selection dialog for a theme with dynamic variant options (color, mode, size, etc.)
   * @param {object} item - Catalog item
   * @param {function} onSelect - Callback (selectedVariant object)
   */
  open(item, onSelect) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'variant-picker-modal';

    const variantsObj = item.variants || {};
    const variantKeys = Object.keys(variantsObj);

    const isIconTheme = item.category === 'icon-theme';
    const isCursorTheme = item.category === 'cursor-theme';

    const LABEL_MAP = {
      color: isIconTheme ? 'Folder Color Scheme' : 'Color Accent',
      mode: 'Appearance Mode',
      size: isCursorTheme ? 'Cursor Pointer Size' : 'Window Density',
      tweaks: 'Theme Tweaks',
      icon: 'Top Panel Logo Icon',
      style: 'Style Variation',
      opacity: 'Panel Opacity'
    };

    const OPTION_DESCRIPTIONS = {
      color: isIconTheme 
        ? "Select the folder and icon color theme (Standard Blue, Ubuntu Warm Orange, Nord Ice, Dracula, Manjaro, etc.) or 'All Variants' to install all 15 color folders."
        : 'Sets the primary accent color used for buttons, active tabs, selections, and highlights.',
      mode: 'Choose Light mode for bright windows or Dark mode for sleek dark background.',
      size: isCursorTheme
        ? 'Choose cursor pointer pixel scale size.'
        : 'Standard gives comfortable padding; Compact reduces titlebar height for maximum screen space.',
      icon: 'Selects the logo icon displayed on the GNOME Shell top panel menu.',
      style: 'Chooses alternative visual styling variants, border curves, or theme design flavors.',
      opacity: 'Controls the background transparency level for the top panel and dropdown menus.',
      tweaks: 'Optional aesthetic customizations (macOS traffic lights, OLED pure black, solid panel).'
    };

    let formGroupsHtml = '';

    variantKeys.forEach((key) => {
      const options = variantsObj[key] || [];
      if (!Array.isArray(options) || options.length === 0) return;

      const label = LABEL_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1));
      const groupDesc = OPTION_DESCRIPTIONS[key] || `Select your preferred ${label.toLowerCase()} option.`;

      // Multi-Select Checkboxes for Tweaks
      if (key === 'tweaks') {
        const tweakDetails = {
          'macos': {
            title: 'macOS Controls',
            desc: 'Changes window buttons (close, minimize, maximize) to macOS circular traffic lights style.'
          },
          'solid': {
            title: 'Solid Panel',
            desc: 'Removes translucency and makes the top panel and sidebars solid opaque.'
          },
          'black': {
            title: 'Deep Black (OLED)',
            desc: 'Uses pure #000000 true black background for dark mode (great for OLED screens).'
          },
          'primary': {
            title: 'Primary Accent',
            desc: 'Highlights active window controls, buttons, and switches with your selected accent color.'
          },
          'nord': {
            title: 'Nord Palette',
            desc: 'Applies Arctic Nord cold blue and pastel grey aesthetic palette.'
          },
          'dracula': {
            title: 'Dracula Palette',
            desc: 'Applies gothic purple and neon vibrant dark Dracula color scheme.'
          },
          'submenu': {
            title: 'Submenu Icons',
            desc: 'Adds icons next to context menus and dropdown menu items.'
          },
          'compact': {
            title: 'Compact Spacing',
            desc: 'Reduces window margins and title bar height to save screen space.'
          },
          'dock': {
            title: 'Floating Dock Fix',
            desc: 'Optimizes margins and border radius for floating dock panels.'
          }
        };

        const tweakCheckboxesHtml = options.filter(opt => opt !== 'none').map((opt) => {
          const detail = tweakDetails[opt] || {
            title: opt.charAt(0).toUpperCase() + opt.slice(1),
            desc: `Enables ${opt} style tweak for this theme.`
          };

          return `
            <label class="tweak-checkbox-item">
              <input type="checkbox" class="tweak-checkbox-input" value="${opt}" />
              <span class="tweak-checkbox-label">${detail.title}</span>
              <span class="tweak-info-badge" onclick="event.preventDefault();" title="${detail.desc}">
                ⓘ
                <span class="tweak-tooltip">${detail.desc}</span>
              </span>
            </label>
          `;
        }).join('');

        formGroupsHtml += `
          <div class="form-group">
            <div class="form-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
              <span>${label} <small style="color: var(--text-muted); font-weight: normal; font-size: 10.5px; margin-left: 4px;">(Multi-select)</small></span>
              <span class="tweak-info-badge" onclick="event.preventDefault();" title="${groupDesc}">
                ⓘ
                <span class="tweak-tooltip">${groupDesc}</span>
              </span>
            </div>
            <div class="tweaks-grid-container">
              ${tweakCheckboxesHtml}
            </div>
          </div>
        `;
        return;
      }

      // Format custom dropdown options
      const formatLabel = (opt) => {
        let displayVal = String(opt);
        if (displayVal === 'all') return isIconTheme ? 'All Color Variants (-a)' : 'All Variants';
        if (displayVal === 'standard') return isIconTheme ? 'Standard (Default Blue)' : 'Standard';
        if (displayVal === 'ubuntu') return isIconTheme ? 'Ubuntu (Warm Orange)' : 'Ubuntu Circle';
        if (displayVal === 'manjaro') return isIconTheme ? 'Manjaro (Teal Green)' : 'Manjaro';
        if (displayVal === 'dracula') return isIconTheme ? 'Dracula (Purple Dark)' : 'Dracula';
        if (displayVal === 'nord') return isIconTheme ? 'Nord (Arctic Ice)' : 'Nord';
        if (displayVal === 'default') return 'Default (Standard)';
        if (displayVal === 'compact') return 'Compact';
        if (displayVal === 'dark') return 'Dark Mode';
        if (displayVal === 'light') return 'Light Mode';
        if (displayVal === 'transparent-sidebar') return 'Transparent Sidebar (Glass)';
        if (displayVal === 'pink') return 'Pink Accent';
        if (displayVal === 'ambar-blue-dark') return 'Ambar Blue (Dark)';
        if (displayVal === 'ambar-blue') return 'Ambar Blue';
        if (displayVal === 'ambar') return 'Ambar (Warm Gold)';
        if (displayVal === 'mars') return 'Mars (Neon Red)';
        if (displayVal === 'modern') return 'Modern (Rounded)';
        if (displayVal === 'original') return 'Original (Sharp)';
        if (displayVal === 'ice') return 'Ice (White)';
        if (displayVal === 'classic') return 'Classic (Black)';
        if (displayVal === 'amber') return 'Amber (Gold)';
        if (displayVal === 'apple') return 'Apple Logo';
        if (displayVal === 'gnome') return 'GNOME Footprint';
        if (displayVal === 'arch') return 'Arch Linux';
        if (displayVal === 'fedora') return 'Fedora';
        if (displayVal === 'debian') return 'Debian';
        return displayVal.charAt(0).toUpperCase() + displayVal.slice(1);
      };

      const defaultOpt = options[0];
      const defaultLabel = formatLabel(defaultOpt);

      const optionsHtml = options.map((opt, idx) => {
        const itemLabel = formatLabel(opt);
        return `
          <div class="custom-select-option ${idx === 0 ? 'selected' : ''}" data-value="${opt}" data-label="${itemLabel}">
            <span>${itemLabel}</span>
            ${idx === 0 ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
          </div>
        `;
      }).join('');

      formGroupsHtml += `
        <div class="form-group">
          <div class="form-label" style="display: flex; align-items: center; justify-content: space-between;">
            <span>${label}</span>
            <span class="tweak-info-badge" onclick="event.preventDefault();" title="${groupDesc}">
              ⓘ
              <span class="tweak-tooltip">${groupDesc}</span>
            </span>
          </div>
          <div class="custom-select variant-input-field" data-variant-key="${key}" data-value="${defaultOpt}">
            <button type="button" class="custom-select-trigger">
              <span class="custom-select-label">${defaultLabel}</span>
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
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Theme Options</h3>
            <p class="modal-subtitle">Choose colors, appearance, and tweaks for ${item.name}</p>
          </div>
          <button class="modal-close-btn" id="variant-close-btn">×</button>
        </div>

        <div class="modal-body">
          ${formGroupsHtml}

          <div class="modal-info-box">
            <span>Dependencies:</span>
            <strong>${(item.dependencies && item.dependencies.length > 0) ? item.dependencies.join(', ') : 'None (Ready)'}</strong>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn btn-secondary" id="variant-cancel-btn">Cancel</button>
          <button class="modal-btn btn-primary" id="variant-confirm-btn">Install Theme</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event handlers
    const close = () => this.close();
    overlay.querySelector('#variant-close-btn').addEventListener('click', close);
    overlay.querySelector('#variant-cancel-btn').addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Wire custom dropdown interactivity
    overlay.querySelectorAll('.custom-select').forEach((selectEl) => {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const labelSpan = selectEl.querySelector('.custom-select-label');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = selectEl.classList.contains('is-open');
        overlay.querySelectorAll('.custom-select').forEach(s => s.classList.remove('is-open'));
        if (!isOpen) {
          selectEl.classList.add('is-open');
        }
      });

      selectEl.querySelectorAll('.custom-select-option').forEach((optEl) => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value');
          const labelText = optEl.getAttribute('data-label');
          selectEl.setAttribute('data-value', val);
          labelSpan.textContent = labelText;

          selectEl.querySelectorAll('.custom-select-option').forEach(o => {
            o.classList.remove('selected');
            const chk = o.querySelector('svg');
            if (chk) chk.remove();
          });
          optEl.classList.add('selected');
          optEl.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>');

          selectEl.classList.remove('is-open');
        });
      });
    });

    // Close any custom select when clicking elsewhere inside the modal
    overlay.querySelector('.modal-dialog')?.addEventListener('click', () => {
      overlay.querySelectorAll('.custom-select').forEach(s => s.classList.remove('is-open'));
    });

    overlay.querySelector('#variant-confirm-btn').addEventListener('click', () => {
      const selectedVariant = {};

      // Collect custom select values
      overlay.querySelectorAll('.custom-select.variant-input-field').forEach((selectEl) => {
        const key = selectEl.getAttribute('data-variant-key');
        const val = selectEl.getAttribute('data-value');
        if (key && val) {
          selectedVariant[key] = val;
        }
      });

      // Collect multi-select tweaks checkboxes
      const checkedTweaks = [];
      overlay.querySelectorAll('.tweak-checkbox-input:checked').forEach((cb) => {
        checkedTweaks.push(cb.value);
      });
      if (checkedTweaks.length > 0) {
        selectedVariant['tweaks'] = checkedTweaks.join(' ');
      } else {
        selectedVariant['tweaks'] = 'none';
      }

      close();
      if (typeof onSelect === 'function') {
        onSelect(selectedVariant);
      }
    });
  },

  close() {
    const existing = document.getElementById('variant-picker-modal');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }
};

window.ApplyVariantPicker = {
  show({ title, subtitle, variants, onApply }) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'apply-variant-picker-modal';

    const defaultVar = variants[0] || { id: '', label: '' };

    const optionsHtml = variants.map((v, idx) => `
      <div class="custom-select-option ${idx === 0 ? 'selected' : ''}" data-value="${v.id}" data-label="${v.label}">
        <span>${v.label}</span>
        ${idx === 0 ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      </div>
    `).join('');

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${title || 'Select Flavor to Apply'}</h3>
            <p class="modal-subtitle">${subtitle || 'Choose standard or compact size variant'}</p>
          </div>
          <button class="modal-close-btn" id="apply-variant-close">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Available Theme Flavors</label>
            <div class="custom-select" id="apply-variant-select" data-value="${defaultVar.id}">
              <button type="button" class="custom-select-trigger">
                <span class="custom-select-label">${defaultVar.label}</span>
                <svg class="custom-select-arrow" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="custom-select-menu">
                ${optionsHtml}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn btn-secondary" id="apply-variant-cancel">Cancel</button>
          <button class="modal-btn btn-primary" id="apply-variant-confirm">Apply Theme</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => this.close();
    overlay.querySelector('#apply-variant-close').addEventListener('click', close);
    overlay.querySelector('#apply-variant-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const selectEl = overlay.querySelector('#apply-variant-select');
    if (selectEl) {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const labelSpan = selectEl.querySelector('.custom-select-label');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEl.classList.toggle('is-open');
      });

      selectEl.querySelectorAll('.custom-select-option').forEach((optEl) => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value');
          const labelText = optEl.getAttribute('data-label');
          selectEl.setAttribute('data-value', val);
          labelSpan.textContent = labelText;

          selectEl.querySelectorAll('.custom-select-option').forEach(o => {
            o.classList.remove('selected');
            const chk = o.querySelector('svg');
            if (chk) chk.remove();
          });
          optEl.classList.add('selected');
          optEl.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>');

          selectEl.classList.remove('is-open');
        });
      });
    }

    overlay.querySelector('#apply-variant-confirm').addEventListener('click', () => {
      const selected = selectEl ? selectEl.getAttribute('data-value') : '';
      close();
      if (typeof onApply === 'function') {
        onApply(selected);
      }
    });
  },

  close() {
    const existing = document.getElementById('apply-variant-picker-modal');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }
};

// Look Variant Picker Component - Premium Custom Dropdowns and Grouped Styling
window.LookVariantPicker = {
  open(item, onConfirm) {
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

    // Options definitions
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
      <div class="modal-dialog" style="max-width: 580px; width: 100%; max-height: 88vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${item.name}</h3>
            <p class="modal-subtitle">Choose components and styling variants before applying preset</p>
          </div>
          <button class="modal-close-btn" id="look-variant-close" title="Close">×</button>
        </div>

        <div class="modal-body" style="padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1;">
          <!-- Section 1: Orchis GTK & Shell -->
          <div style="background: #fbfbfc; border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: 12px 14px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span style="display: inline-flex; padding: 3px; border-radius: 4px; background: rgba(207, 65, 16, 0.1); color: #cf4110;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M9 21V9"></path>
                </svg>
              </span>
              <strong style="font-size: 12.5px; color: var(--text-primary);">1. Orchis Theme (GTK & Shell)</strong>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Color Accent</label>
                ${renderCustomSelect('look-orchis-color', 'default', orchisColorOptions)}
              </div>

              <div class="form-group">
                <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Mode</label>
                ${renderCustomSelect('look-orchis-mode', 'dark', orchisModeOptions)}
              </div>

              <div class="form-group">
                <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Size</label>
                ${renderCustomSelect('look-orchis-size', 'compact', orchisSizeOptions)}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 8px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Top Panel Logo Icon</label>
                ${renderCustomSelect('look-orchis-icon', 'default', orchisIconOptions)}
              </div>
            </div>

            <div class="form-group">
              <div class="form-label" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span>Theme Tweaks <small style="color: var(--text-muted); font-weight: normal; font-size: 10px;">(Multi-select)</small></span>
                <span class="tweak-info-badge" onclick="event.preventDefault();" title="Optional aesthetic customizations">
                  ⓘ
                  <span class="tweak-tooltip">Optional aesthetic customizations (macOS traffic lights, OLED pure black, solid panel, palettes, etc.)</span>
                </span>
              </div>
              <div class="tweaks-grid-container" style="grid-template-columns: 1fr 1fr; gap: 6px;">
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="macos" />
                  <span class="tweak-checkbox-label">macOS Controls</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Changes window buttons to macOS circular traffic lights">
                    ⓘ
                    <span class="tweak-tooltip">Changes window buttons (close, minimize, maximize) to macOS circular traffic lights style.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="black" />
                  <span class="tweak-checkbox-label">Deep Black (OLED)</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Uses pure #000000 true black background">
                    ⓘ
                    <span class="tweak-tooltip">Uses pure #000000 true black background for dark mode (great for OLED screens).</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="solid" />
                  <span class="tweak-checkbox-label">Solid Panel</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Removes translucency and makes top panel solid opaque">
                    ⓘ
                    <span class="tweak-tooltip">Removes translucency and makes the top panel and sidebars solid opaque.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="primary" />
                  <span class="tweak-checkbox-label">Primary Accent</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Highlights active window controls with selected accent color">
                    ⓘ
                    <span class="tweak-tooltip">Highlights active window controls, buttons, and switches with your selected accent color.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="nord" />
                  <span class="tweak-checkbox-label">Nord Palette</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Applies Arctic Nord cold blue palette">
                    ⓘ
                    <span class="tweak-tooltip">Applies Arctic Nord cold blue and pastel grey aesthetic palette.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="dracula" />
                  <span class="tweak-checkbox-label">Dracula Palette</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Applies gothic purple Dracula color scheme">
                    ⓘ
                    <span class="tweak-tooltip">Applies gothic purple and neon vibrant dark Dracula color scheme.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="submenu" />
                  <span class="tweak-checkbox-label">Submenu Icons</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Adds icons next to context menus and dropdowns">
                    ⓘ
                    <span class="tweak-tooltip">Adds icons next to context menus and dropdown menu items.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="compact" />
                  <span class="tweak-checkbox-label">Compact Spacing</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Reduces margins to save screen space">
                    ⓘ
                    <span class="tweak-tooltip">Reduces window margins and title bar height to save screen space.</span>
                  </span>
                </label>
                <label class="tweak-checkbox-item">
                  <input type="checkbox" class="look-tweak-checkbox" value="dock" />
                  <span class="tweak-checkbox-label">Floating Dock Fix</span>
                  <span class="tweak-info-badge" onclick="event.preventDefault();" title="Optimizes margins for floating dock panels">
                    ⓘ
                    <span class="tweak-tooltip">Optimizes margins and border radius for floating dock panels.</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 2: Tela Icon Theme -->
          <div style="background: #fbfbfc; border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: 12px 14px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span style="display: inline-flex; padding: 3px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: #2563eb;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                  <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                </svg>
              </span>
              <strong style="font-size: 12.5px; color: var(--text-primary);">2. Tela Icon Theme</strong>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Folder Color Scheme</label>
              ${renderCustomSelect('look-tela-color', 'dracula', telaColorOptions)}
            </div>
          </div>

          <!-- Section 3: Bibata Modern Cursor -->
          <div style="background: #fbfbfc; border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: 12px 14px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span style="display: inline-flex; padding: 3px; border-radius: 4px; background: rgba(16, 185, 129, 0.1); color: #059669;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                  <path d="m13 13 6 6"></path>
                </svg>
              </span>
              <strong style="font-size: 12.5px; color: var(--text-primary);">3. Bibata Cursor</strong>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Style</label>
                ${renderCustomSelect('look-bibata-style', 'modern', bibataStyleOptions)}
              </div>

              <div class="form-group">
                <label class="form-label" style="font-size: 10.5px; margin-bottom: 2px;">Color</label>
                ${renderCustomSelect('look-bibata-color', 'ice', bibataColorOptions)}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn btn-secondary" id="look-variant-cancel">Cancel</button>
          <button class="modal-btn btn-primary" id="look-variant-confirm">Install & Apply Full Look</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Setup interactive custom dropdown listeners
    overlay.querySelectorAll('.look-custom-select').forEach((selectEl) => {
      const trigger = selectEl.querySelector('.custom-select-trigger');
      const labelSpan = selectEl.querySelector('.custom-select-label');

      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other open dropdowns
        overlay.querySelectorAll('.look-custom-select').forEach(s => {
          if (s !== selectEl) s.classList.remove('is-open');
        });
        selectEl.classList.toggle('is-open');
      });

      selectEl.querySelectorAll('.custom-select-option').forEach((optEl) => {
        optEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = optEl.getAttribute('data-value');
          const labelText = optEl.getAttribute('data-label');

          selectEl.setAttribute('data-value', val);
          labelSpan.textContent = labelText;

          // Update color dot in trigger if exists
          const triggerDot = trigger.querySelector('span[style*="border-radius:50%"]');
          if (triggerDot && COLOR_HEX_MAP[val]) {
            triggerDot.style.background = COLOR_HEX_MAP[val];
          }

          selectEl.querySelectorAll('.custom-select-option').forEach(o => {
            o.classList.remove('selected');
            const chk = o.querySelector('svg');
            if (chk) chk.remove();
          });

          optEl.classList.add('selected');
          optEl.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>');

          selectEl.classList.remove('is-open');
        });
      });
    });

    // Close on backdrop click or anywhere outside open menus
    const close = () => this.close();
    overlay.querySelector('#look-variant-close').addEventListener('click', close);
    overlay.querySelector('#look-variant-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      } else {
        overlay.querySelectorAll('.look-custom-select').forEach(s => s.classList.remove('is-open'));
      }
    });

    // Confirm button
    overlay.querySelector('#look-variant-confirm').addEventListener('click', () => {
      const orchisColor = overlay.querySelector('#look-orchis-color')?.getAttribute('data-value') || 'default';
      const orchisMode = overlay.querySelector('#look-orchis-mode')?.getAttribute('data-value') || 'dark';
      const orchisSize = overlay.querySelector('#look-orchis-size')?.getAttribute('data-value') || 'compact';
      const orchisIcon = overlay.querySelector('#look-orchis-icon')?.getAttribute('data-value') || 'default';

      const checkedTweaks = Array.from(overlay.querySelectorAll('.look-tweak-checkbox:checked')).map(cb => cb.value);

      const telaColor = overlay.querySelector('#look-tela-color')?.getAttribute('data-value') || 'dracula';

      const bibataStyle = overlay.querySelector('#look-bibata-style')?.getAttribute('data-value') || 'modern';
      const bibataColor = overlay.querySelector('#look-bibata-color')?.getAttribute('data-value') || 'ice';

      const chosenVariants = {
        theme: {
          color: orchisColor,
          mode: orchisMode,
          size: orchisSize,
          icon: orchisIcon,
          tweaks: checkedTweaks.join(' ') || 'none'
        },
        icon: {
          color: telaColor
        },
        cursor: {
          style: bibataStyle,
          color: bibataColor
        }
      };

      close();
      if (typeof onConfirm === 'function') {
        onConfirm(chosenVariants);
      }
    });
  },

  close() {
    const existing = document.getElementById('look-variant-picker-modal');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }
};
