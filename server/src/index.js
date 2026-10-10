// Trinity Teaching AI server.
//   GET  /health                 status (no auth)
//   POST /ask                    Ask AI: answer / go to slide / show past questions   (x-access-code)
//   POST /quiz                   AI Quiz from past questions for the chapter          (x-access-code)
//   POST /admin/papers           add a past paper's questions                         (Bearer ADMIN_TOKEN)
//   GET  /admin/papers           list papers                                           (Bearer ADMIN_TOKEN)
//   DELETE /admin/papers/:id     remove a paper and its questions                      (Bearer ADMIN_TOKEN)
import * as ai from './ai.js';
import * as demo from './demo.js';
import { chapterTerms, terms, shortlist, present, listForPrompt } from './bank.js';
import { examsFor } from './syllabus.js';
import { checkWorking } from './arith.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, x-access-code, authorization',
  'access-control-max-age': '86400',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS } });
const fail = (message, status) => json({ error: message }, status);

const EXAMS = ['IOE', 'IOM'];
const SUBJECTS = ['physics', 'chemistry', 'mathematics', 'biology', 'english'];
const MAX_SLIDE_CHARS = 120000;

function sameSecret(a = '', b = '') {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Counts one AI request against today's college-wide limit. */
async function spend(env) {
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    'INSERT INTO usage (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1 RETURNING count',
  ).bind(day).first();
  return row.count <= Number(env.DAILY_LIMIT || 400);
}

/** A worked solution as lines (the model may send a list or one text). */
const steps = (x) => (Array.isArray(x) ? x.map(String).join(String.fromCharCode(10)) : String(x || ''));

/** The model's array, or [] if it sent something else. */
const list = (x) => (Array.isArray(x) ? x : []);

/** Validates and trims the chapter context the app sends. */
function readContext(body) {
  const c = body?.context;
  if (!c || !Array.isArray(c.slides) || !c.slides.length) return null;
  if (!SUBJECTS.includes(c.subject) && !['nepali', 'computer'].includes(c.subject)) return null;
  let total = 0;
  const slides = [];
  for (const s of c.slides.slice(0, 300)) {
    const text = String(s.text || '').slice(0, 4000);
    total += text.length;
    if (total > MAX_SLIDE_CHARS) break;
    slides.push({ n: Number(s.n) || slides.length + 1, text });
  }
  return {
    cls: String(c.cls || ''), group: ['PHY', 'BIO'].includes(c.group) ? c.group : null, subject: c.subject, subjectLabel: String(c.subjectLabel || c.subject),
    portion: c.portion ? String(c.portion) : null, portionLabel: String(c.portionLabel || ''),
    chapter: Number(c.chapter) || 1, title: String(c.title || '').slice(0, 200),
    currentSlide: Number(c.currentSlide) || 1, slides,
  };
}

/** Long chapters, shortened evenly so every slide keeps its start (titles and key lines). */
function compact(context, maxChars) {
  const total = context.slides.reduce((n, s) => n + s.text.length, 0);
  if (total <= maxChars) return context;
  const per = Math.max(200, Math.floor(maxChars / context.slides.length));
  return { ...context, slides: context.slides.map((s) => ({ ...s, text: s.text.slice(0, per) })) };
}

const MCQ_REQUEST =/\b(mcqs?|questions?|quiz|practice|past papers?)\b/i;

/**
 * The slides most relevant to a question (plus the slide on the board), in order.
 * Whole chapters can be 100+ slides; sending only what matters keeps answers fast and on point.
 */
function focusSlides(context, query, max = 10) {
  const all = context.slides;
  if (all.length <= max) return all;
  const want = new Set(terms(query));
  const scored = all.map((s) => ({ s, score: terms(s.text).filter((w) => want.has(w)).length }));
  const keep = new Set(scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, max - 1).map((x) => x.s.n));
  // Nothing matched (e.g. "explain this slide"): the slides around the current one.
  if (!keep.size) for (let n = context.currentSlide - 3; n <= context.currentSlide + 5; n++) keep.add(n);
  keep.add(context.currentSlide);
  return all.filter((s) => keep.has(s.n));
}

async function handleAsk(req, env) {
  const body = await req.json().catch(() => null);
  const context = readContext(body);
  const query = String(body?.query || '').trim().slice(0, 500);
  if (!context || !query) return fail('Missing chapter or question.', 400);
  if (!(await spend(env))) return fail("Today's AI limit for the college has been reached. It resets tomorrow.", 429);

  const weights = chapterTerms(context);
  for (const w of terms(query)) weights.set(w, (weights.get(w) || 0) + 8); // the request matters most
  const past = await shortlist(env.DB, { subject: context.subject, exams: examsFor(context.subject, context.group), cls: context.cls, context, weights, limit: 30 });

  // "MCQs on this chapter": this chapter's question-bank items, then exam-style practice
  // questions for the rest, toughest first.
  const exams = examsFor(context.subject, context.group);
  if (env.DEMO_MODE !== '1' && exams.length && MCQ_REQUEST.test(query)) {
    // "20 toughest MCQs" asks for 20; otherwise 10.
    const asked = Number((query.match(/\b(\d{1,2})\b/) || [])[1]);
    const q = await buildQuiz(env, { context, count: Math.min(30, Math.max(3, asked || 10)), exams, past });
    const fromBank = q.items.filter((x) => x.kind !== 'practice').length;
    return json({
      action: 'show_questions',
      answer: !q.items.length
        ? 'No questions could be made for this chapter yet.'
        : `${q.items.length} toughest questions for this chapter, hardest first${fromBank ? ` (${fromBank} from the question bank, the rest AI practice)` : ' (AI practice in entrance-exam style)'}.`,
      slide: null, citedSlides: [], questions: q.items, demo: false, via: q.meta,
    });
  }

  // Only the slides that matter for this question: faster and more focused.
  const focused = { ...context, slides: focusSlides(context, query) };
  const r = env.DEMO_MODE === '1'
    ? demo.ask({ context, query, past })
    : await ai.ask(env, { context: focused, query, exams, pastList: listForPrompt(past) });

  const byId = new Map(past.map((p) => [p.id, p]));
  const slideOk = (n) => Number.isInteger(n) && context.slides.some((s) => s.n === n);
  return json({
    action: r.action,
    answer: r.answer,
    slide: slideOk(r.slide) ? r.slide : null,
    citedSlides: list(r.cited_slides).filter(slideOk),
    questions: list(r.question_ids).map((id) => byId.get(id)).filter(Boolean).map(present),
    demo: env.DEMO_MODE === '1',
    via: r.meta,
  });
}

async function handleQuiz(req, env) {
  const body = await req.json().catch(() => null);
  const context = readContext(body);
  if (!context) return fail('Missing chapter.', 400);
  const count = Math.min(MAX_QUIZ, Math.max(3, Number(body?.count) || 10));
  // Only exams that actually test this subject (e.g. Biology group: IOM and IOE; Physical group: IOE).
  const tested = examsFor(context.subject, context.group);
  if (!tested.length) return fail('The entrance exams for this group do not test this subject, so there is no quiz for it.', 400);
  let exams = (Array.isArray(body?.exams) ? body.exams : tested).filter((e) => tested.includes(e));
  if (!exams.length) exams = tested;
  if (!(await spend(env))) return fail("Today's AI limit for the college has been reached. It resets tomorrow.", 429);

  const past = await shortlist(env.DB, { subject: context.subject, exams, cls: context.cls, context, weights: chapterTerms(context), limit: 80 });
  const q = await buildQuiz(env, { context, count, exams, past });
  return json({ items: q.items, exams, pastAvailable: past.length, demo: env.DEMO_MODE === '1', via: q.meta });
}

export const MAX_QUIZ = 50;
const BATCH = 15;     // practice questions per AI call (fewer calls stay under free-tier rate limits)
const PARALLEL = 2;   // AI calls at the same time (more trips the free-tier rate limit)

/**
 * A quiz of `count` questions, toughest first:
 *   1. question-bank items that belong to this chapter (answers already checked), hardest first;
 *   2. AI practice questions for the rest, written in parallel batches over different parts of the
 *      chapter, each rated for difficulty, re-solved by the answer check, then merged hardest first.
 */
async function buildQuiz(env, { context, count, exams, past }) {
  if (env.DEMO_MODE === '1') {
    const r = demo.quiz({ context, count, past });
    const items = list(r.items).filter((it) => it?.question && goodOptions(it.options))
      .map((it) => ({ kind: 'practice', style: it.style, unit: it.unit, question: it.question, options: it.options, answer: it.answer, answerSource: 'practice', explanation: steps(it.explanation), slide: it.slide, difficulty: 3 }));
    return { items: items.slice(0, count), meta: r.meta };
  }

  const bank = [...past]
    .sort((a, b) => (b.difficulty || 3) - (a.difficulty || 3))
    .slice(0, count)
    .map((p) => ({ ...present(p), difficulty: p.difficulty || 3 }));

  const need = count - bank.length;
  let practice = [];
  let meta = null;
  if (need > 0) ({ items: practice, meta } = await practiceQuestions(env, { context, exams, need, avoid: bank }));

  // Toughest first; the same question never twice.
  const seen = new Set();
  const all = [...bank, ...practice]
    .sort((a, b) => (b.difficulty || 3) - (a.difficulty || 3))
    .filter((q) => {
      const key = String(q.question).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return { items: balanceAnswers(all.slice(0, count)), meta };
}

/** Splits the chapter's slides into `n` consecutive parts (every part gets at least one slide). */
function slideParts(slides, n) {
  if (slides.length <= n) return Array.from({ length: n }, () => slides);
  const size = Math.ceil(slides.length / n);
  return Array.from({ length: n }, (_, i) => slides.slice(i * size, (i + 1) * size)).filter((p) => p.length);
}

/** Runs async tasks with at most `limit` at once; returns the settled results in order. */
async function runLimited(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      try { results[i] = { ok: true, value: await tasks[i]() }; } catch (error) { results[i] = { ok: false, error }; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const shuffled = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

// Options that name other options ("Both A and B", "All of the above") must keep their order.
const LETTER_OPTION = /\b(both|all|none|neither)\b.*\b(above|these|[A-D] and [A-D])\b|\b[A-D] and [A-D]\b/i;

/**
 * Spreads the right answers evenly over A–D across the whole quiz (the AI puts most of them
 * under A or B). Each question's options are reordered so its answer lands on the next letter
 * from a shuffled, balanced deal.
 */
function balanceAnswers(items) {
  const deal = shuffled(Array.from({ length: items.length }, (_, i) => 'ABCD'[i % 4]));
  return items.map((q, n) => {
    const right = 'ABCD'.indexOf(q.answer);
    if (right < 0 || q.options.some((o) => LETTER_OPTION.test(String(o)))) return q;
    const target = 'ABCD'.indexOf(deal[n]);
    const others = shuffled([0, 1, 2, 3].filter((k) => k !== right));
    const order = [...others];
    order.splice(target, 0, right);
    return { ...q, options: order.map((k) => q.options[k]), answer: deal[n] };
  });
}

/** Drops AI-written questions whose worked solution has an arithmetic slip or contradicts its key. */
function arithmeticOk(q) {
  const r = checkWorking(q.explanation, q.options, q.answer);
  if (!r.ok) console.log('dropped (arithmetic):', r.reason, '|', String(q.question).slice(0, 80));
  return r.ok;
}

const PRACTICE_DEADLINE_MS = 150000;

/**
 * Practice questions for the part of the quiz the bank cannot fill. Batches of up to 10 cover
 * different parts of the chapter; every batch's answers are re-solved by the check. If batches
 * fail (rate limits on a busy day), further rounds top the quiz up while time allows.
 */
async function practiceQuestions(env, { context, exams, need, avoid }) {
  const deadline = Date.now() + PRACTICE_DEADLINE_MS;
  const items = [];
  let meta = null;
  let lastError = null;
  const rounds = [];
  for (let round = 0; items.length < need && round < 4 && Date.now() < deadline - 25000; round++) {
    const short = need - items.length;
    const parts = slideParts(context.slides, Math.ceil(short / BATCH));
    const avoidText = [...avoid, ...items].map((q) => `- ${q.question}`).join('\n');
    const tasks = parts.map((slides, i) => async () => {
      const n = Math.ceil(short / parts.length);
      const ctx = compact({ ...context, slides }, 30000);
      const focus = parts.length > 1
        ? (slides === context.slides
          ? `This is set ${i + 1} of ${parts.length} for the same chapter: choose different sub-topics and question types from the other sets.`
          : `This is set ${i + 1} of ${parts.length}: write questions on these slides only.`)
        : '';
      const r = await ai.quiz(env, { context: ctx, count: n + 3, exams, pastList: '', avoid: avoidText, focus });
      const fresh = list(r.items)
        .filter((it) => it && typeof it === 'object' && it.question_id == null && it.question && goodOptions(it.options) && /^[ABCD]$/.test(it.answer))
        .map((it) => ({
          kind: 'practice', style: exams.includes(it.style) ? it.style : null, unit: it.unit || null,
          question: it.question, options: it.options, answer: it.answer, answerSource: 'practice',
          explanation: steps(it.explanation), slide: it.slide, difficulty: Math.min(5, Math.max(1, Number(it.difficulty) || 3)),
        }));
      // Accuracy first: every AI-written answer is re-solved, then every calculation in its
      // worked solution is recomputed exactly, before it reaches the board.
      const checked = await checkAnswers(env, ctx, fresh);
      return { items: checked.filter(arithmeticOk), meta: r.meta };
    });
    const t0 = Date.now();
    const done = await runLimited(tasks, PARALLEL);
    rounds.push({ batches: done.length, ok: done.filter((d) => d.ok).length, secs: Math.round((Date.now() - t0) / 1000), errors: done.filter((d) => !d.ok).map((d) => String(d.error?.message || d.error).slice(0, 80)) });
    for (const d of done) {
      if (d.ok) { items.push(...d.value.items); meta ||= d.value.meta; } else lastError = d.error;
    }
    if (!done.some((d) => d.ok) && round > 0) break; // still nothing after a pause: stop
    // Some batches were rate-limited: let the free tier's per-minute window reset, then top up.
    if (done.some((d) => !d.ok) && items.length < need) {
      const pause = Math.min(20000, deadline - Date.now() - 45000);
      if (pause > 3000) await new Promise((r) => setTimeout(r, pause));
    }
  }
  if (!items.length && lastError) throw lastError; // report why (e.g. AI busy)
  return { items, meta: { ...(meta || {}), rounds } };
}

/**
 * Accuracy: every answer the AI worked out (practice questions, and past questions without an
 * official key) is solved again independently. A different answer replaces the AI's; a question
 * the check finds wrong or ambiguous is dropped. Official-key answers are never touched.
 */
async function checkAnswers(env, context, items) {
  const todo = items.map((q, i) => ({ q, i })).filter(({ q }) => q.answerSource === 'practice' || q.answerSource === 'ai');
  if (!todo.length) return items;
  let result;
  try {
    result = await ai.check(env, { context, items: todo.map(({ q }) => q) });
  } catch {
    return items; // the check is a bonus; if it is unavailable, keep the quiz
  }
  const verdict = new Map(list(result.checks).filter((c) => Number.isInteger(c?.index)).map((c) => [c.index, c]));
  const drop = new Set();
  todo.forEach(({ q, i }, k) => {
    const c = verdict.get(k);
    if (!c) return;
    if (!c.answer) { drop.add(i); return; }
    if (c.answer !== q.answer) {
      q.answer = c.answer;
      if (c.explanation) q.explanation = steps(c.explanation);
    }
  });
  return items.filter((_, i) => !drop.has(i));
}

/** Four distinct, real options (not just "A", "B" …). */
function goodOptions(o) {
  if (!Array.isArray(o) || o.length !== 4) return false;
  const t = o.map((x) => String(x || '').trim());
  return t.every((x) => x && !/^\(?[A-Da-d]\)?\.?$/.test(x)) && new Set(t.map((x) => x.toLowerCase())).size === 4;
}

// ---------- admin: past papers ----------

function validQuestion(q) {
  return q && typeof q.question === 'string' && q.question.trim()
    && Array.isArray(q.options) && q.options.length === 4 && q.options.every((o) => typeof o === 'string')
    && SUBJECTS.includes(q.subject)
    && (q.answer == null || ['A', 'B', 'C', 'D'].includes(q.answer));
}

async function addPaper(req, env) {
  const body = await req.json().catch(() => null);
  const paper = body?.paper;
  if (!paper || !EXAMS.includes(paper.exam)) return fail(`paper.exam must be one of ${EXAMS.join(', ')}`, 400);
  const qs = (body.questions || []).filter(validQuestion);
  if (!qs.length) return fail('No valid questions in the request.', 400);
  const p = await env.DB.prepare('INSERT INTO papers (exam, year, source) VALUES (?, ?, ?) RETURNING id')
    .bind(paper.exam, paper.year ? String(paper.year) : null, paper.source ? String(paper.source) : null).first();
  const stmt = env.DB.prepare(`INSERT INTO questions (paper_id, exam, year, qno, subject, portion, topic, question, options, answer, answer_source, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  await env.DB.batch(qs.map((q) => stmt.bind(
    p.id, paper.exam, paper.year ? String(paper.year) : null, q.qno ? String(q.qno) : null, q.subject, q.portion || null,
    q.topic || null, q.question.trim(), JSON.stringify(q.options), q.answer || null,
    q.answer ? (q.answerSource === 'ai' ? 'ai' : 'key') : 'none', Number(q.difficulty) || null,
  )));
  return json({ paperId: p.id, added: qs.length, skipped: (body.questions || []).length - qs.length });
}

async function listPapers(env) {
  const { results } = await env.DB.prepare(
    'SELECT p.id, p.exam, p.year, p.source, p.added_at, COUNT(q.id) AS questions FROM papers p LEFT JOIN questions q ON q.paper_id = p.id GROUP BY p.id ORDER BY p.exam, p.year',
  ).all();
  return json({ papers: results });
}

async function deletePaper(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM questions WHERE paper_id = ?').bind(id),
    env.DB.prepare('DELETE FROM papers WHERE id = ?').bind(id),
  ]);
  return json({ deleted: id });
}

// ---------- background answer check for the question bank ----------

const VERIFY_BATCH = 15;

/**
 * Runs on a schedule. Takes a few unchecked questions of one subject and has the AI solve each
 * independently:
 *   - answer matches the key         → verified = 1 (used in class)
 *   - no key, AI finds one answer     → answer filled in, marked "worked out by AI", verified = 1
 *   - AI disagrees with the key       → verified = -2, AI's answer kept in check_answer (held for review)
 *   - ambiguous / no correct option   → verified = -1 (never used)
 */
async function verifyBatch(env) {
  const next = await env.DB.prepare('SELECT subject FROM questions WHERE verified = 0 LIMIT 1').first();
  if (!next) return { done: true };
  const { results } = await env.DB.prepare('SELECT * FROM questions WHERE verified = 0 AND subject = ? ORDER BY id LIMIT ?').bind(next.subject, VERIFY_BATCH).all();
  const items = results.map((q) => ({ question: q.question, options: JSON.parse(q.options) }));
  const check = await ai.check(env, { context: { subject: next.subject, subjectLabel: next.subject, cls: '', portionLabel: '', chapter: '', title: 'Question bank check', slides: [] }, items });
  const verdict = new Map(list(check.checks).filter((c) => Number.isInteger(c?.index)).map((c) => [c.index, c]));
  const updates = [];
  results.forEach((q, k) => {
    const c = verdict.get(k);
    if (!c) return; // not answered this time: try again next run
    if (!c.answer) {
      updates.push(env.DB.prepare('UPDATE questions SET verified = -1 WHERE id = ?').bind(q.id));
    } else if (!q.answer) {
      updates.push(env.DB.prepare("UPDATE questions SET answer = ?, answer_source = 'ai', explanation = COALESCE(NULLIF(explanation, ''), ?), verified = 1 WHERE id = ?").bind(c.answer, steps(c.explanation), q.id));
    } else if (c.answer === q.answer) {
      updates.push(env.DB.prepare('UPDATE questions SET verified = 1 WHERE id = ?').bind(q.id));
    } else {
      updates.push(env.DB.prepare('UPDATE questions SET verified = -2, check_answer = ? WHERE id = ?').bind(c.answer, q.id));
    }
  });
  if (updates.length) await env.DB.batch(updates);
  return { checked: updates.length, subject: next.subject, via: check.meta?.model };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(verifyBatch(env).then((r) => console.log('bank check', JSON.stringify(r))).catch((e) => console.error('bank check failed', e?.message || e)));
  },

  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/health') {
        const row = await env.DB.prepare('SELECT COUNT(*) AS n, SUM(verified = 1) AS ready, SUM(verified = 0) AS waiting FROM questions').first().catch(() => ({ n: 0 }));
        return json({ ok: true, model: ai.MODEL, demo: env.DEMO_MODE === '1', pastQuestions: row?.ready ?? 0, bank: { total: row?.n ?? 0, ready: row?.ready ?? 0, waitingForCheck: row?.waiting ?? 0 } });
      }
      if (url.pathname.startsWith('/admin/')) {
        const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
        if (!sameSecret(token, env.ADMIN_TOKEN)) return fail('Not authorised.', 401);
        if (url.pathname === '/admin/papers' && req.method === 'POST') return await addPaper(req, env);
        if (url.pathname === '/admin/papers' && req.method === 'GET') return await listPapers(env);
        const m = url.pathname.match(/^\/admin\/papers\/(\d+)$/);
        if (m && req.method === 'DELETE') return await deletePaper(env, Number(m[1]));
        return fail('Not found.', 404);
      }
      if (!sameSecret(req.headers.get('x-access-code') || '', env.ACCESS_CODE)) return fail('Wrong school access code.', 401);
      if (url.pathname === '/ask' && req.method === 'POST') return await handleAsk(req, env);
      if (url.pathname === '/quiz' && req.method === 'POST') return await handleQuiz(req, env);
      return fail('Not found.', 404);
    } catch (e) {
      if (e instanceof ai.AIError) return fail(e.message, e.status);
      console.error('request failed', url.pathname, e?.stack || e);
      return fail('Something went wrong on the AI server.', 500);
    }
  },
};
