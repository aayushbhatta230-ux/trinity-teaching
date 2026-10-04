import Logo, { Mark } from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { Clock } from '../components/Chrome.jsx';
import { Arcs, Ribbon } from '../components/Decor.jsx';
import { INSTITUTION } from '../data/institution.js';

export default function Home({ onStart }) {
  return (
    <div className="screen home">
      <div className="home-art" aria-hidden="true">
        <Arcs className="home-arcs" />
        <Mark className="home-art-mark" />
      </div>
      <div className="home-clock"><Clock /></div>
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
