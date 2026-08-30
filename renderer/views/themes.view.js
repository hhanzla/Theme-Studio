// GTK Themes View — delegates to shared CatalogView renderer
// renderer.js ka updateView() + loadCategory() already handle karta hai generic catalog rendering.
// Yeh file category-specific overrides aur helpers rakhti hai.

window.ThemesView = {
  category: 'gtk-theme',

  getEmptyText(subtab, query) {
    if (subtab === 'installed') {
      return {
        title: 'No GTK Themes Installed',
        desc: query
          ? `No installed themes match "${query}".`
          : 'Browse the catalog and install a GTK theme to get started.'
      };
    }
    return {
      title: 'No Themes Found',
      desc: query ? `No themes match "${query}".` : 'No GTK themes available in catalog.'
    };
  }
};
