// Wallpapers View — category-specific config + wallpaper-specific helpers

window.WallpapersView = {
  category: 'wallpaper',

  getEmptyText(subtab, query) {
    if (subtab === 'installed') {
      return {
        title: 'No Wallpapers Applied',
        desc: query
          ? `No wallpapers match "${query}".`
          : 'Set a wallpaper from the Browse tab.'
      };
    }
    return {
      title: 'No Wallpapers Found',
      desc: query ? `No wallpapers match "${query}".` : 'No wallpapers available in catalog.'
    };
  },

  /**
   * Returns clean base filename from a path/URI for matching currently-set wallpaper.
   * @param {string} p - file URI or path
   * @returns {string}
   */
  getCleanBase(p) {
    if (!p) return '';
    const decoded = decodeURIComponent(p.replace(/^file:\/\//, ''));
    const file = decoded.split('/').pop() || '';
    return file.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
};
