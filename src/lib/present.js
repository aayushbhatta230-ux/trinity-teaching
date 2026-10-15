/**
 * Presents an uploaded PowerPoint chapter in the device's own presentation app, using the
 * ORIGINAL file exactly as uploaded (byte for byte): PowerPoint on Windows (straight into the
 * slide show), and the board's office app on Android (WPS Office, Microsoft PowerPoint …).
 * That app plays every picture, font, animation and transition as the teacher made them.
 */
import { Board, desktopApp } from './native.js';
import { powerPointMime } from './pptx.js';

const CHUNK = 768 * 1024; // bytes per transfer to the Android app

const userError = (message, code) => Object.assign(new Error(message), { forUser: true, code });

/** A file name the device can use: the presentation id plus the original extension. */
const deviceName = (rec) => `${rec.id}.${(rec.fileName || 'x.pptx').toLowerCase().split('.').pop().replace(/[^a-z0-9]/g, '') || 'pptx'}`;

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(',') + 1));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

/**
 * 'yes': this app can present PowerPoint files.
 * 'old-app': an older installed app (before 1.7.0) without presenting; install the latest app once.
 * 'browser': a plain browser (development), which cannot start other apps.
 * Android shells are checked when presenting (their Board plugin may lack the file methods).
 */
export function presentSupport() {
  if (desktopApp) return desktopApp.openPresentation ? 'yes' : 'old-app';
  return Board ? 'yes' : 'browser';
}
export const OLD_APP_MESSAGE = 'Install the latest Trinity Teaching app on this device once to present PowerPoint files. After that, presentations open in PowerPoint with all their animations and transitions.';

/**
 * Opens rec.file (a Blob) in the presentation app. `onProgress(fraction)` reports copying.
 * Resolves to { app } with the app's name when known. Rejects with a teacher-friendly message.
 */
export async function presentOriginal(rec, onProgress = () => {}) {
  const name = deviceName(rec);
  const mime = powerPointMime(rec.fileName);

  if (desktopApp && !desktopApp.openPresentation) throw userError(OLD_APP_MESSAGE, 'old-app');
  if (desktopApp?.openPresentation) {
    onProgress(0.2);
    const r = await desktopApp.openPresentation(name, await rec.file.arrayBuffer());
    onProgress(1);
    if (r?.ok) return { app: r.app };
    if (r?.reason === 'no-app') throw userError('No presentation app is installed on this computer. Install Microsoft PowerPoint (or WPS Office), then tap Start presentation again.', 'no-app');
    throw userError(r?.message || 'The presentation could not be opened.');
  }

  if (Board) {
    try {
      // Copy once per presentation; later opens reuse the same copy.
      const info = await Board.fileInfo({ name }).catch(() => ({ exists: false }));
      if (!info.exists || info.size !== rec.file.size) {
        await Board.fileStart({ name });
        for (let at = 0; at < rec.file.size; at += CHUNK) {
          await Board.fileAppend({ name, data: await toBase64(rec.file.slice(at, at + CHUNK)) });
          onProgress(Math.min(1, (at + CHUNK) / rec.file.size));
        }
      }
      onProgress(1);
      const r = await Board.fileOpen({ name, mime });
      return { app: r?.app };
    } catch (e) {
      const msg = String(e?.message || e);
      if (/not implemented|is not a function|unimplemented/i.test(msg)) {
        throw userError(OLD_APP_MESSAGE, 'old-app');
      }
      if (/NO_APP/i.test(e?.code || msg)) {
        throw userError('No app on this board can show PowerPoint files. Install WPS Office or Microsoft PowerPoint from the board’s app store, then tap Start presentation again.', 'no-app');
      }
      throw userError('The presentation could not be opened on this board. Try again.');
    }
  }

  throw userError('PowerPoint chapters are presented in the Trinity Teaching app on the board or the school computer.', 'browser');
}
