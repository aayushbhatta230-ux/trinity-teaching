// Trinity Teaching — Windows desktop app (Electron).
// Loads the same single-file app used in the Android build: app/index.html, or a newer
// verified bundle downloaded by the in-app updater (see updater.cjs).
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
// Test hook: keep app data in a separate folder (never set in normal use).
if (process.env.TRINITY_USER_DATA) app.setPath('userData', process.env.TRINITY_USER_DATA);
const { createUpdater } = require('./updater.cjs');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  const updater = createUpdater(() => win);

  const createWindow = () => {
    win = new BrowserWindow({
      width: 1600,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      fullscreen: true,
      show: false,
      title: 'Trinity Teaching',
      backgroundColor: '#FFF9F1',
      icon: path.join(__dirname, 'build', 'icon.png'),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
      },
    });
    Menu.setApplicationMenu(null);
    win.once('ready-to-show', () => win.show());
    updater.start();

    // Stay inside the app: no external pages, no pop-up windows.
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith('file://')) e.preventDefault();
    });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // F11 toggles full screen (the app starts full screen).
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') {
        win.setFullScreen(!win.isFullScreen());
        e.preventDefault();
      }
    });
  };

  ipcMain.on('trinity:quit', () => app.quit());
  ipcMain.on('trinity:toggle-fullscreen', () => win && win.setFullScreen(!win.isFullScreen()));
  ipcMain.on('trinity:app-ready', () => updater.ready());
  ipcMain.handle('trinity:shell-version', () => app.getVersion());
  ipcMain.handle('trinity:check-updates', () => updater.check());
  ipcMain.handle('trinity:apply-update', () => updater.apply());

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
