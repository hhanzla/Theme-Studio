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

// Look Variant Picker Component - Lets user configure variants for bundled Look components before applying
window.LookVariantPicker = {
  open(item, onConfirm) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'look-variant-picker-modal';

    overlay.innerHTML = `
      <div class="modal-dialog" style="max-width: 580px; max-height: 85vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${item.name}</h3>
            <p class="modal-subtitle">Select variants for each bundled theme before applying</p>
          </div>
          <button class="modal-close" id="look-variant-close" title="Close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body" style="overflow-y: auto; padding: 18px 24px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Section 1: Orchis GTK & Shell -->
          <div class="look-component-section" style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(207, 65, 16, 0.1); color: #cf4110;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18"></path>
                  <path d="M9 21V9"></path>
                </svg>
              </span>
              <strong style="font-size: 13.5px;">1. Orchis Theme (GTK & Shell)</strong>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Theme Color</label>
                <select id="look-orchis-color" class="setting-select" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: #ffffff;">
                  <option value="default" selected>Default (Blue)</option>
                  <option value="purple">Purple</option>
                  <option value="nord">Nord</option>
                  <option value="teal">Teal</option>
                  <option value="pink">Pink</option>
                  <option value="red">Red</option>
                  <option value="orange">Orange</option>
                  <option value="yellow">Yellow</option>
                  <option value="green">Green</option>
                  <option value="grey">Grey</option>
                </select>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Mode</label>
                <select id="look-orchis-mode" class="setting-select" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: #ffffff;">
                  <option value="dark" selected>Dark</option>
                  <option value="light">Light</option>
                  <option value="standard">Standard</option>
                </select>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Size</label>
                <select id="look-orchis-size" class="setting-select" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: #ffffff;">
                  <option value="compact" selected>Compact</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 2: Tela Icon Theme -->
          <div class="look-component-section" style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(59, 130, 246, 0.1); color: #2563eb;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="7" height="7" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="7" x="14" y="14" rx="1"></rect>
                  <rect width="7" height="7" x="3" y="14" rx="1"></rect>
                </svg>
              </span>
              <strong style="font-size: 13.5px;">2. Tela Icon Theme</strong>
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Folder Color Scheme</label>
              <select id="look-tela-color" class="setting-select" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: #ffffff;">
                <option value="dracula" selected>Dracula</option>
                <option value="nord">Nord</option>
                <option value="standard">Standard Blue</option>
                <option value="black">Black</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="grey">Grey</option>
                <option value="orange">Orange</option>
                <option value="pink">Pink</option>
                <option value="purple">Purple</option>
                <option value="red">Red</option>
                <option value="ubuntu">Ubuntu</option>
                <option value="manjaro">Manjaro</option>
                <option value="yellow">Yellow</option>
                <option value="brown">Brown</option>
              </select>
            </div>
          </div>

          <!-- Section 3: Bibata Modern Cursor -->
          <div class="look-component-section" style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(16, 185, 129, 0.1); color: #059669;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                  <path d="m13 13 6 6"></path>
                </svg>
              </span>
              <strong style="font-size: 13.5px;">3. Bibata Cursor</strong>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Style</label>
                <select id="look-bibata-style" class="setting-select" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: #ffffff;">
                  <option value="modern" selected>Modern (Rounded)</option>
                  <option value="original">Original (Sharp)</option>
                </select>
              </div>

              <div>
                <label style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Color</label>
                <select id="look-bibata-color" class="setting-select" style="width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-subtle); background: #ffffff;">
                  <option value="ice" selected>Ice (White)</option>
                  <option value="classic">Classic (Black)</option>
                  <option value="amber">Amber (Gold)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="padding: 14px 24px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn btn-secondary" id="look-variant-cancel">Cancel</button>
          <button class="btn btn-primary" id="look-variant-confirm" style="background: #cf4110; border-color: #cf4110; color: #ffffff;">
            Install & Apply Full Look
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => this.close();
    overlay.querySelector('#look-variant-close').addEventListener('click', close);
    overlay.querySelector('#look-variant-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#look-variant-confirm').addEventListener('click', () => {
      const orchisColor = overlay.querySelector('#look-orchis-color').value;
      const orchisMode = overlay.querySelector('#look-orchis-mode').value;
      const orchisSize = overlay.querySelector('#look-orchis-size').value;

      const telaColor = overlay.querySelector('#look-tela-color').value;

      const bibataStyle = overlay.querySelector('#look-bibata-style').value;
      const bibataColor = overlay.querySelector('#look-bibata-color').value;

      const chosenVariants = {
        theme: {
          color: orchisColor,
          mode: orchisMode,
          size: orchisSize
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
