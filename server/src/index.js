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
  const past = await shortlist(env.DB, { subject: context.subject, portion: context.portion, exams: examsFor(context.subject, context.group), weights, limit: 30 });

  // "MCQs on this chapter" while no past papers are loaded: give exam-style practice questions
  // instead of an empty answer.
  const exams = examsFor(context.subject, context.group);
  if (env.DEMO_MODE !== '1' && !past.length && exams.length && MCQ_REQUEST.test(query)) {
    const q = await buildQuiz(env, { context, count: 5, exams, past });
    return json({
      action: 'show_questions',
      answer: q.items.length
        ? 'No past papers are loaded yet, so here are practice questions in entrance-exam style, hardest first.'
        : 'No questions could be made for this chapter yet.',
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
  const count = Math.min(20, Math.max(3, Number(body?.count) || 10));
  // Only exams that actually test this subject (e.g. Biology group: IOM and IOE; Physical group: IOE).
  const tested = examsFor(context.subject, context.group);
  if (!tested.length) return fail('The entrance exams for this group do not test this subject, so there is no quiz for it.', 400);
  let exams = (Array.isArray(body?.exams) ? body.exams : tested).filter((e) => tested.includes(e));
  if (!exams.length) exams = tested;
  if (!(await spend(env))) return fail("Today's AI limit for the college has been reached. It resets tomorrow.", 429);

  const past = await shortlist(env.DB, { subject: context.subject, portion: context.portion, exams, weights: chapterTerms(context), limit: 80 });
  const q = await buildQuiz(env, { context, count, exams, past });
  return json({ items: q.items, exams, pastAvailable: past.length, demo: env.DEMO_MODE === '1', via: q.meta });
}

/** Asks for a quiz and keeps only valid items: real past questions by id, or labelled practice. */
async function buildQuiz(env, { context, count, exams, past }) {
  const started = Date.now();
  const r = env.DEMO_MODE === '1'
    ? demo.quiz({ context, count, past })
    : await ai.quiz(env, { context: compact(context, 40000), count: count + 2, exams, pastList: listForPrompt(past) }); // 2 spare in case the check drops some

  const byId = new Map(past.map((p) => [p.id, p]));
  const used = new Set();
  const items = [];
  for (const it of list(r.items)) {
    if (!it || typeof it !== 'object') continue; // skip anything malformed from the model
    if (items.length >= count + 2) break;
    if (it.question_id != null) {
      const p = byId.get(it.question_id);
      if (!p || used.has(p.id)) continue; // never show an id the AI made up
      used.add(p.id);
      const q = present(p);
      // The official key wins; otherwise the AI's worked answer, labelled as such.
      items.push({ ...q, answer: q.answer || it.answer, answerSource: q.answer ? q.answerSource : 'ai', explanation: steps(it.explanation), slide: it.slide });
    } else if (it.question && goodOptions(it.options)) {
      items.push({ kind: 'practice', style: exams.includes(it.style) ? it.style : null, unit: it.unit || null, question: it.question, options: it.options, answer: it.answer, answerSource: 'practice', explanation: steps(it.explanation), slide: it.slide });
    }
  }
  // The answer check runs when the quiz came quickly enough; a slow day never doubles the wait.
  const checked = env.DEMO_MODE === '1' || Date.now() - started > 35000 ? items : await checkAnswers(env, context, items);
  return { items: checked.slice(0, count), meta: r.meta };
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

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/health') {
        const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM questions').first().catch(() => ({ n: 0 }));
        return json({ ok: true, model: ai.MODEL, demo: env.DEMO_MODE === '1', pastQuestions: row?.n ?? 0 });
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
