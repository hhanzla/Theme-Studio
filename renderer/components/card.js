// Card Component for Theme Studio
window.ThemeCard = {
  create(item, onAction) {
    const card = document.createElement('div');
    card.className = `theme-card ${item.installed ? 'is-installed' : ''}`;
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-category', item.category || '');

    // Badges calculation
    let typeBadgeHtml = '';
    if (item.install_type === 'script') {
      typeBadgeHtml = '<span class="badge-tag badge-script">Script</span>';
    } else if (item.install_type === 'zip-static') {
      typeBadgeHtml = '<span class="badge-tag badge-zip">Zip</span>';
    }

    const installedBadgeHtml = item.installed
      ? '<span class="badge-tag badge-installed">Installed</span>'
      : '';

    // Variants text
    let variantsChips = '';
    if (item.variants) {
      if (item.variants.color && item.variants.color.length > 0) {
        variantsChips += `<span class="meta-chip">${item.variants.color.length} Colors</span>`;
      }
      if (item.variants.mode && item.variants.mode.length > 0) {
        variantsChips += `<span class="meta-chip">${item.variants.mode.join('/')}</span>`;
      }
    }

    if (item.gtk4_fix) {
      variantsChips += '<span class="meta-chip chip-gtk4">GTK4 Ready</span>';
    }

    if (item.license) {
      variantsChips += `<span class="meta-chip">${item.license}</span>`;
    }

    // Category icon for fallback
    const getCategoryIconSvg = (cat) => {
      if (cat === 'icon-theme') {
        return `<svg class="card-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>`;
      }
      if (cat === 'cursor-theme') {
        return `<svg class="card-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>`;
      }
      if (cat === 'wallpaper') {
        return `<svg class="card-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`;
      }
      return `<svg class="card-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>`;
    };

    let actionBtnText = 'Install';
    let actionBtnClass = 'btn-primary';

    if (item.installed) {
      actionBtnClass = 'btn-primary';
      if (item.category === 'gtk-theme') {
        actionBtnText = 'Apply Theme';
      } else if (item.category === 'shell-theme') {
        actionBtnText = 'Apply Shell';
      } else if (item.category === 'icon-theme') {
        actionBtnText = 'Apply Icons';
      } else if (item.category === 'cursor-theme') {
        actionBtnText = 'Apply Cursors';
      } else if (item.category === 'looks') {
        actionBtnText = 'Apply Look';
      } else if (item.category === 'wallpaper') {
        actionBtnText = 'Set Wallpaper';
      } else {
        actionBtnText = 'Apply';
      }
    } else {
      if (item.category === 'looks') {
        actionBtnText = 'Apply Look';
      } else if (item.category === 'wallpaper') {
        actionBtnText = 'Set Wallpaper';
      } else {
        actionBtnText = 'Install';
      }
    }

    card.innerHTML = `
      <div class="card-thumbnail-container">
        <img 
          src="${item.thumbnail || ''}" 
          alt="${item.name}" 
          class="card-thumbnail"
          loading="lazy"
          decoding="async"
        />
        <div class="card-fallback-preview" style="display: none;">
          ${getCategoryIconSvg(item.category)}
          <span class="card-fallback-name">${item.name}</span>
        </div>
        <div class="card-badges-floating">
          <div class="badge-type-slot">${typeBadgeHtml}</div>
          <div class="badge-installed-slot">${installedBadgeHtml}</div>
        </div>
      </div>

      <div class="card-body">
        <div class="card-title-row">
          <h3 class="card-title">${item.name}</h3>
        </div>
        <p class="card-author">by <span>${item.author || 'Community'}</span></p>

        <div class="card-meta-tags">
          ${variantsChips}
        </div>

        <div class="card-footer">
          <button class="card-btn ${actionBtnClass} action-trigger-btn">
            ${actionBtnText}
          </button>
        </div>
      </div>
    `;

    // Handle thumbnail loading error gracefully
    const imgEl = card.querySelector('.card-thumbnail');
    const fallbackEl = card.querySelector('.card-fallback-preview');
    if (imgEl && fallbackEl) {
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        fallbackEl.style.display = 'flex';
      };
      if (!item.thumbnail || item.thumbnail.includes('<you>')) {
        imgEl.style.display = 'none';
        fallbackEl.style.display = 'flex';
      }
    }

    // Action button handler
    const btn = card.querySelector('.action-trigger-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onAction === 'function') {
          onAction(item, card);
        }
      });
    }

    // Card click handler
    card.addEventListener('click', () => {
      if (typeof onAction === 'function') {
        onAction(item, card);
      }
    });

    return card;
  },

  setProgress(card, percent, stage, message, onCancel) {
    if (!card) return;
    const footer = card.querySelector('.card-footer');
    const btn = card.querySelector('.action-trigger-btn');
    if (!footer || !btn) return;

    let cancelBtn = footer.querySelector('.card-cancel-btn');

    if (stage === 'completed') {
      if (cancelBtn) cancelBtn.remove();
      this.setInstalled(card, true);
      return;
    }

    if (stage === 'cancelled' || stage === 'error') {
      if (cancelBtn) cancelBtn.remove();
      btn.disabled = false;
      btn.className = 'card-btn btn-primary action-trigger-btn';
      btn.textContent = stage === 'error' ? 'Retry Install' : 'Install';
      return;
    }

    // Active downloading / cloning / installing state
    btn.disabled = true;
    btn.className = 'card-btn btn-secondary action-trigger-btn is-loading';
    
    if (stage === 'downloading' || stage === 'cloning_repo') {
      if (message && (message.includes('MiB') || message.includes('KiB') || message.includes('%') || message.includes('MB') || message.includes('KB'))) {
        let cleanMsg = message.replace(/^Downloading repository\s*/i, 'Downloading ').replace(/^Cloning repository\s*/i, 'Cloning ').replace(/^Connecting to repository\s*/i, 'Connecting...');
        btn.textContent = cleanMsg;
      } else if (percent === 0 || !percent) {
        btn.textContent = 'Connecting...';
      } else {
        btn.textContent = `Downloading ${percent}%`;
      }
    } else if (stage === 'extracting') {
      btn.textContent = message || 'Extracting...';
    } else if (stage === 'running_script' || stage === 'applying' || stage === 'applying_fixes') {
      btn.textContent = message || 'Installing...';
    } else {
      btn.textContent = message || 'Processing...';
    }

    // Ensure Cancel Button exists in footer
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.className = 'card-btn btn-secondary card-cancel-btn';
      cancelBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 4px; vertical-align: -1px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Cancel`;
      cancelBtn.style.flex = '0 0 auto';
      cancelBtn.style.padding = '6px 8px';
      cancelBtn.style.borderColor = '#ef4444';
      cancelBtn.style.color = '#dc2626';

      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onCancel === 'function') {
          onCancel();
        }
      });
      footer.appendChild(cancelBtn);
    }
  },

  setInstalled(card, isInstalled = true) {
    if (!card) return;
    const btn = card.querySelector('.action-trigger-btn');
    const installedSlot = card.querySelector('.badge-installed-slot');
    const cancelBtn = card.querySelector('.card-cancel-btn');
    if (cancelBtn) cancelBtn.remove();

    const cat = card.getAttribute('data-category') || '';

    let applyLabel = 'Apply';
    if (cat === 'gtk-theme') applyLabel = 'Apply Theme';
    else if (cat === 'shell-theme') applyLabel = 'Apply Shell';
    else if (cat === 'icon-theme') applyLabel = 'Apply Icons';
    else if (cat === 'cursor-theme') applyLabel = 'Apply Cursors';
    else if (cat === 'looks') applyLabel = 'Apply Look';
    else if (cat === 'wallpaper') applyLabel = 'Set Wallpaper';

    if (isInstalled) {
      card.classList.add('is-installed');
      if (btn) {
        btn.disabled = false;
        btn.className = 'card-btn btn-primary action-trigger-btn';
        btn.textContent = applyLabel;
      }
      if (installedSlot) {
        installedSlot.innerHTML = '<span class="badge-tag badge-installed">Installed</span>';
      }
    } else {
      card.classList.remove('is-installed');
      if (btn) {
        btn.disabled = false;
        btn.className = 'card-btn btn-primary action-trigger-btn';
        btn.textContent = (cat === 'looks' ? 'Apply Look' : (cat === 'wallpaper' ? 'Set Wallpaper' : 'Install'));
      }
      if (installedSlot) {
        installedSlot.innerHTML = '';
      }
    }
  },

  setApplied(card, isApplied = true) {
    if (!card) return;
    const btn = card.querySelector('.action-trigger-btn');
    const cancelBtn = card.querySelector('.card-cancel-btn');
    if (cancelBtn) cancelBtn.remove();

    const cat = card.getAttribute('data-category') || '';

    if (isApplied) {
      card.classList.add('is-applied');
      if (btn) {
        btn.disabled = false;
        btn.className = 'card-btn btn-secondary action-trigger-btn is-applied';
        btn.innerHTML = `
          <span class="applied-text"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 4px; vertical-align: -2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Applied</span>
          <span class="unapply-text"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 4px; vertical-align: -2px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>Unapply</span>
        `;
        btn.title = 'Click to unapply and restore default theme';
      }
    } else {
      card.classList.remove('is-applied');
      if (btn) {
        btn.disabled = false;
        btn.className = 'card-btn btn-primary action-trigger-btn';
        const isInstalled = card.classList.contains('is-installed');
        if (isInstalled) {
          let applyLabel = 'Apply';
          if (cat === 'gtk-theme') applyLabel = 'Apply Theme';
          else if (cat === 'shell-theme') applyLabel = 'Apply Shell';
          else if (cat === 'icon-theme') applyLabel = 'Apply Icons';
          else if (cat === 'cursor-theme') applyLabel = 'Apply Cursors';
          else if (cat === 'looks') applyLabel = 'Apply Look';
          else if (cat === 'wallpaper') applyLabel = 'Set Wallpaper';
          btn.textContent = applyLabel;
        } else {
          btn.textContent = (cat === 'looks' ? 'Apply Look' : (cat === 'wallpaper' ? 'Set Wallpaper' : 'Install'));
        }
      }
    }
  }
};
