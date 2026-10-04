/**
 * The selection flow as a small state machine.
 * Selection = { cls, shift, group, section, subject, portion }.
 */
import { CLASSES, SHIFTS } from '../data/structure.js';
import { getGroup, sectionsFor, subjectsFor, portionsFor, hasPortionChoice } from './catalog.js';

export const STEPS = [
  { id: 'class', label: 'Class', key: 'cls' },
  { id: 'shift', label: 'Shift', key: 'shift' },
  { id: 'group', label: 'Group', key: 'group' },
  { id: 'section', label: 'Section', key: 'section' },
  { id: 'subject', label: 'Subject', key: 'subject' },
  { id: 'portion', label: 'Portion', key: 'portion' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'resources', label: 'Presentations' },
];
const KEYS = STEPS.filter((s) => s.key).map((s) => s.key);

/** URL param names for each selection key. */
export const PARAM = { cls: 'c', shift: 's', group: 'g', section: 'sec', subject: 'sub', portion: 'p' };

/** Drop any value that is invalid for the values before it (and everything after it). */
export function sanitize(raw) {
  const sel = {};
  const valid = {
    cls: (v) => CLASSES.some((c) => c.id === v),
    shift: (v) => SHIFTS.some((s) => s.id === v),
    group: (v) => !!getGroup(v),
    section: (v) => sectionsFor(sel).includes(v),
    subject: (v) => subjectsFor(sel).some((s) => s.id === v),
    portion: (v) => portionsFor(sel).some((p) => p.id === v),
  };
  for (const k of KEYS) {
    if (raw[k] == null || !valid[k](raw[k])) break;
    sel[k] = raw[k];
  }
  // A subject with a single portion gets it filled in automatically.
  if (sel.subject && !sel.portion && !hasPortionChoice(sel.subject)) sel.portion = portionsFor(sel)[0]?.id;
  return sel;
}

/** Steps shown in the stepper for this selection (portion hidden for single-portion subjects). */
export const visibleSteps = (sel) =>
  STEPS.filter((s) => s.id !== 'portion' || !sel.subject || hasPortionChoice(sel.subject));

/** First step whose value is still missing. */
export function firstOpenStep(sel) {
  for (const s of visibleSteps(sel)) if (s.key && !sel[s.key]) return s.id;
  return 'teacher';
}

/** Selection with `stepId`'s value and everything after it removed. */
export function selectionBefore(sel, stepId) {
  const out = {};
  for (const s of STEPS) {
    if (s.id === stepId || !s.key) break;
    if (sel[s.key]) out[s.key] = sel[s.key];
  }
  return out;
}

export const stepIndex = (sel, stepId) => visibleSteps(sel).findIndex((s) => s.id === stepId);

export function prevStep(sel, stepId) {
  const steps = visibleSteps(sel);
  const i = steps.findIndex((s) => s.id === stepId);
  return i > 0 ? steps[i - 1].id : null;
}
