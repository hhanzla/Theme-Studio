// Icons View — category-specific config for the Icon Themes tab

window.IconsView = {
  category: 'icon-theme',

  getEmptyText(subtab, query) {
    if (subtab === 'installed') {
      return {
        title: 'No Icon Packs Installed',
        desc: query
          ? `No installed icon packs match "${query}".`
          : 'Browse the catalog and install an icon pack to get started.'
      };
    }
    return {
      title: 'No Icon Packs Found',
      desc: query ? `No icon packs match "${query}".` : 'No icon packs available in catalog.'
    };
  }
};
