/**
 * Turns a resource into an array of page descriptors for the viewer.
 * Real files supply `resource.pages` (e.g. exported slide images) and skip generation.
 */
import { UNITS } from '../data/curriculum.js';
import { getPortion, subjectOfPortion, getTeacher, getClass } from './catalog.js';

const L = 'landscape';
const P = 'portrait';

export function buildPages(r) {
  if (r.pages) return r.pages.map((p) => ({ orient: p.orient ?? (r.type === 'presentation' ? L : P), layout: 'image', ...p }));

  const portion = getPortion(r.scope.portion);
  const subject = subjectOfPortion(r.scope.portion);
  const units = UNITS[r.scope.portion]?.[r.scope.cls] ?? [];
  const ctx = {
    portion: portion?.label,
    subject: subject?.label,
    cls: getClass(r.scope.cls)?.label,
    teacher: getTeacher(r.scope.teacher)?.name,
    title: r.title,
  };
  const d = r.doc ?? {};

  switch (d.kind) {
    case 'slides': {
      const u = units[d.unit];
      const n = d.unit + 1;
      return [
        { orient: L, layout: 'title', kicker: `Unit ${n}`, title: u.t, ctx },
        { orient: L, layout: 'bullets', title: 'Learning Objectives', lead: 'By the end of this unit, students will be able to explain:', items: u.p, ctx },
        { orient: L, layout: 'map', title: 'Concept Map', center: u.t, items: u.p, ctx },
        ...u.p.map((p, i) => ({ orient: L, layout: 'concept', n: `${n}.${i + 1}`, title: p, unit: u.t, ctx })),
        { orient: L, layout: 'formula', title: 'Key Relation', formula: u.f, ctx },
        { orient: L, layout: 'bullets', title: 'Check Your Understanding', numbered: true, items: questionsFor(u).slice(0, 4), ctx },
        { orient: L, layout: 'summary', title: 'Summary', items: u.p, formula: u.f, ctx },
      ];
    }
    case 'notes': {
      const u = units[d.unit];
      return [
        { orient: P, layout: 'notes', heading: u.t, lines: u.p.map((p, i) => `${i + 1}. ${p}`), ctx },
        { orient: P, layout: 'notes', heading: 'Important', lines: [`Key relation:  ${u.f}`, ...u.p.map((p) => `• Revise: ${p}`)], boxed: u.f, ctx },
        { orient: P, layout: 'notes', heading: 'Practice', lines: questionsFor(u).slice(0, 5).map((q, i) => `Q${i + 1}. ${q}`), ctx },
      ];
    }
    case 'solved':
      return units.flatMap((u, i) => [
        {
          orient: P, layout: 'doc', heading: `Example ${i + 1} — ${u.t}`, ctx,
          blocks: [
            { h: 'Question', t: `Using the relation ${u.f}, explain ${u.p[0].toLowerCase()} and solve a typical exam problem on ${u.p[1].toLowerCase()}.` },
            { h: 'Given', t: 'Read the data carefully and list the known quantities with units.' },
            { h: 'Solution', t: `Step 1: Identify the concept (${u.p[0]}).  Step 2: Apply ${u.f}.  Step 3: Substitute values and simplify.  Step 4: State the answer with correct units.` },
            { h: 'Remember', t: `Common mistake: confusing ${u.p[2].toLowerCase()} with ${u.p[3].toLowerCase()}.` },
          ],
        },
      ]);
    case 'handout':
      return units.map((u, i) => ({
        orient: P, layout: 'doc', heading: `Unit ${i + 1}: ${u.t}`, ctx,
        blocks: [
          { h: 'Overview', t: `This unit covers ${u.p.join(', ').toLowerCase()}.` },
          ...u.p.map((p) => ({ h: p, t: `Key ideas, definitions and an example related to ${p.toLowerCase()}.` })),
          { h: 'Key relation', t: u.f, mono: true },
        ],
      }));
    case 'paper': {
      const pick = (d.units ?? [0]).map((i) => units[i]).filter(Boolean);
      const qs = pick.flatMap(questionsFor);
      const head = d.homework ? `Homework — Section ${d.homework}` : 'Unit Test 1';
      return [
        { orient: P, layout: 'paper', heading: head, groups: [
          { h: 'Group A — Short answer (1 × 5 = 5)', q: qs.filter((_, i) => i % 3 === 0).slice(0, 5) },
          { h: 'Group B — Answer briefly (2 × 4 = 8)', q: qs.filter((_, i) => i % 3 === 1).slice(0, 4) },
          { h: 'Group C — Long answer (4 × 3 = 12)', q: qs.filter((_, i) => i % 3 === 2).slice(0, 3) },
        ], ctx },
      ];
    }
    case 'formula':
      return [{ orient: P, layout: 'table', heading: r.title, cols: ['Unit', 'Key relation / fact'], rows: units.map((u) => [u.t, u.f]), ctx }];
    case 'plan':
      return [{
        orient: P, layout: 'table', heading: 'Teaching Plan', ctx, cols: ['Week', 'Topic'],
        rows: units.flatMap((u, i) => u.p.map((p, j) => [`Week ${i * 4 + j + 1}`, `${u.t}: ${p}`])),
      }];
    default:
      return [{ orient: P, layout: 'doc', heading: r.title, blocks: [{ h: 'File', t: 'Preview not available.' }], ctx }];
  }
}

function questionsFor(u) {
  const [a, b, c, d] = u.p;
  return [
    `Define ${a.toLowerCase()}.`,
    `Explain ${b.toLowerCase()} with a suitable example.`,
    `State and explain the relation ${u.f}.`,
    `Differentiate between ${c.toLowerCase()} and ${d.toLowerCase()}.`,
    `Why is ${a.toLowerCase()} important in ${u.t.toLowerCase()}?`,
    `Write short notes on ${d.toLowerCase()}.`,
  ];
}

/** Chapters for mock videos. */
export function videoChapters(r) {
  const u = UNITS[r.scope.portion]?.[r.scope.cls]?.[r.video?.unit ?? 0];
  const parts = u ? ['Introduction', ...u.p, 'Summary'] : ['Video'];
  const len = r.video?.duration ?? 600;
  return parts.map((title, i) => ({ title, start: Math.round((len / parts.length) * i) }));
}
