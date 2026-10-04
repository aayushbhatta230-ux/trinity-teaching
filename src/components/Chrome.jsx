import { useEffect, useState } from 'react';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { visibleSteps } from '../lib/flow.js';

/** Full-viewport application shell. Layout is fluid; sizes are in rem and the root font scales with the screen. */
export function AppShell({ children }) {
  return <div className="app">{children}</div>;
}

/** Current root font size in px — used where JS needs to size things (page thumbnails). */
export function useRemPx() {
  const read = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const [px, setPx] = useState(read);
  useEffect(() => {
    const on = () => setPx(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return px;
}

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clock">
      <div className="clock-time">{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
      <div className="clock-date">
        {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
}

/** Progress indicator. Completed steps can be tapped to jump straight back. */
export function Stepper({ sel, current, onJump }) {
  const steps = visibleSteps(sel);
  const ci = steps.findIndex((s) => s.id === current);
  return (
    <ol className="stepper" aria-label={`Step ${ci + 1} of ${steps.length}`}>
      {steps.map((s, i) => {
        const state = i < ci ? 'done' : i === ci ? 'active' : 'todo';
        return (
          <li key={s.id} className={`step step-${state}`}>
            <button disabled={state !== 'done'} onClick={() => onJump(s.id)} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="step-dot">{i + 1}</span>
              <span className="step-label">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Header({ sel, step, onJump, onHome }) {
  return (
    <header className="header">
      <Logo size="sm" />
      {step ? <Stepper sel={sel} current={step} onJump={onJump} /> : <div className="flex1" />}
      <div className="header-right">
        <Clock />
        {onHome && (
          <button className="btn-home" onClick={onHome} aria-label="Home">
            <Icon name="home" size={40} />
          </button>
        )}
      </div>
    </header>
  );
}

export function BackButton({ onClick, label = 'Back' }) {
  return (
    <button className="btn-back" onClick={onClick}>
      <Icon name="back" size={40} stroke={2.25} />
      <span>{label}</span>
    </button>
  );
}
