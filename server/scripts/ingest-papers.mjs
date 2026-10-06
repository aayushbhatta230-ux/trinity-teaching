#!/usr/bin/env node
// Adds a past entrance paper (CEE/MECEE, IOE or IOM) to the AI question bank.
//
//   npm run ingest -- --exam IOE --year 2079 --file "IOE 2079.pdf" [--key "IOE 2079 key.pdf"] [--dry-run]
//
// Reads the PDF with Claude, pulls out every MCQ with its options, answer (from the official
// key when the paper or --key file has one) and the matching app subject/portion, then sends
// them to the AI server. Needs ANTHROPIC_API_KEY, and AI_SERVER + ADMIN_TOKEN unless --dry-run.
// --dry-run only writes <file>.questions.json so the team can check it first; a checked
// JSON file can be sent later with --from-json <file>.questions.json.
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5-5';
const EXAMS = ['CEE', 'IOE', 'IOM'];
const PORTIONS = {
  physics: ['phy.mechanics', 'phy.electricity', 'phy.thermo'],
  chemistry: ['chem.physical', 'chem.organic', 'chem.inorganic'],
  mathematics: ['math.algebra', 'math.analytical', 'math.calculus'],
  biology: ['bio.botany', 'bio.zoology'],
  english: ['eng.general'],
};

function args() {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--dry-run') out.dryRun = true;
    else if (a[i].startsWith('--')) out[a[i].slice(2)] = a[++i];
  }
  return out;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['qno', 'subject', 'portion', 'topic', 'question', 'options', 'answer', 'answer_source', 'difficulty'],
        properties: {
          qno: { type: 'string' },
          subject: { type: 'string', enum: Object.keys(PORTIONS) },
          portion: { type: ['string', 'null'], enum: [...Object.values(PORTIONS).flat(), null] },
          topic: { type: 'string' },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: ['string', 'null'], enum: ['A', 'B', 'C', 'D', null] },
          answer_source: { type: 'string', enum: ['key', 'ai', 'none'] },
          difficulty: { type: 'integer', enum: [1, 2, 3, 4, 5] },
        },
      },
    },
  },
};

const PROMPT = (exam, year) => `This is a past ${exam} entrance exam paper${year ? ` (${year})` : ''} from Nepal, used to prepare +2 Science students. Extract EVERY multiple-choice question.

For each question:
- qno: the question number as printed.
- question: the full question text exactly as printed. Write maths and science notation in plain Unicode (x², √, ∫, →, ⇌, Δ, μ). If the question depends on a figure, describe the figure briefly in square brackets.
- options: exactly the four options A–D as printed, without the letter.
- subject: physics, chemistry, mathematics, biology or english.
- portion: the +2 portion it belongs to. Physics: phy.mechanics (mechanics, properties of matter, waves and sound, gravitation), phy.electricity (electrostatics, current electricity, magnetism, electromagnetic induction, AC), phy.thermo (heat and thermodynamics). Chemistry: chem.physical, chem.organic, chem.inorganic. Mathematics: math.algebra, math.analytical (coordinate geometry, vectors, trigonometry), math.calculus. Biology: bio.botany, bio.zoology. English: eng.general. Use null if it fits none (e.g. optics or modern physics).
- topic: a short topic name, e.g. "Lenz's law", "SN2 mechanism".
- answer and answer_source: if the paper or the answer key provided marks the answer, give it with answer_source "key". Otherwise solve the question carefully; give your answer with answer_source "ai" only if you are sure, else answer null with answer_source "none".
- difficulty: 1 (direct recall) to 5 (hardest: multi-step numericals, conceptual traps, combined ideas), judged for a well-prepared +2 student.

Skip anything that is not an MCQ with four options. Do not invent or reword questions.`;

async function extract({ file, key, exam, year }) {
  const client = new Anthropic();
  const doc = (p) => ({
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: fs.readFileSync(p).toString('base64') },
    title: path.basename(p),
  });
  const content = [doc(file)];
  if (key) content.push(doc(key));
  content.push({ type: 'text', text: PROMPT(exam, year) + (key ? '\n\nThe second document is the official answer key.' : '') });

  let message;
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    });
    message = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('ANTHROPIC_API_KEY is missing or wrong.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the AI service. Wait a minute and run again.');
    if (e instanceof Anthropic.APIError) throw new Error(`AI service error ${e.status}: ${e.message}`);
    throw e;
  }
  if (message.stop_reason === 'refusal') throw new Error('The AI declined to read this paper.');
  if (message.stop_reason === 'max_tokens') throw new Error('The paper is too long for one run. Split the PDF (e.g. by subject) and run each part.');
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const { questions } = JSON.parse(text);
  console.log(`Read ${questions.length} questions (${message.usage.input_tokens} input + ${message.usage.output_tokens} output tokens).`);
  return questions
    .filter((q) => q.options.length === 4)
    .map((q) => ({ ...q, answerSource: q.answer_source }));
}

async function upload({ exam, year, source, questions }) {
  const server = (process.env.AI_SERVER || '').replace(/\/+$/, '');
  const token = process.env.ADMIN_TOKEN;
  if (!server || !token) throw new Error('Set AI_SERVER (e.g. https://trinity-ai.<you>.workers.dev) and ADMIN_TOKEN.');
  const res = await fetch(`${server}/admin/papers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ paper: { exam, year, source }, questions }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Server refused (${res.status}): ${body.error || 'unknown error'}`);
  console.log(`Saved paper #${body.paperId}: ${body.added} questions added, ${body.skipped} skipped.`);
}

const a = args();
const exam = (a.exam || '').toUpperCase();
try {
  if (!EXAMS.includes(exam)) throw new Error(`--exam must be one of ${EXAMS.join(', ')}`);
  let questions;
  if (a['from-json']) {
    questions = JSON.parse(fs.readFileSync(a['from-json'], 'utf8'));
  } else {
    if (!a.file || !fs.existsSync(a.file)) throw new Error('--file must point to the paper PDF');
    questions = await extract({ file: a.file, key: a.key, exam, year: a.year });
  }
  if (a.dryRun) {
    const out = `${a.file}.questions.json`;
    fs.writeFileSync(out, JSON.stringify(questions, null, 2));
    console.log(`Dry run: wrote ${out}. Check it, then run again with --from-json "${out}".`);
  } else {
    await upload({ exam, year: a.year, source: path.basename(a.file || a['from-json']), questions });
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
