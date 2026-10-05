// Trinity Teaching — Windows desktop app (Electron).
// Loads the same single-file app used in the Android build from app/index.html.
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;

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
    win.loadFile(path.join(__dirname, 'app', 'index.html'));

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

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
