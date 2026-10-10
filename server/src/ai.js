// AI calls for Ask and Quiz, on free models only:
//   1. Google Gemini (free tier, key from aistudio.google.com)        GEMINI_MODEL
//   2. Cloudflare Workers AI (free daily allowance, no key needed)     CF_MODEL
// Gemini is tried first; if it is rate-limited or down, Workers AI answers instead.
// Every answer is grounded in the chapter's slides and the shortlisted past questions.

import { syllabusBlock } from './syllabus.js';

export const MODEL = 'gemini (free) + workers-ai fallback';
const GEMINI_DEFAULT = 'gemini-3.5-flash';
const CF_DEFAULT = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const RULES_COMMON = `You work inside Trinity Teaching, the classroom app used on interactive boards at Trinity International SS & College, Kathmandu, for +2 Science. A teacher is teaching one chapter, and the students are preparing for the entrance exams after Grade 12: IOE (engineering) and IOM (medical).

Ground rules:
- Use only the material given here: the teacher's SLIDES (numbered), the QUESTION BANK (IOE and IOM questions for this chapter, each with an id: some are real past questions, marked with exam and year; the rest are the college question bank) and the ENTRANCE EXAM SYLLABUS (official units, question counts and exam style). For answers, do not add facts that are not in the slides.
- Never invent an exam, a year or a past question. Only QUESTION BANK items marked "real past question" are past questions; never call a question-bank item a past question.
- Write for a classroom board: short, clear sentences, plain text with line breaks. No markdown headings, tables, bold or LaTeX.
- Write every formula the way a textbook prints it, in Unicode: ½MR², v² = u² + 2as, ε = −dΦ/dt, μ₀, θ, λ, √(2gh), 3 × 10⁸ m/s, H₂SO₄, ΔH, →, ≥. Never use ^, *, sqrt, "1/2", "mu0" or "theta" spelled out.
- Reply with JSON only, matching the requested shape.`;

const ASK_RULES = `${RULES_COMMON}

You receive one request from the teacher and choose exactly one action:
- "goto_slide": they want to open or see a slide about something. Set slide to the best matching slide number and write a one-line answer naming it.
- "show_questions": they want MCQs or past questions. Put up to 10 ids from QUESTION BANK in question_ids, most relevant and hardest first, and a one-line answer. If none fit, use "not_in_material".
- "answer": a definition, formula, explanation, comparison or summary. Put each point, formula or step on its own line starting with "• ". Answer from the slides in at most 120 words and list the slide numbers you used in cited_slides. Questions about the entrance exams (which unit this chapter belongs to, how many questions it carries, the exam format) are answered from the ENTRANCE EXAM SYLLABUS.
- "not_in_material": the slides and past questions do not cover it. Say so in one or two sentences and mention what the chapter does cover.
Fields that do not apply to the chosen action: slide null, cited_slides [], question_ids [].`;

const QUIZ_RULES = `${RULES_COMMON}

Build a classroom quiz of the requested length for this chapter.
- Choose from QUESTION BANK only questions that test what this chapter's SLIDES teach. Never use a question about a topic this chapter does not cover.
- Prefer the toughest ones: multi-step numericals, conceptual traps, questions that combine ideas. Order the quiz hardest first.
- Never include two questions that test the same fact or are rewordings of each other; each question must test something different.
- Use past questions exactly as given: set question_id and leave question and options null. Never change their wording, options or answer.
- If a past question has no answer in the key, solve it carefully step by step and give your answer; the app labels it "answer worked out by AI".
- Only if there are not enough suitable past questions, add practice questions you write yourself. Each must test a topic that is both in the SLIDES and in a unit of the ENTRANCE EXAM SYLLABUS for the chosen exams, written in that exam's question style at the hardest level its paper uses (IOE: multi-step numericals; IOM: application-level items with close distractors). Model them on the question types that recur in real IOE and IOM papers, from your general knowledge of those exams: typical traps, numbers that come out cleanly, assertion-style and "which of the following" items for IOM, multi-step numericals and graph or limiting-case questions for IOE. Write every practice question fresh; never present one as a specific past paper's question. Spread them over the chosen exams and favour units with more questions. Before writing each item, solve it yourself and check every calculation. Exactly one option must be correct beyond doubt and the other three clearly wrong; avoid vague or hedged wording (such as "ideal", "primarily", "mostly"), trick questions about wording, and options that are partly true. Drop any item you are not certain of. For those set question_id null, fill question, four options and answer, and set style to the exam and unit to the syllabus unit. Never present a practice question as a past question.
- For every item give the explanation as a short worked solution: 2 to 4 lines separated by line breaks, each line one step (the formula used, the substitution, the result) or one short reason. No line starts with a bullet character; the app adds bullets. Give the related slide number if there is one.
- Options are the full answer texts, never the letters. Example of one practice item:
  {"question_id": null, "question": "A 0.5 m rod moves at 4 m/s at right angles to a 0.2 T field. The emf across its ends is", "options": ["0.1 V", "0.4 V", "0.8 V", "4 V"], "answer": "B", "explanation": "Motional emf: e = Blv\\ne = 0.2 × 0.5 × 4\\ne = 0.4 V", "slide": 2, "style": "IOE", "unit": "Electricity and magnetism"}`;

const ASK_SCHEMA = {
  type: 'object',
  required: ['action', 'answer', 'slide', 'cited_slides', 'question_ids'],
  properties: {
    action: { type: 'string', enum: ['answer', 'goto_slide', 'show_questions', 'not_in_material'] },
    answer: { type: 'string' },
    slide: { type: ['integer', 'null'] },
    cited_slides: { type: 'array', items: { type: 'integer' } },
    question_ids: { type: 'array', items: { type: 'integer' } },
  },
};

const QUIZ_SCHEMA = {
  type: 'object',
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['question_id', 'question', 'options', 'answer', 'explanation', 'slide', 'style', 'unit'],
        properties: {
          question_id: { type: ['integer', 'null'] },
          question: { type: ['string', 'null'] },
          options: { type: ['array', 'null'], minItems: 4, maxItems: 4, items: { type: 'string', description: 'The full text of this answer option (a value, statement or expression), never just a letter.' } },
          answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation: { type: 'string' },
          slide: { type: ['integer', 'null'] },
          style: { type: ['string', 'null'], enum: ['IOE', 'IOM', null] },
          unit: { type: ['string', 'null'] },
        },
      },
    },
  },
};

function slidesBlock(context) {
  const head = `CHAPTER: Class ${context.cls} · ${context.subjectLabel} › ${context.portionLabel} · Chapter ${context.chapter}: ${context.title}`;
  const body = (context.slides || [])
    .map((s) => `--- Slide ${s.n} ---\n${(s.text || '').trim() || '(no text on this slide)'}`)
    .join('\n');
  return `${head}\n\nSLIDES\n${body}`;
}

export class AIError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

/** Pulls a JSON object out of a model reply (tolerates ```json fences and stray text). */
function parseJson(text) {
  if (text && typeof text === 'object') return text;
  const s = String(text || '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
  try { return JSON.parse(s); } catch { /* fall through */ }
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch { /* fall through */ } }
  throw new AIError('The AI returned an unreadable answer. Try again.', 502);
}

class Busy extends Error {}

// ---------- speed: time limits and busy-model memory ----------
// Free models that are overloaded can take minutes just to say "busy". Every attempt gets a
// hard time limit, and a model that was busy or slow is skipped for a while, so the next
// request goes straight to a model that answers.
// Kept in the database too, so the memory survives restarts and is shared by every server copy.
const busyUntil = new Map();
const BUSY_FOR_MS = 10 * 60 * 1000;
const isBusy = (model) => (busyUntil.get(model) || 0) > Date.now();
let busyLoadedAt = 0;

async function loadBusy(env) {
  if (!env.DB || Date.now() - busyLoadedAt < 30000) return;
  busyLoadedAt = Date.now();
  try {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS model_busy (model TEXT PRIMARY KEY, until INTEGER NOT NULL)').run();
    const { results } = await env.DB.prepare('SELECT model, until FROM model_busy').all();
    for (const r of results) busyUntil.set(r.model, Math.max(busyUntil.get(r.model) || 0, r.until));
  } catch { /* the memory still works without the database */ }
}

async function markBusy(env, model, ms = BUSY_FOR_MS) {
  const until = Date.now() + ms;
  busyUntil.set(model, until);
  try {
    await env.DB?.prepare('INSERT OR REPLACE INTO model_busy (model, until) VALUES (?, ?)').bind(model, until).run();
  } catch { /* ignore */ }
}

// Ask and the answer check: the fast model first. Quiz: the stronger model first, then the fast one.
const LITE = 'gemini-flash-lite-latest';
const ORDER = {
  ask: [LITE, 'gemini-flash-latest', GEMINI_DEFAULT],
  check: [LITE, 'gemini-flash-latest', GEMINI_DEFAULT],
  quiz: [GEMINI_DEFAULT, 'gemini-flash-latest', LITE],
};
// One hard deadline per request, whatever happens. Part of it is always kept back so the
// Cloudflare backup model can still answer if every Gemini model is slow or rate-limited.
const BUDGET_MS = { ask: 30000, check: 25000, quiz: 60000 };
const BACKUP_RESERVE_MS = { ask: 12000, check: 10000, quiz: 25000 };
// The stronger models are often overloaded on the free tier: never wait long for them.
const ATTEMPT_MS = { ask: 12000, check: 20000, quiz: 40000 };
const attemptLimit = (model, kind) => (model === LITE ? ATTEMPT_MS[kind] : Math.min(ATTEMPT_MS[kind], 15000));

async function withTimeout(promise, ms, onTimeout) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(onTimeout()), ms); })]);
  } finally {
    clearTimeout(timer);
  }
}

async function gemini(env, req) {
  await loadBusy(env);
  const preferred = env.GEMINI_MODEL && env.GEMINI_MODEL !== GEMINI_DEFAULT ? [env.GEMINI_MODEL] : [];
  const names = [...new Set([...preferred, ...ORDER[req.kind]])];
  // Busy models go last, not away: if every model is marked busy, they are still tried if time allows.
  const ordered = [...names.filter((m) => !isBusy(m)), ...names.filter(isBusy)];
  const reserve = env.AI ? BACKUP_RESERVE_MS[req.kind] : 0;
  const tried = [];
  for (const model of ordered) {
    const left = req.deadline - Date.now() - reserve;
    if (left < 3000) { tried.push('gemini: out of time, using the backup model'); break; }
    try {
      return { model, data: await geminiModel(env, model, req, Math.min(attemptLimit(model, req.kind), left)), tried };
    } catch (e) {
      if (!(e instanceof Busy)) throw e;
      tried.push(e.message);
    }
  }
  throw new Busy(tried.join(' | ') || 'no gemini model');
}

async function geminiModel(env, model, { system, user, schema, maxTokens }, limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), limit);
  let res;
  let data;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens, temperature: 0.2 },
      }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    await markBusy(env, model);
    throw new Busy(`gemini ${model}: ${e?.name === 'AbortError' ? `no answer in ${Math.round(limit / 1000)}s` : 'unreachable'}`);
  } finally {
    clearTimeout(timer);
  }
  const message = String(data.error?.message || '');
  const why = `gemini ${model}: ${res.status} ${message.slice(0, 120)}`;
  if (res.status === 429) {
    // Free-tier quota: per minute (skip briefly) or per day (skip for hours).
    await markBusy(env, model, /per ?day|PerDay|daily/i.test(message) ? 3 * 60 * 60 * 1000 : 65 * 1000);
    throw new Busy(why);
  }
  if (res.status === 404 || res.status >= 500) { await markBusy(env, model); throw new Busy(why); }
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new AIError(`The AI server is not set up correctly (Gemini: ${message || res.status}).`, 500);
    throw new Busy(why);
  }
  const cand = data.candidates?.[0];
  if (!cand) throw new AIError('The AI declined this request.', 422);
  if (cand.finishReason === 'MAX_TOKENS') throw new AIError('The answer was too long. Ask for fewer items.', 422);
  if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') throw new AIError('The AI declined this request.', 422);
  return parseJson((cand.content?.parts || []).map((p) => p.text || '').join(''));
}

async function workersAi(env, { backupSystem, user, schema, maxTokens, deadline }) {
  if (!env.AI) throw new Busy('workers-ai not bound');
  const model = env.CF_MODEL || CF_DEFAULT;
  const limit = Math.max(deadline - Date.now(), 8000);
  const out = await withTimeout(env.AI.run(model, {
    messages: [{ role: 'system', content: backupSystem }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: schema },
    max_tokens: Math.min(maxTokens, 8000),
    temperature: 0.2,
  }), limit, () => new Busy(`workers-ai: no answer in ${Math.round(limit / 1000)}s`));
  return { model, data: parseJson(out?.response ?? out) };
}

/** Long chapters, shortened evenly so every slide keeps its opening (title and key lines). */
function shorten(context, maxChars) {
  const slides = context.slides || [];
  const total = slides.reduce((n, s) => n + (s.text || '').length, 0);
  if (total <= maxChars) return context;
  const per = Math.max(120, Math.floor(maxChars / slides.length));
  return { ...context, slides: slides.map((s) => ({ ...s, text: (s.text || '').slice(0, per) })) };
}

/** Gemini first; on rate limits, slowness or outages fall back to Workers AI — all within one deadline. */
async function callModel(env, { kind, rules, context, exams, userText, schema, maxTokens, geminiOnly = false }) {
  const syl = syllabusBlock(context.subject, exams);
  const req = {
    kind,
    deadline: Date.now() + BUDGET_MS[kind],
    system: `${rules}\n\n${slidesBlock(context)}${syl ? `\n\n${syl}` : ''}`,
    // The backup model is slow on long input: it gets each slide's opening lines only.
    backupSystem: `${rules}\n\n${slidesBlock(shorten(context, 12000))}${syl ? `\n\n${syl}` : ''}`,
    user: userText,
    schema,
    maxTokens,
  };
  const order = [env.GEMINI_API_KEY && gemini, !geminiOnly && env.AI && workersAi].filter(Boolean);
  if (!order.length) throw new AIError('The AI server has no AI model set up.', 500);
  const skipped = [];
  for (const fn of order) {
    try {
      const { model, data, tried = [] } = await fn(env, req);
      skipped.push(...tried);
      // Which free model answered (and why an earlier one was skipped), for support.
      Object.defineProperty(data, 'meta', { value: { model, skipped }, enumerable: false });
      return data;
    } catch (e) {
      if (e instanceof AIError) throw e;
      skipped.push(String(e.message || e).slice(0, 200)); // busy, slow or unreachable: try the next free model
    }
  }
  throw new AIError('The free AI models are busy right now. Try again in a minute.', 429);
}

export function ask(env, { context, query, pastList, exams }) {
  return callModel(env, {
    kind: 'ask',
    rules: ASK_RULES,
    context,
    exams,
    userText: `QUESTION BANK\n${pastList || '(none available for this chapter yet)'}\n\nCurrent slide on the board: ${context.currentSlide || 1}\n\nTEACHER'S REQUEST\n${query}`,
    schema: ASK_SCHEMA,
    maxTokens: 3000,
  });
}

export function quiz(env, { context, count, pastList, exams }) {
  return callModel(env, {
    kind: 'quiz',
    rules: QUIZ_RULES,
    context,
    exams,
    userText: `QUESTION BANK\n${pastList || '(none available for this chapter yet)'}\n\nBuild a quiz of ${count} questions for this chapter for these exams: ${(exams || []).join(', ')}.`,
    schema: QUIZ_SCHEMA,
    maxTokens: 12000,
  });
}

// ---------- accuracy: an independent check of AI-written questions ----------

const CHECK_RULES = `You are checking multiple-choice questions written for +2 Science students preparing for the IOE and IOM entrance exams, before they are shown in class.
For each question, ignore the proposed answer and solve the question yourself, carefully and step by step, checking every calculation.
- If exactly one option is clearly correct, return its letter and a short worked solution of 2 to 4 lines separated by line breaks (formula, substitution, result), in Unicode notation such as ½MR², μ₀, θ, ×, 10⁻³.
- If no option is correct, more than one could be correct, or the question is vague or depends on wording, return answer null so the question is dropped.
Reply with JSON only, matching the requested shape, with one entry per question in the same order.`;

const CHECK_SCHEMA = {
  type: 'object',
  required: ['checks'],
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['index', 'answer', 'explanation'],
        properties: {
          index: { type: 'integer' },
          answer: { type: ['string', 'null'], enum: ['A', 'B', 'C', 'D', null] },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

/** Re-solves practice questions independently: returns { checks: [{ index, answer|null, explanation }] }. */
export function check(env, { context, items }) {
  const list = items.map((q, i) => `Q${i}. ${q.question}\nA) ${q.options[0]}\nB) ${q.options[1]}\nC) ${q.options[2]}\nD) ${q.options[3]}`).join('\n\n');
  return callModel(env, {
    kind: 'check',
    // A check by the weaker backup model could "confirm" a wrong key: Gemini only, or no check this time.
    geminiOnly: true,
    rules: CHECK_RULES,
    context: { ...context, slides: [] },
    exams: [],
    userText: `QUESTIONS (index = the number after Q)\n\n${list}`,
    schema: CHECK_SCHEMA,
    maxTokens: 8000,
  });
}
