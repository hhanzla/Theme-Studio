// Confirm Dialog Component for Dependency Installation & Actions
window.ConfirmDialog = {
  /**
   * Shows a confirmation dialog for missing dependencies or critical actions
   * @param {object} options - { title, message, items: string[], confirmText, onConfirm, onCancel }
   */
  show(options = {}) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'confirm-dialog-modal';

    const itemsHtml = Array.isArray(options.items) && options.items.length > 0
      ? `<div class="dialog-items-list">
          ${options.items.map(it => `<div class="dialog-item-chip">${it}</div>`).join('')}
        </div>`
      : '';

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${options.title || 'Required Packages'}</h3>
            <p class="modal-subtitle">${options.subtitle || 'System packages need to be installed'}</p>
          </div>
          <button class="modal-close-btn" id="confirm-close-btn">×</button>
        </div>

        <div class="modal-body">
          <p class="modal-text">${options.message || 'The following packages are required for this theme to build and install:'}</p>
          ${itemsHtml}
          <p class="modal-subtext">You may be prompted for authorization (pkexec) to install them via apt.</p>
        </div>

        <div class="modal-footer">
          <button class="modal-btn btn-secondary" id="dialog-cancel-btn">${options.cancelText || 'Cancel'}</button>
          <button class="modal-btn btn-primary" id="dialog-confirm-btn">${options.confirmText || 'Install Packages'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      this.close();
      if (typeof options.onCancel === 'function') options.onCancel();
    };

    overlay.querySelector('#confirm-close-btn').addEventListener('click', close);
    overlay.querySelector('#dialog-cancel-btn').addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#dialog-confirm-btn').addEventListener('click', () => {
      this.close();
      if (typeof options.onConfirm === 'function') {
        options.onConfirm();
      }
    });
  },

  close() {
    const existing = document.getElementById('confirm-dialog-modal');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }
};
