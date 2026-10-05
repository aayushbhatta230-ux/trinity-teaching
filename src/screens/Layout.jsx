import { Header, BackButton } from '../components/Chrome.jsx';
import { Ribbon } from '../components/Decor.jsx';
import { getClass, getShift, getGroup, getSubject, getPortion, hasPortionChoice } from '../lib/catalog.js';
import { sectionCode } from '../data/structure.js';

/** Plain-language summary of what has been chosen so far. */
export function contextChips(sel, upTo) {
  const order = ['cls', 'shift', 'group', 'section', 'subject', 'portion'];
  const stop = upTo ? order.indexOf(upTo) : order.length;
  const chips = [];
  const has = (k) => sel[k] && order.indexOf(k) < stop;
  if (has('cls')) chips.push(getClass(sel.cls).label);
  if (has('shift')) chips.push(getShift(sel.shift).label);
  if (has('group')) chips.push(getGroup(sel.group).label);
  if (has('section')) chips.push(sectionCode(sel.cls, sel.shift, sel.section));
  if (has('subject')) chips.push(getSubject(sel.subject).label);
  if (has('portion') && hasPortionChoice(sel.subject)) chips.push(getPortion(sel.portion).label);
  return chips;
}

export function Context({ chips }) {
  if (!chips.length) return null;
  return (
    <div className="context">
      {chips.map((c, i) => (
        <span key={i} className="context-chip">{c}</span>
      ))}
    </div>
  );
}

/** Standard flow screen: header with stepper, back button, title, context, body. */
export default function FlowLayout({ sel, step, go, title, chips = [], aside, children, ribbon = true, tight = false }) {
  return (
    <div className="screen flow">
      <Header sel={sel} step={step} onJump={go.jump} onHome={go.home} />
      <div className="flow-top">
        <BackButton onClick={() => go.back(step)} />
        <div className="flow-title">
          <h1>{title}</h1>
          <Context chips={chips} />
        </div>
        <div className="flow-aside">{aside}</div>
      </div>
      <main className={`flow-body ${tight ? 'is-tight' : ''}`}>{children}</main>
      {ribbon && <Ribbon className="flow-ribbon" />}
    </div>
  );
}
