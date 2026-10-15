// Presents an uploaded PowerPoint chapter from its ORIGINAL bytes, unchanged:
// Microsoft PowerPoint straight into the slide show when it is installed, otherwise the
// computer's default app for PowerPoint files (WPS Office, LibreOffice …).
const { app, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

const NAME = /^[A-Za-z0-9._-]{1,120}$/;

function regDefault(key) {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', key, '/ve'], { windowsHide: true }, (err, out) => {
      if (err) return resolve(null);
      const m = String(out).match(/REG_(?:EXPAND_)?SZ\s+(.+)/);
      resolve(m ? m[1].trim().replace(/^"|"$/g, '').replace(/%([^%]+)%/g, (_, v) => process.env[v] || '') : null);
    });
  });
}

/** Full path of POWERPNT.EXE, or null when PowerPoint is not installed. */
async function findPowerPoint() {
  for (const root of ['HKCU', 'HKLM', 'HKLM\\SOFTWARE\\WOW6432Node']) {
    const base = root === 'HKLM\\SOFTWARE\\WOW6432Node' ? root : `${root}\\SOFTWARE`;
    const exe = await regDefault(`${base}\\Microsoft\\Windows\\CurrentVersion\\App Paths\\POWERPNT.EXE`);
    if (exe && fs.existsSync(exe)) return exe;
  }
  return null;
}

/**
 * name: "<presentation id>.pptx"; data: the file's bytes (ArrayBuffer).
 * Resolves to { ok: true, app } or { ok: false, reason: 'no-app' | 'error', message }.
 */
async function openPresentation(name, data) {
  if (typeof name !== 'string' || !NAME.test(name) || name.startsWith('.')) return { ok: false, reason: 'error', message: 'Bad file name.' };
  const bytes = Buffer.from(data);
  const dir = path.join(app.getPath('userData'), 'present');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);

  // Keep only the presentation being shown (a file still open in PowerPoint is simply left).
  for (const other of fs.readdirSync(dir)) {
    if (other !== name) { try { fs.unlinkSync(path.join(dir, other)); } catch { /* in use */ } }
  }
  const same = fs.existsSync(file) && fs.statSync(file).size === bytes.length;
  if (!same) {
    try { fs.writeFileSync(file, bytes); } catch (e) {
      return { ok: false, reason: 'error', message: 'Close the presentation in PowerPoint, then tap Start presentation again.' };
    }
  }

  const powerpoint = await findPowerPoint();
  if (powerpoint) {
    const child = spawn(powerpoint, ['/S', file], { detached: true, stdio: 'ignore', windowsHide: false });
    child.on('error', () => {});
    child.unref();
    return { ok: true, app: 'PowerPoint' };
  }
  const err = await shell.openPath(file);
  if (!err) return { ok: true };
  return /associat|no application/i.test(err)
    ? { ok: false, reason: 'no-app' }
    : { ok: false, reason: 'error', message: `The presentation could not be opened (${err}).` };
}

module.exports = { openPresentation, findPowerPoint };
