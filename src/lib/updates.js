/**
 * In-app updates — no reinstalling.
 *
 * Everything the app does lives in one web bundle (index.html). The Windows and Android
 * apps are thin shells around it. An update downloads a newer bundle from the update
 * channel, checks its SHA-256, saves it inside the app's own storage and switches to it.
 * Uploaded presentations are untouched.
 *
 * Update channel (published with scripts/publish-update.ps1):
 *   update.json  { version, file, sha256, size, minShell, notes, publishedAt }
 *   app.html     the bundle
 * `minShell` is the oldest installed app version that can run the bundle; older apps are
 * told a full install is needed instead (rare: only when the Windows/Android shell changes).
 */
import { useEffect, useState } from 'react';
import { Capacitor, CapacitorHttp, WebView } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { desktopApp, isNativeApp, Board } from './native.js';
import SHELL_RELEASE from '../../shell-release.json';

export const UPDATE_BASE = 'https://github.com/aayushbhatta230-ux/trinity-teaching-app/releases/download/live/';
export const WEB_VERSION = __APP_VERSION__;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const PENDING_KEY = 'trinity-update-pending';

/** Compare "1.2.10" with "1.2.9" → 1, 0 or -1. */
export function compareVersions(a = '0', b = '0') {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

async function sha256Hex(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Base64 (as returned by native HTTP for binary responses) → bytes. */
export function base64ToBytes(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const storage = {
  get: () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; } },
  set: (v) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ } },
};

// ---------- Android: download with native HTTP, store in app data, point the WebView at it ----------

const android = {
  async shellVersion() { return (await NativeApp.getInfo()).version; },

  async check() {
    const shell = await this.shellVersion();
    const res = await CapacitorHttp.get({ url: `${UPDATE_BASE}update.json?t=${Date.now()}`, responseType: 'json' });
    if (res.status !== 200) throw new Error(`Update server returned ${res.status}`);
    const m = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (compareVersions(m.version, WEB_VERSION) <= 0) return { state: 'current' };
    if (compareVersions(shell, m.minShell) < 0) return { state: 'needs-install', version: m.version };

    const pending = storage.get();
    if (pending?.version === m.version) return { state: 'ready', version: m.version, notes: m.notes };

    // Download the exact bytes. (As "text", Android's native HTTP re-reads the file line by line,
    // which changes line endings and the last newline, so the checksum could never match.)
    const file = await CapacitorHttp.get({ url: `${UPDATE_BASE}${m.file}?t=${Date.now()}`, responseType: 'arraybuffer', connectTimeout: 30000, readTimeout: 120000 });
    if (file.status !== 200 || typeof file.data !== 'string') throw new Error(`Download failed (${file.status})`);
    const bytes = base64ToBytes(file.data);
    if (m.size && bytes.length !== m.size) throw new Error(`Download incomplete (${bytes.length} of ${m.size} bytes)`);
    if ((await sha256Hex(bytes)) !== m.sha256) throw new Error('Downloaded update failed its integrity check');

    // Saved byte for byte: data without an encoding is written as base64.
    const path = `web-updates/${m.version}/index.html`;
    await Filesystem.writeFile({ path, data: file.data.replace(/\s+/g, ''), directory: Directory.Data, recursive: true });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
    const dir = decodeURIComponent(uri.replace(/^file:\/\//, '')).replace(/\/index\.html$/, '');
    storage.set({ version: m.version, dir, notes: m.notes });
    return { state: 'ready', version: m.version, notes: m.notes };
  },

  async apply() {
    const pending = storage.get();
    if (!pending) return;
    storage.clear();
    await WebView.setServerBasePath({ path: pending.dir }); // reloads into the new version
    await WebView.persistServerBasePath();                 // and keeps it after restarts
  },
};

// ---------- Windows: the Electron main process downloads and switches (desktop/updater.cjs) ----------

const desktop = {
  shellVersion: () => desktopApp.updates.shellVersion(),
  check: () => desktopApp.updates.check(),
  apply: () => desktopApp.updates.apply(),
};

const platform = desktopApp?.updates ? desktop : isNativeApp && Capacitor.getPlatform() === 'android' ? android : null;
export const updatesSupported = !!platform;

/**
 * Hook for the Home screen. Checks on start and every few hours, downloads in the
 * background, and exposes { state, version, notes, check, apply }.
 * states: idle | checking | current | ready | needs-install | offline | error
 */
let shared = { state: 'idle' };
const listeners = new Set();
const publish = (s) => { shared = s; listeners.forEach((l) => l(s)); };

export async function checkForUpdates() {
  if (!platform || shared.state === 'checking') return shared;
  publish({ ...shared, state: 'checking' });
  try {
    const r = await platform.check();
    publish({ ...r, checkedAt: Date.now() });
  } catch (e) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    publish({ state: offline ? 'offline' : 'error', message: String(e?.message || e), checkedAt: Date.now() });
  }
  return shared;
}

export const applyUpdate = () => platform?.apply();

// ---------- updating the app itself (Windows setup / Android APK) ----------
//
// Most updates only replace the web bundle (above). When the installed app itself is older
// than the latest published app (shell-release.json), the Home screen offers "Update app".
// From app 1.7.0 the app installs the new version itself: Windows runs the setup silently and
// restarts; Android downloads the APK and opens Android's own "Update" confirmation.
// Older apps cannot do that, so they are sent to the download instead.

export const LATEST_APP = SHELL_RELEASE.version;
export const APP_DOWNLOAD = {
  windows: 'https://github.com/aayushbhatta230-ux/trinity-teaching-app/releases/latest/download/TrinityTeaching-Setup.exe',
  android: 'https://github.com/aayushbhatta230-ux/trinity-teaching-app/releases/latest/download/TrinityTeaching.apk',
  page: 'github.com/aayushbhatta230-ux/trinity-teaching-app',
};
const SELF_INSTALL_FROM = '1.7.0'; // first app version that can install its own updates

/** { available, version, oneClick } for the installed app, or null where not applicable. */
export async function appUpdateInfo() {
  if (!platform) return null;
  const shell = await platform.shellVersion().catch(() => null);
  if (!shell || compareVersions(LATEST_APP, shell) <= 0) return { available: false };
  const oneClick = platform === desktop ? !!desktopApp.updates.installShell : compareVersions(shell, SELF_INSTALL_FROM) >= 0;
  return { available: true, version: LATEST_APP, oneClick, installed: shell };
}

/**
 * Installs the latest app. Resolves to { state, message }:
 *   installing  the app is updating itself (Windows closes and reopens; Android shows its dialog)
 *   permission  Android: allow "Install unknown apps" for Trinity Teaching, then tap again
 *   browser     Android (older app): the download opened in the board's browser
 *   manual      Windows (older app): install from the download page once
 */
export async function installAppUpdate() {
  const info = await appUpdateInfo();
  if (!info?.available) return { state: 'current' };
  if (platform === desktop) {
    if (info.oneClick) {
      await desktopApp.updates.installShell();
      return { state: 'installing', message: 'Installing the update… Trinity Teaching closes and opens again by itself.' };
    }
    return { state: 'manual', message: `This computer has an older Trinity Teaching (${info.installed}) that cannot update itself. Install the new one once: open ${APP_DOWNLOAD.page} in a web browser and choose Download for Windows. After that, every update is one click.` };
  }
  if (info.oneClick) {
    const r = await Board.installApp();
    if (r?.state === 'permission') return { state: 'permission', message: 'Turn on "Allow from this source" for Trinity Teaching, come back, then tap Update app again. This is needed only once.' };
    if (r?.state === 'installing') return { state: 'installing', message: 'Tap Update (or Install) in the Android window to finish.' };
    return { state: 'current' };
  }
  // Apps before 1.7.0: the board's browser downloads the new app (links outside the app open there).
  window.location.href = APP_DOWNLOAD.android;
  return { state: 'browser', message: 'The new app is downloading in the browser. When it finishes, open it and tap Install. After that, every update is one tap.' };
}

if (platform) {
  // A downloaded update that was not applied yet is applied at the next start of the app,
  // before anyone starts teaching (Android only; Windows switches bundles at launch itself).
  const pending = platform === android ? storage.get() : null;
  if (pending && compareVersions(pending.version, WEB_VERSION) > 0) {
    android.apply();
  } else {
    if (pending) storage.clear();
    setTimeout(checkForUpdates, 8000);
    setInterval(checkForUpdates, CHECK_EVERY_MS);
  }
}

export function useUpdates() {
  const [s, setS] = useState(shared);
  useEffect(() => { listeners.add(setS); return () => listeners.delete(setS); }, []);
  return { ...s, supported: updatesSupported, check: checkForUpdates, apply: applyUpdate };
}
