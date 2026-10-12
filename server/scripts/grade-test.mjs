// Grade mix of bank questions for Class 12 chapters, before and after the Grade 12 rule.
// Usage: node scripts/grade-test.mjs <bank.json exported from D1>
import fs from 'node:fs';
import { shortlist, chapterTerms } from '../src/bank.js';

const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const db = {
  prepare: (sql) => ({
    bind: (...p) => ({
      all: async () => ({
        results: rows.filter((q) => q.subject === p[0] && (q.verified === 1 || q.answer_source === 'key')
          && (!/exam IN/.test(sql) || p.slice(1).includes(q.exam)) && (!/grade = '11'/.test(sql) || String(q.grade) === '11')),
      }),
    }),
  }),
};
const chapters = [
  ['physics', ['IOE', 'IOM'], 'Electromagnetic Induction', ["Faraday's laws emf flux", "Lenz's law induced current", 'self inductance mutual inductance', 'AC generator transformer eddy currents']],
  ['physics', ['IOE', 'IOM'], 'Current Electricity', ['Ohm law resistance resistivity', 'Kirchhoff laws potentiometer Wheatstone bridge', 'electric power heating effect']],
  ['physics', ['IOE', 'IOM'], 'Modern Physics', ['photoelectric effect work function', 'Bohr model hydrogen spectrum', 'radioactivity half life nuclear']],
  ['chemistry', ['IOE', 'IOM'], 'Electrochemistry', ['electrode potential cell emf', 'electrolysis Faraday laws', 'conductance']],
  ['chemistry', ['IOE', 'IOM'], 'Haloalkanes and Haloarenes', ['haloalkane SN1 SN2 substitution', 'elimination reactions', 'haloarenes']],
  ['biology', ['IOM'], 'Genetics', ['Mendel laws inheritance allele', 'linkage crossing over chromosome', 'sex determination']],
  ['biology', ['IOM'], 'Human Physiology: Circulation', ['heart cardiac cycle', 'blood pressure artery vein', 'blood groups']],
];
let bad = 0;
for (const [subject, exams, title, slides] of chapters) {
  const context = { cls: '12', subject, title, slides: slides.map((text, i) => ({ n: i + 1, text })) };
  const weights = chapterTerms(context);
  const mix = (l) => `${l.filter((q) => String(q.grade) === '12').length} G12 / ${l.filter((q) => String(q.grade) !== '12').length} G11`;
  const before = await shortlist(db, { subject, exams, cls: 'before', context, weights, limit: 30 });
  const after = await shortlist(db, { subject, exams, cls: '12', context, weights, limit: 30 });
  const g11 = after.filter((q) => String(q.grade) !== '12').length;
  if (after.length && g11 > Math.floor(30 / 4)) bad++;
  console.log(`${title.padEnd(30)} before: ${mix(before).padEnd(16)} after: ${mix(after)}`);
}
process.exit(bad ? 1 : 0);
