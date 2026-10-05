import Logo, { Mark } from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { Clock } from '../components/Chrome.jsx';
import { Arcs, Ribbon } from '../components/Decor.jsx';
import { INSTITUTION } from '../data/institution.js';
import { desktopApp, isNativeApp, exitApp } from '../lib/native.js';

// The installed apps (Windows and Android) get an Exit button; a browser tab does not.
const canExit = !!desktopApp || isNativeApp;
// Called with no arguments: the desktop bridge cannot pass a click event across.
const quit = () => (desktopApp ? desktopApp.quit() : exitApp());

export default function Home({ onStart }) {
  return (
    <div className="screen home">
      <div className="home-art" aria-hidden="true">
        <Arcs className="home-arcs" />
        <Mark className="home-art-mark" />
      </div>
      <div className="home-clock">
        <Clock />
        {canExit && (
          <button className="btn-exit" onClick={() => quit()} aria-label="Exit Trinity Teaching">
            <Icon name="power" size={34} stroke={2} />
            <span>Exit</span>
          </button>
        )}
      </div>
      <main className="home-panel">
        <Logo size="lg" tagline />
        <div className="home-copy">
          <h1>{INSTITUTION.appTitle}</h1>
          <p>{INSTITUTION.appSubtitle}</p>
        </div>
        <button className="btn-start" onClick={onStart}>
          <Icon name="book" size={60} stroke={1.6} />
          <span>START TEACHING</span>
          <Icon name="arrow" size={52} stroke={2} />
        </button>
      </main>
      <Ribbon className="home-ribbon" />
    </div>
  );
}
