import { useEffect, useState } from 'react';

import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { visibleSteps } from '../lib/flow.js';

/**
 * Root font size from the screen size, done in JS so it works on every board browser
 * (older Android WebViews mis-handle the CSS clamp/min/viewport-unit version).
 * Same formula as the CSS fallback in styles.css: 16px on 1920×1080, 32px on 4K.
 */
function fitRootFont() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h) return;
  const portrait = h > w;
  const px = portrait
    ? Math.max(13, Math.min(26, Math.min(w * 0.019, h * 0.0125)))
    : Math.max(12, Math.min(36, Math.min(w * 0.00834, h * 0.01482)));
  document.documentElement.style.fontSize = `${px.toFixed(2)}px`;
}

/** Full-viewport application shell. Layout is fluid; sizes are in rem and the root font scales with the screen. */
export function AppShell({ children }) {
  useEffect(() => {
    fitRootFont();
    window.addEventListener('resize', fitRootFont);
    window.addEventListener('orientationchange', fitRootFont);
    return () => {
      window.removeEventListener('resize', fitRootFont);
      window.removeEventListener('orientationchange', fitRootFont);
    };
  }, []);
  return <div className="app">{children}</div>;
}

/**
 * Safety net for screens whose content must never be cut off (the Home screen):
 * if the element's content is taller than the space it has, scale it down to fit.
 */
export function useFitToHeight(boxRef, contentRef) {
  useEffect(() => {
    const box = boxRef.current;
    const el = contentRef.current;
    if (!box || !el) return undefined;
    const fit = () => {
      el.style.transform = '';
      const cs = getComputedStyle(box);
      const room = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const k = room / el.offsetHeight;
      if (k < 0.995) {
        el.style.transformOrigin = getComputedStyle(el).textAlign === 'center' ? 'center center' : 'left center';
        el.style.transform = `scale(${Math.max(0.5, k).toFixed(3)})`;
      }
    };
    fit();
    const t = setTimeout(fit, 400); // again after fonts and images have loaded
    window.addEventListener('resize', fit);
    return () => { clearTimeout(t); window.removeEventListener('resize', fit); };
  }, [boxRef, contentRef]);
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
