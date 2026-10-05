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
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { desktopApp, isNativeApp } from './native.js';

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

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

    const file = await CapacitorHttp.get({ url: `${UPDATE_BASE}${m.file}?t=${Date.now()}`, responseType: 'text' });
    if (file.status !== 200 || typeof file.data !== 'string') throw new Error('Download failed');
    if ((await sha256Hex(file.data)) !== m.sha256) throw new Error('Downloaded update failed its integrity check');

    const path = `web-updates/${m.version}/index.html`;
    await Filesystem.writeFile({ path, data: file.data, directory: Directory.Data, encoding: Encoding.UTF8, recursive: true });
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
