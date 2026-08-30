// Progress Bar Component for Theme Studio
// Used inside card footers during install/download operations
window.ProgressBar = {
  /**
   * Injects an inline progress bar into a card footer button.
   * Delegates to ThemeCard.setProgress for full card state management.
   *
   * @param {HTMLElement} card - The .theme-card element
   * @param {number} percent - 0-100
   * @param {string} stage - 'downloading' | 'extracting' | 'cloning_repo' | 'running_script' |
   *                         'applying' | 'applying_fixes' | 'completed' | 'cancelled' | 'error'
   * @param {string} [message] - Optional status text override
   * @param {function} [onCancel] - Optional cancel callback
   */
  update(card, percent, stage, message, onCancel) {
    if (!card || !window.ThemeCard) return;
    window.ThemeCard.setProgress(card, percent, stage, message, onCancel);
  },

  /**
   * Renders a standalone horizontal progress bar element (not inside a card).
   * Returns the <div> element — caller appends it wherever needed.
   *
   * @param {number} percent - 0-100
   * @param {string} [label] - Text shown above bar
   * @returns {HTMLElement}
   */
  create(percent = 0, label = '') {
    const wrap = document.createElement('div');
    wrap.className = 'progress-bar-wrap';

    if (label) {
      const lbl = document.createElement('span');
      lbl.className = 'progress-bar-label';
      lbl.textContent = label;
      wrap.appendChild(lbl);
    }

    const track = document.createElement('div');
    track.className = 'progress-bar-track';

    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill';
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;

    track.appendChild(fill);
    wrap.appendChild(track);

    // Expose an update method on the element itself for convenience
    wrap.setPercent = (p) => {
      fill.style.width = `${Math.min(100, Math.max(0, p))}%`;
    };

    return wrap;
  }
};
