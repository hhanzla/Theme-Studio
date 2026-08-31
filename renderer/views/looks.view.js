// Looks & Presets View for Theme Studio
// Handles the 'looks' category — full desktop preset cards that apply
// GTK theme + icons + cursors + wallpaper in one click.

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
   * Renders a full-width banner at the top of the looks grid explaining what Looks are.
   * Called by renderer.js after rendering the grid.
   * @param {HTMLElement} gridEl
   */
  renderBanner(gridEl) {
    if (!gridEl) return;

    // Avoid duplicate banners
    if (gridEl.querySelector('.looks-banner')) return;

    const banner = document.createElement('div');
    banner.className = 'looks-banner';
    banner.style.cssText = `
      grid-column: 1 / -1;
      background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: var(--radius);
      padding: 14px 18px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 14px;
    `;

    banner.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="rgba(99,102,241,0.8)" stroke-width="1.8" flex-shrink="0" style="flex-shrink:0;">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
      <div>
        <strong style="font-size:13px; color: var(--text-primary, #1e293b);">Full Desktop Presets</strong>
        <p style="margin:2px 0 0; font-size:12px; color: var(--text-secondary, #64748b); line-height:1.4;">
          Looks apply a curated GTK theme, icon pack, cursor set, and wallpaper all at once — one click, full transformation.
        </p>
      </div>
    `;

    gridEl.insertBefore(banner, gridEl.firstChild);
  }
};
