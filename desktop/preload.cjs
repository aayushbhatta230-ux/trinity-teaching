// Exposes the few desktop actions the app needs (nothing else from Node/Electron).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trinityDesktop', {
  quit: () => ipcRenderer.send('trinity:quit'),
  toggleFullScreen: () => ipcRenderer.send('trinity:toggle-fullscreen'),
  // Opens an uploaded PowerPoint file, unchanged, in PowerPoint (or the default app).
  openPresentation: (name, data) => ipcRenderer.invoke('trinity:open-presentation', name, data),
  // Tells the updater the loaded version started correctly.
  appReady: () => ipcRenderer.send('trinity:app-ready'),
  updates: {
    shellVersion: () => ipcRenderer.invoke('trinity:shell-version'),
    check: () => ipcRenderer.invoke('trinity:check-updates'),
    apply: () => ipcRenderer.invoke('trinity:apply-update'),
    // Installs a newer version of the app itself (one click; the app restarts).
    installShell: () => ipcRenderer.invoke('trinity:install-shell'),
  },
});
