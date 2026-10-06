// Past-question bank: finds the questions most relevant to a chapter or a request.
// Matching is done here (cheap, no AI); the AI then chooses among the shortlist.

const STOP = new Set(('the a an and or of to in on for with by from at as is are was were be been this that these those it its into than then '
  + 'which what when where who how why can will would should could may might also about between under over each such their there '
  + 'slide chapter class physics chemistry mathematics biology english teacher morning day unit using used use given find value').split(' '));

/** Lower-case word stems (≥4 letters, crude plural trimming) for overlap scoring. */
export function terms(text = '') {
  return (text.toLowerCase().match(/[a-zα-ω][a-zα-ω'’-]{3,}/g) || [])
    .map((w) => w.replace(/['’]s$/, '').replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1'))
    .filter((w) => !STOP.has(w));
}

/** The chapter's most frequent meaningful terms; the title counts extra. */
export function chapterTerms(context) {
  const freq = new Map();
  const add = (w, n) => freq.set(w, (freq.get(w) || 0) + n);
  for (const s of context.slides || []) for (const w of terms(s.text)) add(w, 1);
  for (const w of terms(`${context.title || ''} ${context.portionLabel || ''}`)) add(w, 5);
  return new Map([...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60));
}

function score(q, weights) {
  let s = 0;
  for (const w of new Set(terms(`${q.topic || ''} ${q.topic || ''} ${q.question} ${q.options}`))) s += Math.min(weights.get(w) || 0, 6);
  return s;
}

/** Shortlist past questions for a subject/portion, ranked by relevance (then difficulty). */
export async function shortlist(db, { subject, portion, exams, weights, limit }) {
  const params = [subject];
  let sql = 'SELECT * FROM questions WHERE subject = ?';
  if (portion) { sql += ' AND (portion = ? OR portion IS NULL)'; params.push(portion); }
  if (exams?.length) { sql += ` AND exam IN (${exams.map(() => '?').join(',')})`; params.push(...exams); }
  sql += ' LIMIT 3000';
  const { results } = await db.prepare(sql).bind(...params).all();
  return results
    .map((q) => ({ q, s: score(q, weights) + (q.difficulty || 3) * 0.5 }))
    .filter((x) => x.s > 2)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.q);
}

/** Shape a stored question for the app. */
export function present(q) {
  return {
    kind: 'past',
    id: q.id,
    exam: q.exam,
    year: q.year,
    qno: q.qno,
    topic: q.topic,
    question: q.question,
    options: JSON.parse(q.options),
    answer: q.answer,
    answerSource: q.answer_source,
  };
}

/** Compact listing of shortlisted questions for the AI prompt. */
export function listForPrompt(questions) {
  return questions.map((q) => {
    const o = JSON.parse(q.options);
    return `[id ${q.id}] ${q.exam} ${q.year || ''} Q${q.qno || '?'} (difficulty ${q.difficulty || '?'}/5, topic: ${q.topic || '-'}, answer: ${q.answer || 'not in key'})\n${q.question}\nA) ${o[0]}  B) ${o[1]}  C) ${o[2]}  D) ${o[3]}`;
  }).join('\n\n');
}
