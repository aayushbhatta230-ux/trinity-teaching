// AI calls for Ask and Quiz, on free models only:
//   1. Google Gemini (free tier, key from aistudio.google.com)        GEMINI_MODEL
//   2. Cloudflare Workers AI (free daily allowance, no key needed)     CF_MODEL
// Gemini is tried first; if it is rate-limited or down, Workers AI answers instead.
// Every answer is grounded in the chapter's slides and the shortlisted past questions.

export const MODEL = 'gemini (free) + workers-ai fallback';
const GEMINI_DEFAULT = 'gemini-3.5-flash';
const CF_DEFAULT = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const RULES_COMMON = `You work inside Trinity Teaching, the classroom app used on interactive boards at Trinity International SS & College, Kathmandu, for +2 Science. A teacher is teaching one chapter, and the students are preparing for the CEE (MECEE), IOE and IOM entrance exams.

Ground rules:
- Use only the material given here: the teacher's SLIDES (numbered) and the PAST QUESTIONS (real CEE/MECEE, IOE and IOM entrance questions, each with an id). Do not add facts that are not in them.
- Never invent an exam, a year or a past question. Only ids from PAST QUESTIONS are real past questions.
- Write for a classroom board: short, clear sentences, plain text with line breaks. Write formulas in plain Unicode, e.g. ε = −dΦ/dt, v² = u² + 2as. No markdown headings or tables.
- Reply with JSON only, matching the requested shape.`;

const ASK_RULES = `${RULES_COMMON}

You receive one request from the teacher and choose exactly one action:
- "goto_slide": they want to open or see a slide about something. Set slide to the best matching slide number and write a one-line answer naming it.
- "show_questions": they want MCQs or past questions. Put up to 10 ids from PAST QUESTIONS in question_ids, most relevant and hardest first, and a one-line answer. If none fit, use "not_in_material".
- "answer": a definition, formula, explanation, comparison or summary. Answer from the slides in at most 120 words and list the slide numbers you used in cited_slides.
- "not_in_material": the slides and past questions do not cover it. Say so in one or two sentences and mention what the chapter does cover.
Fields that do not apply to the chosen action: slide null, cited_slides [], question_ids [].`;

const QUIZ_RULES = `${RULES_COMMON}

Build a classroom quiz of the requested length for this chapter.
- Choose from PAST QUESTIONS only questions that test what this chapter's SLIDES teach.
- Prefer the toughest ones: multi-step numericals, conceptual traps, questions that combine ideas. Order the quiz hardest first.
- Use past questions exactly as given: set question_id and leave question and options null. Never change their wording, options or answer.
- If a past question has no answer in the key, solve it carefully step by step and give your answer; the app labels it "answer worked out by AI".
- Only if there are not enough suitable past questions, add practice questions you write yourself in the same style and difficulty, based strictly on the SLIDES. For those set question_id null and fill question, four options and answer. Never present a practice question as a past question.
- For every item give a short explanation (one or two sentences) of why the answer is correct, and the related slide number if there is one.`;

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
        required: ['question_id', 'question', 'options', 'answer', 'explanation', 'slide'],
        properties: {
          question_id: { type: ['integer', 'null'] },
          question: { type: ['string', 'null'] },
          options: { type: ['array', 'null'], items: { type: 'string' } },
          answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation: { type: 'string' },
          slide: { type: ['integer', 'null'] },
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

async function gemini(env, { system, user, schema, maxTokens }) {
  const model = env.GEMINI_MODEL || GEMINI_DEFAULT;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens, temperature: 0.2 },
    }),
  });
  if (res.status === 429 || res.status >= 500) throw new Busy(`gemini ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new AIError(`The AI server is not set up correctly (Gemini: ${data.error?.message || res.status}).`, 500);
    throw new Busy(`gemini ${res.status}`);
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
  return parseJson(out?.response ?? out);
}

/** Gemini first; on rate limits or outages fall back to Workers AI. */
async function callModel(env, { rules, context, userText, schema, maxTokens }) {
  const req = { system: `${rules}\n\n${slidesBlock(context)}`, user: userText, schema, maxTokens };
  const order = [env.GEMINI_API_KEY && gemini, env.AI && workersAi].filter(Boolean);
  if (!order.length) throw new AIError('The AI server has no AI model set up.', 500);
  for (const fn of order) {
    try {
      return await fn(env, req);
    } catch (e) {
      if (e instanceof AIError) throw e;
      // Busy or network trouble: try the next free model.
    }
  }
  throw new AIError("The free AI models are busy or today's free limit is used up. Try again in a minute.", 429);
}

export function ask(env, { context, query, pastList }) {
  return callModel(env, {
    rules: ASK_RULES,
    context,
    userText: `PAST QUESTIONS\n${pastList || '(none available for this chapter yet)'}\n\nCurrent slide on the board: ${context.currentSlide || 1}\n\nTEACHER'S REQUEST\n${query}`,
    schema: ASK_SCHEMA,
    maxTokens: 8000,
  });
}

export function quiz(env, { context, count, pastList }) {
  return callModel(env, {
    rules: QUIZ_RULES,
    context,
    userText: `PAST QUESTIONS\n${pastList || '(none available for this chapter yet)'}\n\nBuild a quiz of ${count} questions for this chapter.`,
    schema: QUIZ_SCHEMA,
    maxTokens: 16000,
  });
}
