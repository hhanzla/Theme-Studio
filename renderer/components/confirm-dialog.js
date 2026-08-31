// renderer/components/confirm-dialog.js
// Modern Confirmation Dialog Component with Backdrop Blur and Enter Animation

window.ConfirmDialog = {
  show(options = {}) {
    this.close();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'confirm-dialog-modal';

    const itemsHtml = Array.isArray(options.items) && options.items.length > 0
      ? `<div class="flex flex-wrap gap-1.5 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
          ${options.items.map(it => `<span class="px-2 py-0.5 bg-white border border-zinc-200 rounded text-xs font-mono font-medium text-zinc-800">${it}</span>`).join('')}
        </div>`
      : '';

    const isDanger = options.confirmClass === 'btn-danger';

    overlay.innerHTML = `
      <div class="modal-dialog animate-modal-enter max-w-md">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${options.title || 'Required Packages'}</h3>
            <p class="modal-subtitle">${options.subtitle || 'Please confirm before proceeding'}</p>
          </div>
          <button class="modal-close-btn" id="confirm-close-btn">×</button>
        </div>

        <div class="modal-body">
          <p class="text-xs text-zinc-600 leading-relaxed">${options.message || 'The following packages or actions will be executed:'}</p>
          ${itemsHtml}
          <p class="text-[11px] text-zinc-400 italic">You may be prompted for system authorization (pkexec) to apply changes.</p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="dialog-cancel-btn">${options.cancelText || 'Cancel'}</button>
          <button class="btn ${isDanger ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}" id="dialog-confirm-btn">${options.confirmText || 'Confirm'}</button>
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
