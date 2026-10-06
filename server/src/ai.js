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
- Use only the material given here: the teacher's SLIDES (numbered), the PAST QUESTIONS (real IOE and IOM entrance questions, each with an id) and the ENTRANCE EXAM SYLLABUS (official units, question counts and exam style). For answers, do not add facts that are not in the slides.
- Never invent an exam, a year or a past question. Only ids from PAST QUESTIONS are real past questions.
- Write for a classroom board: short, clear sentences, plain text with line breaks. Write formulas in plain Unicode, e.g. ε = −dΦ/dt, v² = u² + 2as. No markdown headings or tables.
- Reply with JSON only, matching the requested shape.`;

const ASK_RULES = `${RULES_COMMON}

You receive one request from the teacher and choose exactly one action:
- "goto_slide": they want to open or see a slide about something. Set slide to the best matching slide number and write a one-line answer naming it.
- "show_questions": they want MCQs or past questions. Put up to 10 ids from PAST QUESTIONS in question_ids, most relevant and hardest first, and a one-line answer. If none fit, use "not_in_material".
- "answer": a definition, formula, explanation, comparison or summary. Answer from the slides in at most 120 words and list the slide numbers you used in cited_slides. Questions about the entrance exams (which unit this chapter belongs to, how many questions it carries, the exam format) are answered from the ENTRANCE EXAM SYLLABUS.
- "not_in_material": the slides and past questions do not cover it. Say so in one or two sentences and mention what the chapter does cover.
Fields that do not apply to the chosen action: slide null, cited_slides [], question_ids [].`;

const QUIZ_RULES = `${RULES_COMMON}

Build a classroom quiz of the requested length for this chapter.
- Choose from PAST QUESTIONS only questions that test what this chapter's SLIDES teach.
- Prefer the toughest ones: multi-step numericals, conceptual traps, questions that combine ideas. Order the quiz hardest first.
- Use past questions exactly as given: set question_id and leave question and options null. Never change their wording, options or answer.
- If a past question has no answer in the key, solve it carefully step by step and give your answer; the app labels it "answer worked out by AI".
- Only if there are not enough suitable past questions, add practice questions you write yourself. Each must test a topic that is both in the SLIDES and in a unit of the ENTRANCE EXAM SYLLABUS for the chosen exams, written in that exam's question style at the hardest level its paper uses (IOE: multi-step numericals; IOM: application-level items with close distractors). Spread them over the chosen exams and favour units with more questions. Check every calculation; exactly one option must be correct. For those set question_id null, fill question, four options and answer, and set style to the exam and unit to the syllabus unit. Never present a practice question as a past question.
- For every item give a short explanation (one or two sentences) of why the answer is correct, and the related slide number if there is one.
- Options are the full answer texts, never the letters. Example of one practice item:
  {"question_id": null, "question": "A 0.5 m rod moves at 4 m/s at right angles to a 0.2 T field. The emf across its ends is", "options": ["0.1 V", "0.4 V", "0.8 V", "4 V"], "answer": "B", "explanation": "e = Blv = 0.2 × 0.5 × 4 = 0.4 V.", "slide": 2, "style": "IOE", "unit": "Electricity and magnetism"}`;

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

// If the configured model is unavailable, busy or renamed, these free models are tried next.
const GEMINI_ALTERNATES = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

async function gemini(env, req) {
  const names = [...new Set([env.GEMINI_MODEL || GEMINI_DEFAULT, ...GEMINI_ALTERNATES])];
  const tried = [];
  for (const model of names) {
    try {
      return { model, data: await geminiModel(env, model, req), tried };
    } catch (e) {
      if (!(e instanceof Busy)) throw e;
      tried.push(e.message);
    }
  }
  throw new Busy(tried.join(' | ') || 'no gemini model');
}

async function geminiModel(env, model, { system, user, schema, maxTokens }) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens, temperature: 0.2 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  const why = `gemini ${model}: ${res.status} ${(data.error?.message || '').slice(0, 120)}`;
  if (res.status === 429 || res.status === 404 || res.status >= 500) throw new Busy(why);
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new AIError(`The AI server is not set up correctly (Gemini: ${data.error?.message || res.status}).`, 500);
    throw new Busy(`gemini ${model}: ${res.status} ${data.error?.message || ''}`);
  }
  const cand = data.candidates?.[0];
  if (!cand) throw new AIError('The AI declined this request.', 422);
  if (cand.finishReason === 'MAX_TOKENS') throw new AIError('The answer was too long. Ask for fewer items.', 422);
  if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') throw new AIError('The AI declined this request.', 422);
  return parseJson((cand.content?.parts || []).map((p) => p.text || '').join(''));
}

async function workersAi(env, { system, user, schema, maxTokens }) {
  if (!env.AI) throw new Busy('workers-ai not bound');
  const out = await env.AI.run(env.CF_MODEL || CF_DEFAULT, {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: schema },
    max_tokens: Math.min(maxTokens, 8000),
    temperature: 0.2,
  });
  return { model: env.CF_MODEL || CF_DEFAULT, data: parseJson(out?.response ?? out) };
}

/** Gemini first; on rate limits or outages fall back to Workers AI. */
async function callModel(env, { rules, context, exams, userText, schema, maxTokens }) {
  const syl = syllabusBlock(context.subject, exams);
  const req = { system: `${rules}\n\n${slidesBlock(context)}${syl ? `\n\n${syl}` : ''}`, user: userText, schema, maxTokens };
  const order = [env.GEMINI_API_KEY && gemini, env.AI && workersAi].filter(Boolean);
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
      skipped.push(String(e.message || e).slice(0, 200)); // busy or unreachable: try the next free model
    }
  }
  throw new AIError("The free AI models are busy or today's free limit is used up. Try again in a minute.", 429);
}

export function ask(env, { context, query, pastList, exams }) {
  return callModel(env, {
    rules: ASK_RULES,
    context,
    exams,
    userText: `PAST QUESTIONS\n${pastList || '(none available for this chapter yet)'}\n\nCurrent slide on the board: ${context.currentSlide || 1}\n\nTEACHER'S REQUEST\n${query}`,
    schema: ASK_SCHEMA,
    maxTokens: 8000,
  });
}

export function quiz(env, { context, count, pastList, exams }) {
  return callModel(env, {
    rules: QUIZ_RULES,
    context,
    exams,
    userText: `PAST QUESTIONS\n${pastList || '(none available for this chapter yet)'}\n\nBuild a quiz of ${count} questions for this chapter for these exams: ${(exams || []).join(', ')}.`,
    schema: QUIZ_SCHEMA,
    maxTokens: 16000,
  });
}
