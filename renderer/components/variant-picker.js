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
