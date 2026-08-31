const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  catalog: {
    list: (payload) => ipcRenderer.invoke('catalog:list', payload),
    refresh: (payload) => ipcRenderer.invoke('catalog:refresh', payload)
  },
  installer: {
    start: (payload) => ipcRenderer.invoke('install:start', payload),
    cancel: (payload) => ipcRenderer.invoke('install:cancel', payload)
  },
  deps: {
    check: (payload) => ipcRenderer.invoke('deps:check', payload),
    install: (payload) => ipcRenderer.invoke('deps:install', payload)
  },
  uninstall: {
    list: () => ipcRenderer.invoke('uninstall:list'),
    remove: (payload) => ipcRenderer.invoke('uninstall:remove', payload),
    batchRemove: (payload) => ipcRenderer.invoke('uninstall:batch-remove', payload),
    getCacheSize: () => ipcRenderer.invoke('uninstall:get-cache-size'),
    clearCache: () => ipcRenderer.invoke('system:clear-cache')
  },
  system: {
    resetDefault: () => ipcRenderer.invoke('reset:default'),
    applyGtk: (name) => ipcRenderer.invoke('apply:gtk', name),
    applyShell: (name) => ipcRenderer.invoke('apply:shell', name),
    applyIcons: (name) => ipcRenderer.invoke('apply:icons', name),
    applyCursors: (name) => ipcRenderer.invoke('apply:cursors', name),
    applyWallpaper: (path) => ipcRenderer.invoke('apply:wallpaper', path),
    getThemeVariants: (payload) => ipcRenderer.invoke('system:theme-variants:get', payload),
    current: () => ipcRenderer.invoke('system:current')
  },
  extensions: {
    list: () => ipcRenderer.invoke('system:extensions:list'),
    search: (payload) => ipcRenderer.invoke('system:extensions:search', payload),
    installOnline: (payload) => ipcRenderer.invoke('system:extensions:install-online', payload),
    uninstall: (uuid) => ipcRenderer.invoke('system:extensions:uninstall', uuid),
    openPrefs: (uuid) => ipcRenderer.invoke('system:extensions:prefs', uuid),
    enable: (uuid) => ipcRenderer.invoke('system:extensions:enable', uuid),
    disable: (uuid) => ipcRenderer.invoke('system:extensions:disable', uuid)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (payload) => ipcRenderer.invoke('settings:set', payload),
    openPath: (targetPath) => ipcRenderer.invoke('system:open-path', targetPath),
    clearCache: () => ipcRenderer.invoke('system:clear-cache')
  },
  looks: {
    apply: (payload) => ipcRenderer.invoke('look:apply', payload),
    setWallpaper: (path) => ipcRenderer.invoke('apply:wallpaper', path)
  },
  tweaks: {
    getAppFolders: () => ipcRenderer.invoke('tweaks:get-app-folders'),
    organizeAppFolders: (payload) => ipcRenderer.invoke('tweaks:organize-app-folders', payload),
    resetAppFolders: () => ipcRenderer.invoke('tweaks:reset-app-folders')
  },
  gdm: {
    copyAsset: (payload) => ipcRenderer.invoke('gdm:copyAsset', payload),
    status: () => ipcRenderer.invoke('gdm:status'),
    enableExtension: () => ipcRenderer.invoke('gdm:enableExtension'),
    setShellTheme: (payload) => ipcRenderer.invoke('gdm:setShellTheme', payload),
    setBackground: (payload) => ipcRenderer.invoke('gdm:setBackground', payload),
    resetDefault: () => ipcRenderer.invoke('gdm:resetDefault')
  },
  on: (channel, callback) => {
    const validChannels = ['install:progress', 'install:done', 'install:error'];
    if (validChannels.includes(channel)) {
      const subscription = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  }
});
