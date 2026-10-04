import FlowLayout, { contextChips } from './Layout.jsx';
import Icon from '../components/Icon.jsx';
import { CLASSES, SHIFTS, GROUPS, sectionCode } from '../data/structure.js';
import { getGroup, getSubject, sectionsFor, subjectsFor, portionsFor, resolveTeacher } from '../lib/catalog.js';

/** Builds the title and option list for each selection step from the data files. */
function describe(step, sel) {
  switch (step) {
    case 'class':
      return {
        title: 'Select Class', key: 'cls', size: 'xl',
        options: CLASSES.map((c) => ({ id: c.id, label: c.label, icon: 'book' })),
      };
    case 'shift':
      return {
        title: 'Select Shift', key: 'shift', size: 'xl',
        options: SHIFTS.map((s) => ({ id: s.id, label: s.label, sub: `(${s.id})`, icon: s.icon })),
      };
    case 'group':
      return {
        title: 'Select Group', key: 'group', size: 'xl',
        options: GROUPS.map((g) => {
          const secs = g.sections[sel.shift];
          return { id: g.id, label: g.label, sub: `Sections ${secs[0]} – ${secs[secs.length - 1]}`, icon: g.icon };
        }),
      };
    case 'section': {
      const secs = sectionsFor(sel);
      return {
        title: `Select Section (${getGroup(sel.group).label})`, key: 'section',
        size: secs.length > 10 ? 'sm' : 'md', cols: secs.length > 10 ? 6 : secs.length > 8 ? 5 : 4,
        options: secs.map((s) => ({ id: s, label: s, sub: sectionCode(sel.cls, sel.shift, s) })),
      };
    }
    case 'subject': {
      const subs = subjectsFor(sel);
      return {
        title: 'Select Subject', key: 'subject', size: 'subject', cols: 3,
        options: subs.map((s) => ({ id: s.id, label: s.label, sub: s.native, icon: s.icon })),
      };
    }
    case 'portion': {
      const ps = portionsFor(sel);
      return {
        title: `Select Portion (${getSubject(sel.subject).label})`, key: 'portion', size: 'lg', cols: ps.length,
        options: ps.map((p) => ({
          id: p.id, label: p.label, sub: p.detail, icon: p.icon,
          teacher: resolveTeacher({ ...sel, portion: p.id })?.name,
        })),
      };
    }
    default:
      return { title: '', options: [] };
  }
}

export default function ChoiceScreen({ step, sel, go }) {
  const d = describe(step, sel);
  const current = sel[d.key];
  return (
    <FlowLayout sel={sel} step={step} go={go} title={d.title} chips={contextChips(sel, d.key)}>
      <div className={`choices choices-${d.size}`} style={{ '--cols': d.cols ?? 2 }}>
        {d.options.map((o) => (
          <button
            key={o.id}
            className={`choice ${o.id === current ? 'is-selected' : ''}`}
            onClick={() => go.choose(step, o.id)}
          >
            {o.icon && <span className="choice-icon"><Icon name={o.icon} size={d.size === 'xl' ? 108 : 72} stroke={1.5} /></span>}
            <span className="choice-label">{o.label}</span>
            {o.sub && <span className="choice-sub">{o.sub}</span>}
            {o.teacher && (
              <span className="choice-teacher"><Icon name="user" size={26} /> {o.teacher}</span>
            )}
          </button>
        ))}
      </div>
    </FlowLayout>
  );
}
