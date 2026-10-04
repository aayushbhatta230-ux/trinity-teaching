/**
 * Resource catalogue.
 *
 * Every resource carries a `scope` describing exactly where it belongs:
 *   { teacher, cls, portion, shift?, group?, sections? }
 * Fields left out mean "any". The resource screen only shows resources whose
 * scope matches the current selection AND the automatically assigned teacher.
 *
 * In production, replace `buildMockCatalogue()` with data from your file
 * server / LMS export. To attach a real file, add an entry to MANUAL_RESOURCES:
 *   - presentations / PDFs exported as images:  pages: [{ image: 'files/x/01.png' }, ...]
 *   - videos:                                    src: 'files/x/lecture.mp4'
 */

import { GROUPS, SHIFTS, CLASSES, SUBJECTS } from './structure.js';
import { ASSIGNMENTS } from './teachers.js';
import { UNITS } from './curriculum.js';

export const RESOURCE_TYPES = [
  { id: 'presentation', label: 'Presentations', ext: 'pptx' },
  { id: 'pdf', label: 'PDFs', ext: 'pdf' },
  { id: 'notes', label: 'Notes', ext: 'pdf' },
  { id: 'video', label: 'Videos', ext: 'mp4' },
  { id: 'assignment', label: 'Assignments', ext: 'pdf' },
  { id: 'other', label: 'Other', ext: 'pdf' },
];

export const MANUAL_RESOURCES = [
  // Example of a real file entry:
  // {
  //   id: 'real-mech-intro', type: 'presentation', title: 'Mechanics – Lecture 1', ext: 'pptx',
  //   description: 'Exported slides', date: '2026-09-20', sizeMB: 12.4,
  //   scope: { teacher: 'T-PM', cls: '11', portion: 'phy.mechanics' },
  //   pages: [{ image: 'files/mech-intro/01.png' }, { image: 'files/mech-intro/02.png' }],
  // },
];

// ---------- deterministic mock generation ----------

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const TODAY = new Date('2026-10-03T00:00:00');
const daysAgo = (seed, min, max) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - (min + (hash(seed) % (max - min + 1))));
  return d.toISOString().slice(0, 10);
};
const size = (seed, min, max) => Math.round((min + (hash(seed + 's') % 1000) / 1000 * (max - min)) * 10) / 10;

const ordinal = ['1', '2', '3', '4', '5'];

function matchesWhere(where, ctx) {
  if (!where) return true;
  if (where.cls && ![].concat(where.cls).includes(ctx.cls)) return false;
  if (where.shift && ![].concat(where.shift).includes(ctx.shift)) return false;
  if (where.group && ![].concat(where.group).includes(ctx.group)) return false;
  if (where.sections && !where.sections.includes(ctx.section)) return false;
  return true;
}

function buildMockCatalogue() {
  const out = [];
  const subjectOf = (portion) => Object.keys(SUBJECTS).find((s) => SUBJECTS[s].portions.includes(portion));

  for (const rule of ASSIGNMENTS) {
    const { teacher, portion } = rule;
    const subject = subjectOf(portion);
    for (const { id: cls } of CLASSES) {
      if (rule.where?.cls && ![].concat(rule.where.cls).includes(cls)) continue;
      const units = UNITS[portion]?.[cls] ?? [];
      const scope = { teacher, cls, portion };
      const base = `${teacher}.${portion}.${cls}`;

      units.forEach((u, i) => {
        const n = ordinal[i];
        out.push({
          id: `${base}.u${n}.ppt`, type: 'presentation', ext: 'pptx',
          title: `Unit ${n} – ${u.t}`, description: 'Class presentation',
          date: daysAgo(`${base}${n}p`, 3 + i * 14, 12 + i * 14), sizeMB: size(`${base}${n}p`, 8, 32),
          scope, doc: { kind: 'slides', unit: i },
        });
        out.push({
          id: `${base}.u${n}.notes`, type: 'notes', ext: 'pdf',
          title: `${u.t} – Notes`, description: 'Handwritten notes',
          date: daysAgo(`${base}${n}n`, 2 + i * 14, 11 + i * 14), sizeMB: size(`${base}${n}n`, 1.2, 4.5),
          scope, doc: { kind: 'notes', unit: i },
        });
      });

      if (units.length) {
        out.push({
          id: `${base}.solved`, type: 'pdf', ext: 'pdf',
          title: 'Solved Examples', description: 'Worked numerical & conceptual examples',
          date: daysAgo(`${base}se`, 5, 30), sizeMB: size(`${base}se`, 2, 6),
          scope, doc: { kind: 'solved' },
        });
        out.push({
          id: `${base}.ref`, type: 'pdf', ext: 'pdf',
          title: 'Reference Handout', description: 'Summary of the whole portion',
          date: daysAgo(`${base}rf`, 20, 50), sizeMB: size(`${base}rf`, 1, 3),
          scope, doc: { kind: 'handout' },
        });
        units.slice(0, 2).forEach((u, i) => {
          out.push({
            id: `${base}.u${ordinal[i]}.video`, type: 'video', ext: 'mp4',
            title: `${u.t} (Video)`, description: 'Concept explanation',
            date: daysAgo(`${base}${i}v`, 6, 40), sizeMB: size(`${base}${i}v`, 80, 220),
            scope, video: { unit: i, duration: 300 + (hash(`${base}${i}v`) % 600) },
          });
        });
        out.push({
          id: `${base}.test1`, type: 'assignment', ext: 'pdf',
          title: 'Unit Test 1 – Questions', description: 'Practice questions',
          date: daysAgo(`${base}t1`, 10, 35), sizeMB: size(`${base}t1`, 0.8, 3),
          scope, doc: { kind: 'paper', units: [0, 1] },
        });
        out.push({
          id: `${base}.formula`, type: 'other', ext: 'pdf',
          title: subject === 'english' || subject === 'nepali' ? 'Quick Revision Sheet' : 'Formula & Key Facts Sheet',
          description: 'One-page revision', date: daysAgo(`${base}fs`, 4, 25), sizeMB: size(`${base}fs`, 0.3, 1),
          scope, doc: { kind: 'formula' },
        });
        out.push({
          id: `${base}.plan`, type: 'other', ext: 'pdf',
          title: 'Syllabus & Teaching Plan', description: 'Portion outline for the term',
          date: daysAgo(`${base}pl`, 40, 70), sizeMB: size(`${base}pl`, 0.3, 1),
          scope, doc: { kind: 'plan' },
        });
      }

      // Section-specific homework, only for sections this teacher actually teaches.
      for (const { id: shift } of SHIFTS) {
        for (const g of GROUPS) {
          if (!g.subjects.includes(subject)) continue;
          for (const section of g.sections[shift]) {
            if (!matchesWhere(rule.where, { cls, shift, group: g.id, section })) continue;
            const key = `${base}.${shift}${g.id}${section}`;
            out.push({
              id: `${key}.hw`, type: 'assignment', ext: 'pdf',
              title: `Homework – Section ${section}`, description: `Assigned to Section ${section} only`,
              date: daysAgo(`${key}hw`, 1, 9), sizeMB: size(`${key}hw`, 0.3, 1.5),
              scope: { ...scope, shift, group: g.id, sections: [section] },
              doc: { kind: 'paper', units: [units.length - 1, 0], homework: section },
            });
          }
        }
      }
    }
  }
  return out;
}

export const RESOURCES = [...MANUAL_RESOURCES, ...buildMockCatalogue()];
