#!/usr/bin/env node
// Turns the college's IOE / MECEE (IOM) practice question datasets into SQL for the question bank.
//
//   node scripts/import-bank.mjs <grade11.jsonl> <grade12-cumulative.jsonl> <out.sql>
//
// - Grade 11 file: every question is tagged grade '11' (shown to Class 11 and Class 12).
// - Grade 12 cumulative file: questions also in the Grade 11 file stay grade '11'; the rest are
//   grade '12' (shown to Class 12 only).
// - Wording-variant prefixes are stripped and duplicates merged; MECEE-BL becomes IOM;
//   Mental Agility (no app subject) and items without four distinct options are dropped.
// - Answers come from correct_answer or "Correct option: X" in the explanation. Every item is
//   then re-solved by the AI server's background check before it is used (verified = 0 here).
import fs from 'node:fs';

const [g11File, g12File, outFile] = process.argv.slice(2);
if (!g11File || !g12File || !outFile) { console.error('usage: import-bank.mjs <g11.jsonl> <g12.jsonl> <out.sql>'); process.exit(1); }

const PREFIXES = [
  'Review the following entrance concept', 'Choose the correct option for this concept', 'For medical entrance preparation, answer',
  'Choose the correct option', 'For entrance-exam revision, identify the correct answer', 'Choose the most accurate statement for this question',
  'In a Grade 11–12 science context, answer', 'Select the option that completes the question correctly', 'Select the best answer',
  'Which of the following best matches this concept',
];
// Opening phrases that repeat in front of many different questions are filler, found from the data
// itself: "Which answer is most accurate?", "Which option correctly answers the following?" …
function learnPrefixes(rows) {
  const counts = new Map();
  for (const r of rows) {
    let s = String(r.question || '').replace(/\s+/g, ' ').trim();
    for (let depth = 0; depth < 3; depth++) {
      const m = s.match(/^([A-Za-z][A-Za-z ,'–-]{8,70}?[?:.])\s+(?=\S)/);
      if (!m || /\d/.test(m[1])) break;
      counts.set(m[1].slice(0, -1), (counts.get(m[1].slice(0, -1)) || 0) + 1);
      s = s.slice(m[0].length);
    }
  }
  // Only generic filler about answering; never real instructions ("Choose the correct preposition")
  // or the start of a real question ("A body moves with constant speed in a circle").
  const FILLER = /\b(answer|answers|option|accurate|concept|correctly)\b/i;
  const INSTRUCTION = /\b(article|preposition|sequence|belong|number|synonym|antonym|word|sentence)\b/i;
  for (const [p, n] of counts) {
    if (n >= 5 && FILLER.test(p) && !INSTRUCTION.test(p) && !PREFIXES.some((x) => x.toLowerCase() === p.toLowerCase())) PREFIXES.push(p);
  }
}

// Prefixes can be stacked ("Which of the following best matches this concept? Choose the correct option: …").
const stripPrefix = (q) => {
  let s = String(q || '').replace(/[  -​ ]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let changed = true; changed;) {
    changed = false;
    for (const p of PREFIXES) {
      const head = s.slice(0, p.length + 1).toLowerCase();
      if ([':', '.', '?'].some((end) => head === p.toLowerCase() + end)) { s = s.slice(p.length + 1).trim(); changed = true; break; }
    }
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Subject from the subject column or the topic prefix ("Physics: Mechanics", "Botany / Respiration").
function subjectOf(r) {
  const topic = String(r.subject_topic || '');
  const head = topic.split(/[:/]/)[0].trim().toLowerCase();
  const s = String(r.subject || '').trim().toLowerCase() || head;
  if (s.startsWith('math')) return 'mathematics';
  if (s.startsWith('phys')) return 'physics';
  if (s.startsWith('chem')) return 'chemistry';
  if (s.startsWith('bio') || s.startsWith('botany') || s.startsWith('zoology')) return 'biology';
  if (s.startsWith('english')) return 'english';
  return null; // e.g. Mental Agility
}
const topicOf = (r) => {
  const t = String(r.subject_topic || '').trim();
  const parts = t.split(/\s*[:/]\s*/);
  return (parts.length > 1 ? parts.slice(1).join(' ') : t).trim();
};
const branchOf = (r) => {
  const t = String(r.subject_topic || '').toLowerCase();
  if (t.startsWith('botany')) return 'bio.botany';
  if (t.startsWith('zoology')) return 'bio.zoology';
  return null;
};

// App portion for a subject + topic (used to narrow the search; the chapter match decides).
const PORTION = {
  mathematics: [[/matri|determin|algebra|logarithm|probab|sequence|series|binomial|complex|permut|combin|set|function/i, 'math.algebra'],
    [/coordinate|geometry|vector|trigono|conic|circle|line/i, 'math.analytical'], [/different|integra|limit|deriva|calculus/i, 'math.calculus']],
  physics: [[/mechan|kinemat|unit|dimension|work|energy|power|oscillat|wave|gravit|fluid|elastic|motion|momentum/i, 'phy.mechanics'],
    [/electr|magnet|current|capacit/i, 'phy.electricity'], [/heat|thermal|thermo|temperature|gas/i, 'phy.thermo']],
  chemistry: [[/organic|hydrocarbon|biomolecule|alcohol|aldehyde|amine|haloalkane/i, 'chem.organic'],
    [/coordination|transition|metal|periodic|inorganic|non-metal/i, 'chem.inorganic'],
    [/mole|stoich|bond|redox|kinetic|equilibri|solution|acid|base|electrochem|atomic|thermodynamic/i, 'chem.physical']],
  biology: [[/plant|photosynth|botany|ecology|cell|genetic|reproduction|division/i, 'bio.botany'],
    [/human|physiolog|excretion|endocrin|circulation|immun|respiration|evolution|nervous|zoology|animal/i, 'bio.zoology']],
  english: [[/./, 'eng.general']],
};
const portionOf = (subject, topic, r) => branchOf(r) || (PORTION[subject] || []).find(([re]) => re.test(topic))?.[1] || null;

const answerOf = (r) => {
  if (/^[ABCD]$/.test(String(r.correct_answer || '').trim())) return String(r.correct_answer).trim();
  const m = String(r.explanation || '').match(/correct option:?\s*([ABCD])\b/i);
  return m ? m[1].toUpperCase() : null;
};
const DIFF = { high: 4, medium: 3, low: 2 };
// Comparison form: case, spacing and trailing punctuation ignored; signs and symbols kept (−5 ≠ 5).
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[\s.:;,]+$/, '').replace(/\s*([,()[\]])\s*/g, '$1').trim();

const read = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const seen = new Map();
const stats = { read: 0, noSubject: 0, badOptions: 0, duplicate: 0, kept: 0, noAnswer: 0 };

function take(r, grade) {
  stats.read++;
  const subject = subjectOf(r);
  if (!subject) { stats.noSubject++; return; }
  const question = stripPrefix(r.question);
  const options = ['A', 'B', 'C', 'D'].map((l) => String(r[`option_${l}`] ?? '').trim());
  if (!question || options.some((o) => !o) || new Set(options.map(norm)).size !== 4) { stats.badOptions++; return; }
  const exam = String(r.exam).toUpperCase().startsWith('IOE') ? 'IOE' : 'IOM';
  const key = `${exam}|${norm(question)}|${options.map(norm).sort().join('|')}`;
  if (seen.has(key)) { stats.duplicate++; return; }
  const topic = topicOf(r);
  const answer = answerOf(r);
  if (!answer) stats.noAnswer++;
  seen.set(key, {
    exam, grade, subject, topic, portion: portionOf(subject, topic, r), question, options, answer,
    explanation: String(r.explanation || '').replace(/\s*Correct option:?\s*[ABCD]\.?\s*$/i, '').trim(),
    difficulty: DIFF[String(r.priority_estimate || '').toLowerCase()] || 3,
  });
  stats.kept++;
}

const g11 = read(g11File);
const g12 = read(g12File);
learnPrefixes([...g11, ...g12]);
console.log('filler prefixes removed:', PREFIXES.length);
if (process.env.SHOW_PREFIXES) console.log(PREFIXES.map((p) => `  - ${p}`).join('\n'));
g11.forEach((r) => take(r, '11'));   // Grade 11 first: shared questions stay Grade 11
g12.forEach((r) => take(r, '12'));

const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const lines = [
  '-- Generated by scripts/import-bank.mjs. Replaces the previous question bank import.',
  "DELETE FROM questions WHERE paper_id IN (SELECT id FROM papers WHERE source LIKE 'Question bank%');",
  "DELETE FROM papers WHERE source LIKE 'Question bank%';",
  "INSERT INTO papers (exam, year, source) VALUES ('IOE', NULL, 'Question bank (IOE)');",
  "INSERT INTO papers (exam, year, source) VALUES ('IOM', NULL, 'Question bank (IOM / MECEE-BL)');",
];
for (const it of seen.values()) {
  lines.push(`INSERT INTO questions (paper_id, exam, year, qno, subject, portion, topic, question, options, answer, answer_source, difficulty, grade, origin, explanation, verified) VALUES ((SELECT id FROM papers WHERE source = ${q(`Question bank (${it.exam === 'IOE' ? 'IOE' : 'IOM / MECEE-BL'})`)}), ${q(it.exam)}, NULL, NULL, ${q(it.subject)}, ${q(it.portion)}, ${q(it.topic)}, ${q(it.question)}, ${q(JSON.stringify(it.options))}, ${q(it.answer)}, ${q(it.answer ? 'bank' : 'none')}, ${it.difficulty}, ${q(it.grade)}, 'bank', ${q(it.explanation)}, 0);`);
}
fs.writeFileSync(outFile, lines.join('\n') + '\n');
fs.writeFileSync(`${outFile}.json`, JSON.stringify([...seen.values()], null, 1)); // for checking and tests
const by = {};
for (const it of seen.values()) { const k = `${it.exam} ${it.subject} grade ${it.grade}`; by[k] = (by[k] || 0) + 1; }
console.log(stats);
console.log(by);
