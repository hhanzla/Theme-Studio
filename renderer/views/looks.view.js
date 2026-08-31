// renderer/views/looks.view.js
// Modern Looks & Presets View for Theme Studio

window.LooksView = {
  category: 'looks',

  getEmptyText(subtab, query) {
    if (subtab === 'installed') {
      return {
        title: 'No Looks Applied Yet',
        desc: query
          ? `No applied looks match "${query}".`
          : 'Browse available looks and apply one to style your full desktop.'
      };
    }
    return {
      title: 'No Looks Available',
      desc: query
        ? `No looks match "${query}".`
        : 'Add look presets to sources/looks.json to get started.'
    };
  },

  /**
   * Renders a full-width hero banner at the top of the looks grid
   */
  renderBanner(gridEl) {
    if (!gridEl) return;
    if (gridEl.querySelector('.looks-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'looks-banner col-span-full p-4 bg-gradient-to-r from-orange-50/80 via-amber-50/60 to-white border border-orange-200/80 rounded-xl flex items-center gap-4 shadow-sm mb-2';

    banner.innerHTML = `
      <div class="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-zinc-900 leading-snug">Full Desktop Presets &amp; Aesthetic Looks</h3>
        <p class="text-xs text-zinc-600 mt-0.5 leading-relaxed">
          Looks configure and synchronize your GTK theme, Shell theme, Icon pack, Cursor set, and wallpaper all together in 1 click.
        </p>
      </div>
    `;

    gridEl.insertBefore(banner, gridEl.firstChild);
  }
};
