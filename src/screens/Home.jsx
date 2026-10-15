import Logo, { Mark } from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { useEffect, useRef, useState } from 'react';
import AiSetupDialog from '../components/AiSetupDialog.jsx';
import { Clock, useFitToHeight } from '../components/Chrome.jsx';
import { Arcs, Ribbon } from '../components/Decor.jsx';
import { INSTITUTION } from '../data/institution.js';
import { desktopApp, isNativeApp, exitApp } from '../lib/native.js';
import { useUpdates, WEB_VERSION, appUpdateInfo, installAppUpdate } from '../lib/updates.js';
import { useBackHandler } from '../lib/native.js';

// The installed apps (Windows and Android) get an Exit button; a browser tab does not.
const canExit = !!desktopApp || isNativeApp;
// Called with no arguments: the desktop bridge cannot pass a click event across.
const quit = () => (desktopApp ? desktopApp.quit() : exitApp());

const STATUS = {
  checking: 'Checking for updates…',
  current: 'Up to date',
  offline: 'No internet — will check again later',
  error: 'Could not check for updates',
};

function UpdateStatus() {
  const u = useUpdates();
  if (!u.supported) return null;
  return (
    <div className="home-version">
      <span>Version {WEB_VERSION}</span>
      {u.state === 'needs-install' ? (
        <span className="home-version-note">Version {u.version} needs a new install of the app</span>
      ) : u.state !== 'ready' && (
        <button className="btn-link" onClick={() => u.check()} disabled={u.state === 'checking'} title={u.message || ''}>
          {u.state === 'error'
            ? `Update failed: ${String(u.message || 'unknown error').slice(0, 70)} · Try again`
            : STATUS[u.state] ?? 'Check for updates'}
        </button>
      )}
    </div>
  );
}

function UpdateReady() {
  const u = useUpdates();
  if (u.state !== 'ready') return null;
  return (
    <button className="btn-update" onClick={() => u.apply()}>
      <Icon name="download" size={34} stroke={2} />
      <span>Update {u.version} ready — Restart now</span>
    </button>
  );
}

/**
 * "Update app": the installed Windows/Android app itself is older than the latest one.
 * One click from app 1.7.0 on; older apps are guided to the download once.
 */
function AppUpdate() {
  const u = useUpdates();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  useEffect(() => { appUpdateInfo().then(setInfo).catch(() => {}); }, [u.checkedAt]);
  useBackHandler(!!note, () => setNote(null));
  if (!info?.available) return null;
  const run = async () => {
    setBusy(true);
    try {
      const r = await installAppUpdate();
      if (r.message) setNote(r);
    } catch (e) {
      setNote({ state: 'error', message: `The update could not be installed: ${String(e?.message || e).slice(0, 120)}. Check the internet connection and try again.` });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className="btn-update" onClick={run} disabled={busy}>
        <Icon name="download" size={34} stroke={2} />
        <span>{busy ? 'Downloading the update…' : `Update app to ${info.version}`}</span>
      </button>
      {note && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
          <div className="dialog dialog-sm">
            <div className="dialog-body confirm-body">
              <Icon name={note.state === 'error' ? 'alert' : 'download'} size={72} />
              <h2 id="app-update-title">{note.state === 'error' ? 'Update not installed' : `Updating to ${info.version}`}</h2>
              <p>{note.message}</p>
            </div>
            <div className="dialog-foot"><button className="btn-primary" onClick={() => setNote(null)}>OK</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/** Press and hold for 3 seconds (teachers will not open it by accident). */
function useLongPress(onLong, ms = 3000) {
  const timer = useRef(null);
  const stop = () => clearTimeout(timer.current);
  return {
    onPointerDown: () => { stop(); timer.current = setTimeout(onLong, ms); },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e) => e.preventDefault(),
  };
}

export default function Home({ onStart }) {
  const [setup, setSetup] = useState(false);
  const hold = useLongPress(() => setSetup(true));
  // Never let the Start button fall off a short or oddly sized board screen.
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  useFitToHeight(panelRef, contentRef);
  return (
    <div className="screen home">
      <div className="home-art" aria-hidden="true">
        <Arcs className="home-arcs" />
        <Mark className="home-art-mark" />
      </div>
      <div className="home-clock">
        <UpdateReady />
        <AppUpdate />
        <Clock />
        {canExit && (
          <button className="btn-exit" onClick={() => quit()} aria-label="Exit Trinity Teaching">
            <Icon name="power" size={34} stroke={2} />
            <span>Exit</span>
          </button>
        )}
      </div>
      <main className="home-panel" ref={panelRef}>
        <div className="home-content" ref={contentRef}>
        <div className="home-logo" {...hold}><Logo size="lg" tagline /></div>
        <div className="home-copy">
          <h1>{INSTITUTION.appTitle}</h1>
          <p>{INSTITUTION.appSubtitle}</p>
        </div>
        <button className="btn-start" onClick={onStart}>
          <Icon name="book" size={60} stroke={1.6} />
          <span>START TEACHING</span>
          <Icon name="arrow" size={52} stroke={2} />
        </button>
        </div>
      </main>
      <UpdateStatus />
      <Ribbon className="home-ribbon" />
      {setup && <AiSetupDialog onClose={() => setSetup(false)} />}
    </div>
  );
}
