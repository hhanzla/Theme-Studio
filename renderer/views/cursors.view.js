// Cursors View — category-specific config for the Cursor Themes tab

window.CursorsView = {
  category: 'cursor-theme',

  getEmptyText(subtab, query) {
    if (subtab === 'installed') {
      return {
        title: 'No Cursor Sets Installed',
        desc: query
          ? `No installed cursor sets match "${query}".`
          : 'Browse the catalog and install a cursor set to get started.'
      };
    }
    return {
      title: 'No Cursor Sets Found',
      desc: query ? `No cursor sets match "${query}".` : 'No cursor sets available in catalog.'
    };
  }
};
