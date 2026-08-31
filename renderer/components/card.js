// renderer/components/card.js
// Modern Theme Card Component for Theme Studio

window.ThemeCard = {
  create(item, onAction) {
    const card = document.createElement('div');
    card.className = `theme-card group relative bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col ${item.installed ? 'is-installed' : ''}`;
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-category', item.category || '');

    const hasMultipleVariants = item.variants && typeof item.variants === 'object' && Object.keys(item.variants).some(k => Array.isArray(item.variants[k]) && item.variants[k].length > 1);

    let typeBadgeHtml = '';
    if (item.install_type === 'script' && (item.install_script || item.install_args_template)) {
      typeBadgeHtml = '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-brand border border-orange-200">Script</span>';
    } else if (item.install_type === 'script' || item.install_type === 'git') {
      typeBadgeHtml = '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-brand border border-orange-200">Git</span>';
    } else if (item.install_type === 'zip-static') {
      typeBadgeHtml = '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">Zip</span>';
    }

    if (hasMultipleVariants) {
      typeBadgeHtml += ' <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">Variants</span>';
    }

    const installedBadgeHtml = item.installed
      ? '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Installed</span>'
      : '';

    // Chips
    let variantsChips = '';
    if (item.variants && typeof item.variants === 'object') {
      if (item.variants.color && item.variants.color.length > 0) {
        variantsChips += `<span class="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10.5px] font-medium">${item.variants.color.length} Colors</span>`;
      }
      if (item.variants.accent && item.variants.accent.length > 0) {
        variantsChips += `<span class="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10.5px] font-medium">${item.variants.accent.length} Accents</span>`;
      }
      if (item.variants.mode && item.variants.mode.length > 0) {
        variantsChips += `<span class="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10.5px] font-medium">${item.variants.mode.join('/')}</span>`;
      }
      if (item.variants.style && item.variants.style.length > 0) {
        variantsChips += `<span class="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10.5px] font-medium">${item.variants.style.join('/')}</span>`;
      }
      if (item.variants.tweaks && item.variants.tweaks.length > 0) {
        variantsChips += `<span class="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10.5px] font-medium">${item.variants.tweaks.length} Tweaks</span>`;
      }
    }

    if (item.gtk4_fix) {
      variantsChips += '<span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10.5px] font-medium border border-emerald-200">GTK4 Ready</span>';
    }

    // Category icon
    const getCategoryIconSvg = (cat) => {
      if (cat === 'icon-theme') {
        return `<svg class="w-8 h-8 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect></svg>`;
      }
      if (cat === 'cursor-theme') {
        return `<svg class="w-8 h-8 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>`;
      }
      if (cat === 'wallpaper') {
        return `<svg class="w-8 h-8 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`;
      }
      return `<svg class="w-8 h-8 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>`;
    };

    let actionBtnText = 'Install';
    if (item.installed) {
      if (item.category === 'gtk-theme') actionBtnText = 'Apply Theme';
      else if (item.category === 'shell-theme') actionBtnText = 'Apply Shell';
      else if (item.category === 'icon-theme') actionBtnText = 'Apply Icons';
      else if (item.category === 'cursor-theme') actionBtnText = 'Apply Cursors';
      else if (item.category === 'looks') actionBtnText = 'Apply Look';
      else if (item.category === 'wallpaper') actionBtnText = 'Set Wallpaper';
      else actionBtnText = 'Apply';
    } else {
      if (item.category === 'looks') actionBtnText = 'Apply Look';
      else if (item.category === 'wallpaper') actionBtnText = 'Set Wallpaper';
      else actionBtnText = 'Install';
    }

    card.innerHTML = `
      <div class="card-preview relative h-36 bg-zinc-100 overflow-hidden flex items-center justify-center">
        ${item.preview 
          ? `<img src="${item.preview}" alt="${item.name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">` 
          : `<div class="w-full h-full flex flex-col items-center justify-center bg-zinc-50 text-zinc-400 gap-1.5">${getCategoryIconSvg(item.category)}<span class="text-[11px] font-medium text-zinc-400">${item.name}</span></div>`
        }
        <div class="absolute top-2.5 right-2.5 flex items-center gap-1">
          ${installedBadgeHtml}
        </div>
      </div>

      <div class="card-body p-3.5 flex flex-col flex-1">
        <div class="flex items-start justify-between gap-2 mb-1">
          <h4 class="card-title text-[13.5px] font-bold text-zinc-900 leading-snug line-clamp-1">${item.name}</h4>
          <div class="flex items-center gap-1 shrink-0">
            ${typeBadgeHtml}
          </div>
        </div>

        <p class="card-description text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3 flex-1">${item.description || 'Linux desktop customization package.'}</p>

        ${variantsChips ? `<div class="flex flex-wrap gap-1 mb-3">${variantsChips}</div>` : ''}

        <div class="card-actions flex items-center justify-between pt-2.5 border-t border-zinc-100 mt-auto">
          <span class="text-[11px] font-mono text-zinc-400 truncate max-w-[120px]">${item.author || item.id}</span>
          <button class="btn btn-primary btn-action px-3 py-1.5 text-xs font-semibold rounded-md shadow-none hover:shadow-sm active:scale-95 transition-all" data-id="${item.id}">
            ${actionBtnText}
          </button>
        </div>
      </div>
    `;

    // Action button
    const actionBtn = card.querySelector('.btn-action');
    if (actionBtn && onAction) {
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onAction(item, card);
      });
    }

    return card;
  },

  updateState(cardElement, state) {
    if (!cardElement) return;
    const actionBtn = cardElement.querySelector('.btn-action');
    const headerRow = cardElement.querySelector('.card-preview');

    if (state === 'installing' || state === 'applying') {
      if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${state === 'installing' ? 'Installing...' : 'Applying...'}
        `;
      }
    } else if (state === 'installed') {
      cardElement.classList.add('is-installed');
      if (actionBtn) {
        actionBtn.disabled = false;
        const cat = cardElement.getAttribute('data-category');
        if (cat === 'gtk-theme') actionBtn.textContent = 'Apply Theme';
        else if (cat === 'shell-theme') actionBtn.textContent = 'Apply Shell';
        else if (cat === 'icon-theme') actionBtn.textContent = 'Apply Icons';
        else if (cat === 'cursor-theme') actionBtn.textContent = 'Apply Cursors';
        else if (cat === 'looks') actionBtn.textContent = 'Apply Look';
        else if (cat === 'wallpaper') actionBtnText = 'Set Wallpaper';
        else actionBtn.textContent = 'Apply';
      }
      if (headerRow && !headerRow.querySelector('.badge-installed')) {
        headerRow.insertAdjacentHTML('beforeend', '<div class="absolute top-2.5 right-2.5"><span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Installed</span></div>');
      }
    } else if (state === 'idle') {
      if (actionBtn) {
        actionBtn.disabled = false;
        actionBtn.textContent = 'Install';
      }
    }
  }
};
