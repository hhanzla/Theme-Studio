// renderer/components/toast.js
// Modern Floating Toast Notification System

window.Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
    return this._container;
  },

  /**
   * Shows a toast notification with modern Tailwind pill styling and animation
   */
  show(message, type = 'info', duration = 3000) {
    const container = this._getContainer();
    if (!container) return;

    const toast = document.createElement('div');
    
    let bgClass = 'bg-zinc-900 text-white';
    let iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    if (type === 'success') {
      bgClass = 'bg-emerald-700 text-white';
      iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'warning') {
      bgClass = 'bg-amber-600 text-white';
      iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else if (type === 'error') {
      bgClass = 'bg-red-700 text-white';
      iconSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }

    toast.className = `animate-toast-slide flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold select-none ${bgClass} transition-all duration-200`;
    toast.innerHTML = `
      <span class="shrink-0 opacity-90">${iconSvg}</span>
      <span class="leading-snug">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
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

function showToast(message, type = 'info', duration = 3000) {
  window.Toast.show(message, type, duration);
}
