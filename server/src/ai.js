// Claude calls for Ask and Quiz. Every answer is grounded in the chapter's slides and the
// shortlisted past questions that the app/server put into the prompt.
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';

const RULES_COMMON = `You work inside Trinity Teaching, the classroom app used on interactive boards at Trinity International SS & College, Kathmandu, for +2 Science. A teacher is teaching one chapter, and the students are preparing for the CEE (MECEE), IOE and IOM entrance exams.

Ground rules:
- Use only the material given here: the teacher's SLIDES (numbered) and the PAST QUESTIONS (real CEE/MECEE, IOE and IOM entrance questions, each with an id). Do not add facts that are not in them.
- Never invent an exam, a year or a past question. Only ids from PAST QUESTIONS are real past questions.
- Write for a classroom board: short, clear sentences, plain text with line breaks. Write formulas in plain Unicode, e.g. ε = −dΦ/dt, v² = u² + 2as. No markdown headings or tables.`;

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
- If a past question has no answer in the key, solve it carefully and give your answer; the app labels it "answer worked out by AI".
- Only if there are not enough suitable past questions, add practice questions you write yourself in the same style and difficulty, based strictly on the SLIDES. For those set question_id null and fill question, four options and answer. Never present a practice question as a past question.
- For every item give a short explanation (one or two sentences) of why the answer is correct, and the related slide number if there is one.`;

const ASK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
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
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question_id', 'question', 'options', 'answer', 'explanation', 'slide'],
        properties: {
          question_id: { type: ['integer', 'null'] },
          question: { type: ['string', 'null'] },
          options: { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'null' }] },
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

/** One structured-output call to Claude, with refusal fallback and prompt caching of the slides. */
async function callClaude(env, { rules, context, userText, schema, effort, maxTokens }) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let message;
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      system: [
        { type: 'text', text: rules },
        // The chapter's slides change rarely within a lesson: cache them across requests.
        { type: 'text', text: slidesBlock(context), cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userText }],
    });
    message = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AIError('The AI service is busy. Try again in a minute.', 429);
    if (e instanceof Anthropic.AuthenticationError) throw new AIError('The AI server is not set up correctly (API key).', 500);
    if (e instanceof Anthropic.APIError) throw new AIError(`The AI service returned an error (${e.status}).`, 502);
    throw new AIError('Could not reach the AI service.', 502);
  }
  if (message.stop_reason === 'refusal') throw new AIError('The AI declined this request.', 422);
  if (message.stop_reason === 'max_tokens') throw new AIError('The answer was too long. Ask for fewer items.', 422);
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new AIError('The AI returned an unreadable answer. Try again.', 502);
  }
}

export function ask(env, { context, query, pastList }) {
  return callClaude(env, {
    rules: ASK_RULES,
    context,
    userText: `PAST QUESTIONS\n${pastList || '(none available for this chapter yet)'}\n\nCurrent slide on the board: ${context.currentSlide || 1}\n\nTEACHER'S REQUEST\n${query}`,
    schema: ASK_SCHEMA,
    effort: 'low',
    maxTokens: 16000,
  });
}

export function quiz(env, { context, count, pastList }) {
  return callClaude(env, {
    rules: QUIZ_RULES,
    context,
    userText: `PAST QUESTIONS\n${pastList || '(none available for this chapter yet)'}\n\nBuild a quiz of ${count} questions for this chapter.`,
    schema: QUIZ_SCHEMA,
    effort: 'high',
    maxTokens: 48000,
  });
}
