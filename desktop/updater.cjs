// In-app updates for the Windows app: downloads a newer web bundle (app.html) from the update
// channel, verifies its SHA-256, stores it in the user's app-data folder and loads it.
// No installer runs, so there is no setup wizard, no admin prompt and no SmartScreen.
const { app, net } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// TRINITY_UPDATE_BASE overrides the channel (used for testing against a local server).
const UPDATE_BASE = process.env.TRINITY_UPDATE_BASE || require('./package.json').updateBase;
const BUNDLED = path.join(__dirname, 'app', 'index.html');
const READY_TIMEOUT_MS = 20000;

const dir = () => path.join(app.getPath('userData'), 'web-updates');
const stateFile = () => path.join(dir(), 'state.json');

function compareVersions(a = '0', b = '0') {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return { bad: [] }; }
}
function writeState(s) {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify(s, null, 2));
}

/** The bundle to load at launch: the newest verified download, else the one shipped with the app. */
function activeBundle() {
  const s = readState();
  const a = s.active;
  if (a && compareVersions(a.version, app.getVersion()) > 0 && !(s.bad || []).includes(a.version) && fs.existsSync(a.file)) {
    return { file: a.file, version: a.version, downloaded: true };
  }
  return { file: BUNDLED, version: app.getVersion(), downloaded: false };
}

async function fetchOk(url) {
  const res = await net.fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Update server returned ${res.status}`);
  return res;
}

function createUpdater(getWindow) {
  let loaded = activeBundle();
  let readyTimer = null;
  let checking = null;

  const load = (bundle) => {
    loaded = bundle;
    const win = getWindow();
    win.loadFile(bundle.file);
    clearTimeout(readyTimer);
    if (bundle.downloaded) {
      // If a downloaded bundle does not start, go back to the built-in one and never retry it.
      readyTimer = setTimeout(() => {
        const s = readState();
        s.bad = [...new Set([...(s.bad || []), bundle.version])];
        delete s.active;
        writeState(s);
        load({ file: BUNDLED, version: app.getVersion(), downloaded: false });
      }, READY_TIMEOUT_MS);
    }
  };

  async function check() {
    if (checking) return checking;
    checking = (async () => {
      const m = await (await fetchOk(`${UPDATE_BASE}update.json`)).json();
      const s = readState();
      if (compareVersions(m.version, loaded.version) <= 0 || (s.bad || []).includes(m.version)) return { state: 'current' };
      if (compareVersions(app.getVersion(), m.minShell) < 0) return { state: 'needs-install', version: m.version };
      if (s.active?.version === m.version && fs.existsSync(s.active.file)) return { state: 'ready', version: m.version, notes: m.notes };

      const buf = Buffer.from(await (await fetchOk(`${UPDATE_BASE}${m.file}`)).arrayBuffer());
      const sha = crypto.createHash('sha256').update(buf).digest('hex');
      if (sha !== m.sha256) throw new Error('Downloaded update failed its integrity check');

      const folder = path.join(dir(), m.version);
      fs.mkdirSync(folder, { recursive: true });
      const file = path.join(folder, 'index.html');
      fs.writeFileSync(file, buf);
      // From now on the app starts with this version, even if nobody presses "Restart".
      writeState({ ...s, active: { version: m.version, file } });
      return { state: 'ready', version: m.version, notes: m.notes };
    })().finally(() => { checking = null; });
    return checking;
  }

  function apply() {
    const next = activeBundle();
    if (next.file !== loaded.file) load(next);
  }

  return {
    start: () => load(loaded),
    ready: () => clearTimeout(readyTimer),
    check,
    apply,
    webVersion: () => loaded.version,
  };
}

module.exports = { createUpdater };
