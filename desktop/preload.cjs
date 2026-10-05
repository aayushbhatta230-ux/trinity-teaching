// Exposes the few desktop actions the app needs (nothing else from Node/Electron).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trinityDesktop', {
  quit: () => ipcRenderer.send('trinity:quit'),
  toggleFullScreen: () => ipcRenderer.send('trinity:toggle-fullscreen'),
});
