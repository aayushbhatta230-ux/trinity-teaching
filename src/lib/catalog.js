/**
 * Pure lookup functions over the data files. No UI logic in here.
 */
import { CLASSES, SHIFTS, GROUPS, SUBJECTS, PORTIONS } from '../data/structure.js';
import { TEACHERS, ASSIGNMENTS } from '../data/teachers.js';

export const getClass = (id) => CLASSES.find((c) => c.id === id);
export const getShift = (id) => SHIFTS.find((s) => s.id === id);
export const getGroup = (id) => GROUPS.find((g) => g.id === id);
export const getSubject = (id) => (id && SUBJECTS[id] ? { id, ...SUBJECTS[id] } : undefined);
export const getPortion = (id) => (id && PORTIONS[id] ? { id, ...PORTIONS[id] } : undefined);
export const getTeacher = (id) => (id && TEACHERS[id] ? { id, ...TEACHERS[id] } : undefined);

export const subjectOfPortion = (pid) =>
  getSubject(Object.keys(SUBJECTS).find((s) => SUBJECTS[s].portions.includes(pid)));

export const sectionsFor = (sel) => getGroup(sel.group)?.sections[sel.shift] ?? [];
export const subjectsFor = (sel) => (getGroup(sel.group)?.subjects ?? []).map(getSubject).filter(Boolean);
export const portionsFor = (sel) => (getSubject(sel.subject)?.portions ?? []).map(getPortion).filter(Boolean);
export const hasPortionChoice = (subjectId) => (getSubject(subjectId)?.portions.length ?? 0) > 1;

const list = (v) => [].concat(v);
const ruleMatches = (where = {}, sel) =>
  (!where.cls || list(where.cls).includes(sel.cls)) &&
  (!where.shift || list(where.shift).includes(sel.shift)) &&
  (!where.group || list(where.group).includes(sel.group)) &&
  (!where.sections || where.sections.includes(sel.section));

/**
 * Automatic teacher assignment: most specific matching rule wins.
 * Returns the teacher object (or undefined if nobody is mapped).
 */
export function resolveTeacher(sel) {
  let best;
  let bestScore = -1;
  for (const rule of ASSIGNMENTS) {
    if (rule.portion !== sel.portion || !ruleMatches(rule.where, sel)) continue;
    const score = Object.keys(rule.where ?? {}).length;
    if (score > bestScore) { best = rule; bestScore = score; }
  }
  return best && getTeacher(best.teacher);
}
