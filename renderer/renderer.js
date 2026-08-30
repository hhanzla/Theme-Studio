// Theme Studio - Renderer Logic

const AppState = {
  activeCategory: 'gtk-theme',
  activeSubtab: 'browse', // 'installed' | 'browse'
  searchQuery: '',
  items: [],
  activeInstalls: new Set()
};

const CATEGORY_META = {
  'looks': {
    title: 'Looks & Presets',
    subtitle: 'Full desktop presets combining themes, icons, cursors and wallpapers'
  },
  'gtk-theme': {
    title: 'GTK Themes',
    subtitle: 'Explore curated GTK3 and GTK4 Libadwaita window themes'
  },
  'shell-theme': {
    title: 'Shell Themes',
    subtitle: 'Customize GNOME top bar, panel, menus, and system popups'
  },
  'icon-theme': {
    title: 'Icon Packs',
    subtitle: 'Modern icon packs tailored for GNOME desktop'
  },
  'cursor-theme': {
    title: 'Cursor Sets',
    subtitle: 'Sleek and responsive cursor themes'
  },
  'wallpaper': {
    title: 'Wallpapers',
    subtitle: 'Curated high resolution desktop wallpapers'
  },
  'extensions': {
    title: 'GNOME Extensions',
    subtitle: 'Enhance your GNOME desktop workflow with extensions'
  }
};

// Elements
const pageTitleEl = document.getElementById('page-title');
const pageSubtitleEl = document.getElementById('page-subtitle');
const searchInputEl = document.getElementById('search-input');
const cardsGridEl = document.getElementById('cards-grid');
const emptyStateEl = document.getElementById('empty-state');
const emptyTitleEl = document.getElementById('empty-title');
const emptyDescEl = document.getElementById('empty-desc');
const installedCountEl = document.getElementById('installed-count');
const browseCountEl = document.getElementById('browse-count');
const tabInstalledBtn = document.getElementById('tab-installed');
const tabBrowseBtn = document.getElementById('tab-browse');
const toastContainerEl = document.getElementById('toast-container');

// Toast Notification
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainerEl.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, duration);
}

function restoreDefaultSubtabs() {
  const subtabsBar = document.querySelector('.subtabs-bar');
  if (!subtabsBar) return;

  const installedCount = (AppState.items || []).filter(i => i.installed).length;
  const browseCount = (AppState.items || []).length;

  subtabsBar.style.display = 'flex';
  subtabsBar.innerHTML = `
    <div class="subtabs">
      <button class="subtab-btn ${AppState.activeSubtab === 'installed' ? 'active' : ''}" data-subtab="installed" id="tab-installed">
        <span>Installed</span>
        <span class="badge count-badge" id="installed-count">${installedCount}</span>
      </button>
      <button class="subtab-btn ${AppState.activeSubtab === 'browse' ? 'active' : ''}" data-subtab="browse" id="tab-browse">
        <span>Browse</span>
        <span class="badge count-badge" id="browse-count">${browseCount}</span>
      </button>
    </div>
  `;

  // Re-wire subtab buttons
  document.getElementById('tab-installed')?.addEventListener('click', () => {
    AppState.activeSubtab = 'installed';
    document.getElementById('tab-installed')?.classList.add('active');
    document.getElementById('tab-browse')?.classList.remove('active');
    updateView();
  });

  document.getElementById('tab-browse')?.addEventListener('click', () => {
    AppState.activeSubtab = 'browse';
    document.getElementById('tab-browse')?.classList.add('active');
    document.getElementById('tab-installed')?.classList.remove('active');
    updateView();
  });
}

// Load Catalog for Active Category
async function loadCategory(category) {
  AppState.activeCategory = category;
  AppState.activeSubtab = 'browse'; // Always start on Browse when switching categories
  // Persist so reload stays on same page
  try { localStorage.setItem('ts_last_category', category); } catch (_) {}

  // Update Active Sidebar Item
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((btn) => {
    if (btn.getAttribute('data-category') === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  document.getElementById('btn-uninstall-mgr')?.classList.remove('active');

  if (category === 'settings') {
    pageTitleEl.textContent = 'Settings & Integration';
    pageSubtitleEl.textContent = 'Flatpak sandbox theme sync, asset storage directories, and system preferences';
    const subtabsBar = document.querySelector('.subtabs-bar');
    if (subtabsBar) subtabsBar.style.display = 'none';
    emptyStateEl.classList.add('hidden');
    window.SettingsView.render(cardsGridEl);
    return;
  }

  if (category === 'extensions') {
    pageTitleEl.textContent = 'GNOME Extensions';
    pageSubtitleEl.textContent = 'Manage, enable, and toggle installed GNOME Shell extensions';
    emptyStateEl.classList.add('hidden');
    window.ExtensionsView.render(cardsGridEl);
    return;
  }

  // Update Header Meta
  const meta = CATEGORY_META[category] || { title: category, subtitle: '' };
  pageTitleEl.textContent = meta.title;
  pageSubtitleEl.textContent = meta.subtitle;

  try {
    const res = await window.electronAPI.catalog.list({ category });
    if (res && res.success) {
      AppState.items = res.items || [];
      if (category === 'wallpaper') {
        try {
          const sysRes = await window.electronAPI.system.current();
          if (sysRes && sysRes.success && sysRes.settings && sysRes.settings.wallpaper) {
            const currentWp = sysRes.settings.wallpaper.toLowerCase();
            const getCleanBase = (p) => {
              if (!p) return '';
              const decoded = decodeURIComponent(p.replace(/^file:\/\//, ''));
              const file = decoded.split('/').pop() || '';
              return file.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            };
            const currentBase = getCleanBase(currentWp);
            const matchIdx = AppState.items.findIndex(item => getCleanBase(item.url) === currentBase);
            if (matchIdx > 0) {
              const appliedItem = AppState.items.splice(matchIdx, 1)[0];
              AppState.items.unshift(appliedItem);
            }
          }
        } catch (_) {}
      }
    } else {
      AppState.items = [];
      console.error('Failed to load items:', res ? res.error : 'Unknown error');
    }
  } catch (err) {
    console.error('IPC invocation error:', err);
    AppState.items = [];
  }

  restoreDefaultSubtabs();
  updateView();
}

// Update View / Filter Cards
function updateView() {
  const query = AppState.searchQuery.toLowerCase().trim();

  const installedItems = (AppState.items || []).filter((item) => item.installed);
  const browseItems = AppState.items || [];

  // Update Live Counts
  const countInstalledEl = document.getElementById('installed-count');
  const countBrowseEl = document.getElementById('browse-count');
  if (countInstalledEl) countInstalledEl.textContent = installedItems.length;
  if (countBrowseEl) countBrowseEl.textContent = browseItems.length;

  // Filter items based on active subtab and search query
  let displayItems = AppState.activeSubtab === 'installed' ? installedItems : browseItems;

  if (query) {
    displayItems = displayItems.filter((item) => {
      const nameMatch = (item.name || '').toLowerCase().includes(query);
      const authorMatch = (item.author || '').toLowerCase().includes(query);
      const descMatch = (item.notes || '').toLowerCase().includes(query);
      return nameMatch || authorMatch || descMatch;
    });
  }

  // Render Cards
  cardsGridEl.innerHTML = '';

  if (displayItems.length === 0) {
    emptyStateEl.classList.remove('hidden');
    if (AppState.activeSubtab === 'installed') {
      emptyTitleEl.textContent = 'No Installed Items';
      emptyDescEl.textContent = query
        ? `No installed items match "${query}".`
        : 'You have not installed any items in this category yet.';
    } else {
      emptyTitleEl.textContent = 'No Items Found';
      emptyDescEl.textContent = query
        ? `No catalog items match "${query}".`
        : 'There are no items currently available in this catalog.';
    }
  } else {
    emptyStateEl.classList.add('hidden');
    displayItems.forEach((item) => {
      const card = window.ThemeCard.create(item, handleCardAction);
      cardsGridEl.appendChild(card);
    });

    // Check active desktop settings to highlight currently active items (themes, icons, cursors, wallpaper)
    if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.current) {
      window.electronAPI.system.current().then((res) => {
        if (res && res.success && res.settings) {
          const s = res.settings;
          displayItems.forEach((item) => {
            const cardEl = cardsGridEl.querySelector(`.theme-card[data-id="${item.id}"]`);
            if (!cardEl) return;

            if (item.category === 'wallpaper') {
              const currentWp = (s.wallpaper || '').toLowerCase();
              const getCleanBase = (p) => {
                if (!p) return '';
                const decoded = decodeURIComponent(p.replace(/^file:\/\//, ''));
                const file = decoded.split('/').pop() || '';
                return file.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
              };

              const currentBase = getCleanBase(currentWp);
              const itemBase = getCleanBase(item.url);

              if (currentBase && itemBase && currentBase === itemBase) {
                window.ThemeCard.setApplied(cardEl, true);
              } else {
                window.ThemeCard.setApplied(cardEl, false);
              }
              return;
            }

            if (!item.installed) {
              window.ThemeCard.setApplied(cardEl, false);
              return;
            }

            let targetToCheck = '';
            if (item.category === 'gtk-theme') targetToCheck = (s.gtk || '').toLowerCase();
            else if (item.category === 'shell-theme') targetToCheck = (s.shell || '').toLowerCase();
            else if (item.category === 'icon-theme') targetToCheck = (s.icons || '').toLowerCase();
            else if (item.category === 'cursor-theme') targetToCheck = (s.cursors || '').toLowerCase();

            const nameSlug = (item.name || '').toLowerCase().replace(/shell|gtk|theme|themes/g, '').replace(/[^a-z0-9]/g, '').trim();

            if (targetToCheck && nameSlug && targetToCheck.replace(/[^a-z0-9]/g, '').includes(nameSlug)) {
              window.ThemeCard.setApplied(cardEl, true);
            } else {
              window.ThemeCard.setApplied(cardEl, false);
            }
          });
        }
      }).catch(() => {});
    }
  }
}

// Card Action & Installation Pipeline
async function performInstallation(item, card, variant = null) {
  // 1. Check dependencies if any
  if (item.dependencies && item.dependencies.length > 0) {
    try {
      const depCheck = await window.electronAPI.deps.check({ list: item.dependencies });
      if (depCheck && depCheck.missing && depCheck.missing.length > 0) {
        window.ConfirmDialog.show({
          title: 'Missing Dependencies',
          subtitle: `${item.name} requires packages`,
          message: `To build and install ${item.name}, the following system packages must be installed:`,
          items: depCheck.missing,
          confirmText: 'Install with pkexec',
          onConfirm: async () => {
            showToast(`Installing dependencies: ${depCheck.missing.join(', ')}...`, 'info');
            const installDepRes = await window.electronAPI.deps.install({ list: depCheck.missing });
            if (installDepRes && installDepRes.success) {
              showToast('Dependencies installed successfully!', 'success');
              executeInstall(item, card, variant);
            } else {
              showToast(`Dependency installation failed: ${installDepRes ? installDepRes.error : 'Unknown error'}`, 'warning');
            }
          }
        });
        return;
      }
    } catch (err) {
      console.error('Dependency check error:', err);
    }
  }

  executeInstall(item, card, variant);
}

async function cancelInstallItem(itemId, itemName) {
  try {
    await window.electronAPI.installer.cancel({ id: itemId });
    AppState.activeInstalls.delete(itemId);
    const card = document.querySelector(`.theme-card[data-id="${itemId}"]`);
    if (card) {
      window.ThemeCard.setProgress(card, 0, 'cancelled', 'Cancelled');
    }
    showToast(`Installation of ${itemName || 'theme'} cancelled`, 'info');
  } catch (err) {
    console.error('Cancel error:', err);
  }
}

async function executeInstall(item, card, variant = null) {
  AppState.activeInstalls.add(item.id);
  const onCancel = () => cancelInstallItem(item.id, item.name);
  window.ThemeCard.setProgress(card, 5, 'downloading', 'Starting installation...', onCancel);
  showToast(`Installing ${item.name}...`, 'info');

  try {
    const res = await window.electronAPI.installer.start({
      id: item.id,
      category: item.category,
      variant: variant
    });

    AppState.activeInstalls.delete(item.id);

    if (res && res.success) {
      // Update the item in AppState too
      const stateItem = AppState.items.find(i => i.id === item.id);
      if (stateItem) stateItem.installed = true;
      item.installed = true;

      // Update installed count badge
      const installedCount = AppState.items.filter((i) => i.installed).length;
      installedCountEl.textContent = installedCount;

      showToast(`${item.name} installed successfully!`, 'success');

      // Auto-switch to Installed subtab and refresh
      AppState.activeSubtab = 'installed';
      if (tabInstalledBtn) {
        tabInstalledBtn.classList.add('active');
        tabBrowseBtn.classList.remove('active');
      }
      updateView();
    } else {
      if (res && res.error && res.error.includes('cancelled')) {
        window.ThemeCard.setProgress(card, 0, 'cancelled', 'Cancelled');
      } else {
        window.ThemeCard.setProgress(card, 0, 'error', res ? res.error : 'Installation failed');
        showToast(`Failed to install ${item.name}: ${res ? res.error : 'Error'}`, 'warning');
      }
    }
  } catch (err) {
    AppState.activeInstalls.delete(item.id);
    if (err.message && err.message.includes('cancelled')) {
      window.ThemeCard.setProgress(card, 0, 'cancelled', 'Cancelled');
    } else {
      window.ThemeCard.setProgress(card, 0, 'error', err.message);
      showToast(`Error installing ${item.name}: ${err.message}`, 'warning');
    }
  }
}

async function handleCardAction(item, card) {
  // Looks Preset Application
  if (item.category === 'looks') {
    if (AppState.activeInstalls.has(item.id)) {
      showToast(`Applying ${item.name}...`, 'warning');
      return;
    }

    AppState.activeInstalls.add(item.id);
    window.ThemeCard.setProgress(card, 15, 'applying', `Applying ${item.name}...`);
    showToast(`Applying ${item.name} preset...`, 'info');

    try {
      const res = await window.electronAPI.looks.apply({ id: item.id });
      AppState.activeInstalls.delete(item.id);

      if (res && res.success) {
        window.ThemeCard.setInstalled(card, true);
        showToast(`${item.name} applied successfully!`, 'success');
      } else {
        window.ThemeCard.setProgress(card, 0, 'error', res ? res.error : 'Failed to apply look');
        showToast(`Failed to apply look: ${res ? res.error : 'Error'}`, 'warning');
      }
    } catch (err) {
      AppState.activeInstalls.delete(item.id);
      window.ThemeCard.setProgress(card, 0, 'error', err.message);
      showToast(`Error applying look: ${err.message}`, 'warning');
    }
    return;
  }

  // Wallpaper Setting
  if (item.category === 'wallpaper') {
    const btn = card.querySelector('.action-trigger-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Applying...';
    }
    showToast(`Setting wallpaper: ${item.name}...`, 'info');
    try {
      const res = await window.electronAPI.system.applyWallpaper(item.url);
      if (res && res.success) {
        // Move applied wallpaper to the top
        const currentIdx = AppState.items.findIndex(x => x.id === item.id);
        if (currentIdx > -1) {
          const [movedItem] = AppState.items.splice(currentIdx, 1);
          AppState.items.unshift(movedItem);
        }
        updateView();
        showToast(`${item.name} set as desktop wallpaper!`, 'success');
      } else {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Set Wallpaper';
        }
        showToast(`Failed to set wallpaper: ${res ? res.error : 'Error'}`, 'warning');
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Set Wallpaper';
      }
      showToast(`Error setting wallpaper: ${err.message}`, 'warning');
    }
    return;
  }

  if (item.installed) {
    // If the card is already applied, clicking it unapplies the theme and restores system default!
    if (card.classList.contains('is-applied')) {
      try {
        if (item.category === 'gtk-theme') {
          await window.electronAPI.system.applyGtk('Yaru');
          showToast(`Unapplied ${item.name} — Restored default Yaru GTK theme`, 'info');
        } else if (item.category === 'shell-theme') {
          await window.electronAPI.system.applyShell('');
          showToast(`Unapplied ${item.name} — Restored default GNOME Shell`, 'info');
        } else if (item.category === 'icon-theme') {
          await window.electronAPI.system.applyIcons('Yaru');
          showToast(`Unapplied ${item.name} — Restored default Yaru icons`, 'info');
        } else if (item.category === 'cursor-theme') {
          await window.electronAPI.system.applyCursors('Yaru');
          showToast(`Unapplied ${item.name} — Restored default cursor`, 'info');
        }
        window.ThemeCard.setApplied(card, false);
        return;
      } catch (err) {
        showToast(`Failed to unapply ${item.name}: ${err.message}`, 'warning');
        return;
      }
    }

    const applyDirectly = async (chosenTarget) => {
      try {
        if (item.category === 'gtk-theme') {
          await window.electronAPI.system.applyGtk(chosenTarget);
          showToast(`Applied ${chosenTarget} as active GTK window theme`, 'success');
        } else if (item.category === 'shell-theme') {
          await window.electronAPI.system.applyShell(chosenTarget);
          showToast(`Applied ${chosenTarget} as active GNOME Shell theme`, 'success');
        } else if (item.category === 'icon-theme') {
          await window.electronAPI.system.applyIcons(chosenTarget);
          showToast(`Applied ${chosenTarget} as active icon pack`, 'success');
        } else if (item.category === 'cursor-theme') {
          await window.electronAPI.system.applyCursors(chosenTarget);
          showToast(`Applied ${chosenTarget} as active cursor set`, 'success');
        } else {
          showToast(`${item.name} is installed.`, 'info');
        }

        // Reset all other cards in current view
        document.querySelectorAll('.theme-card').forEach((c) => {
          if (c !== card && c.classList.contains('is-installed')) {
            window.ThemeCard.setApplied(c, false);
          }
        });

        // Set this card to Applied
        window.ThemeCard.setApplied(card, true);
      } catch (err) {
        showToast(`Failed to apply ${item.name}: ${err.message}`, 'warning');
      }
    };

    // Check if multiple variants (e.g. Standard vs Compact) exist
    try {
      if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.getThemeVariants) {
        const res = await window.electronAPI.system.getThemeVariants({
          name: item.name,
          id: item.id,
          category: item.category
        });
        if (res && res.success && Array.isArray(res.variants) && res.variants.length > 1) {
          window.ApplyVariantPicker.show({
            title: `Apply ${item.name}`,
            subtitle: `Select flavor (Standard or Compact) to set active`,
            variants: res.variants,
            onApply: (selectedId) => {
              applyDirectly(selectedId);
            }
          });
          return;
        }
      }
    } catch (_) {}

    const defaultTarget = (item.installed_folders && item.installed_folders[0]) || item.name;
    applyDirectly(defaultTarget);
    return;
  }

  if (AppState.activeInstalls.has(item.id)) {
    showToast(`Installation of ${item.name} is already in progress...`, 'warning');
    return;
  }

  // If item has variants, open variant picker
  if (item.variants && ((item.variants.color && item.variants.color.length > 0) || (item.variants.mode && item.variants.mode.length > 0))) {
    window.VariantPicker.open(item, (selectedVariant) => {
      performInstallation(item, card, selectedVariant);
    });
    return;
  }

  performInstallation(item, card, null);
}

// Initialize Event Listeners
function initEvents() {
  // Listen to IPC install:progress events
  if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on('install:progress', (data) => {
      if (!data || !data.id) return;
      const card = document.querySelector(`.theme-card[data-id="${data.id}"]`);
      if (card) {
        window.ThemeCard.setProgress(card, data.percent, data.stage, data.message, () => cancelInstallItem(data.id));
      }
    });
  }

  // Sidebar Category Buttons
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      if (cat) {
        loadCategory(cat);
      }
    });
  });

  // Subtabs
  tabInstalledBtn.addEventListener('click', () => {
    AppState.activeSubtab = 'installed';
    tabInstalledBtn.classList.add('active');
    tabBrowseBtn.classList.remove('active');
    updateView();
  });

  tabBrowseBtn.addEventListener('click', () => {
    AppState.activeSubtab = 'browse';
    tabBrowseBtn.classList.add('active');
    tabInstalledBtn.classList.remove('active');
    updateView();
  });

  // Search Input
  searchInputEl.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value;
    if (AppState.activeCategory === 'extensions') {
      window.ExtensionsView.setSearchQuery(e.target.value);
    } else if (AppState.activeCategory === 'uninstall') {
      // no-op or handled in view
    } else {
      updateView();
    }
  });

  // Footer Actions
  document.getElementById('btn-reset-default')?.addEventListener('click', () => {
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

  document.getElementById('btn-uninstall-mgr')?.addEventListener('click', () => {
    openUninstallManager();
  });
}

function openUninstallManager() {
  AppState.activeCategory = 'uninstall';
  pageTitleEl.textContent = 'Uninstall Manager';
  pageSubtitleEl.textContent = 'Manage, apply, or safely remove installed desktop themes';

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-uninstall-mgr')?.classList.add('active');
  document.querySelector('.subtabs-bar').style.display = 'none';
  emptyStateEl.classList.add('hidden');

  window.UninstallView.render(cardsGridEl);
}

window.refreshAppState = () => {
  if (AppState.activeCategory === 'uninstall') {
    window.UninstallView.loadItems();
  } else if (AppState.activeCategory === 'extensions') {
    window.ExtensionsView.loadExtensions();
  } else {
    loadCategory(AppState.activeCategory);
  }
};

// Startup
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  // Restore last active category from localStorage
  let startCategory = 'gtk-theme';
  try {
    const saved = localStorage.getItem('ts_last_category');
    if (saved) startCategory = saved;
  } catch (_) {}
  loadCategory(startCategory);
});
