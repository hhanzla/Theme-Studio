// Toast Notification Component for Theme Studio
window.Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
    return this._container;
  },

  /**
   * Shows a toast notification
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} type
   * @param {number} duration - ms before auto-dismiss
   */
  show(message, type = 'info', duration = 3000) {
    const container = this._getContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Trigger dismiss after duration
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
  },

  info(message, duration) { this.show(message, 'info', duration); },
  success(message, duration) { this.show(message, 'success', duration); },
  warning(message, duration) { this.show(message, 'warning', duration); },
  error(message, duration) { this.show(message, 'error', duration); }
};

// Global shim so all existing showToast() calls still work
function showToast(message, type = 'info', duration = 3000) {
  window.Toast.show(message, type, duration);
}
