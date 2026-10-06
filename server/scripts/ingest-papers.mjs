#!/usr/bin/env node
// Adds a past entrance paper (IOE or IOM) to the AI question bank.
//
//   npm run ingest -- --exam IOE --year 2079 --file "IOE 2079.pdf" [--key "IOE 2079 key.pdf"] [--dry-run]
//
// Reads the PDF with Google Gemini (free tier), pulls out every MCQ with its options, answer (from the official
// key when the paper or --key file has one) and the matching app subject/portion, then sends
// them to the AI server. Needs GEMINI_API_KEY (free, aistudio.google.com/apikey), and AI_SERVER + ADMIN_TOKEN unless --dry-run.
// --dry-run only writes <file>.questions.json so the team can check it first; a checked
// JSON file can be sent later with --from-json <file>.questions.json.
import fs from 'node:fs';
import path from 'node:path';

// Settings saved by setup.ps1 (AI_SERVER, ADMIN_TOKEN, GEMINI_API_KEY), unless already set.
const saved = new URL('../.admin.env', import.meta.url);
if (fs.existsSync(saved)) {
  for (const line of fs.readFileSync(saved, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(\w+)=(.*)$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const EXAMS = ['IOE', 'IOM'];
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
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
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
  if (!process.env.GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY (free key from https://aistudio.google.com/apikey).');
  const pdf = (p) => ({ inline_data: { mime_type: 'application/pdf', data: fs.readFileSync(p).toString('base64') } });
  const parts = [pdf(file)];
  if (key) parts.push(pdf(key));
  parts.push({ text: PROMPT(exam, year) + (key ? '\n\nThe second document is the official answer key.' : '') });

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: SCHEMA, maxOutputTokens: 65536, temperature: 0.1 },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      console.log(`Gemini is busy (${res.status}); waiting a minute (free tier limit)…`);
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${data.error?.message || 'unknown'}`);
    const cand = data.candidates?.[0];
    if (!cand) throw new Error('Gemini declined to read this paper.');
    if (cand.finishReason === 'MAX_TOKENS') throw new Error('The paper is too long for one run. Split the PDF (e.g. by subject) and run each part.');
    const text = (cand.content?.parts || []).map((p) => p.text || '').join('');
    const { questions } = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
    console.log(`Read ${questions.length} questions.`);
    return questions
      .filter((q) => Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({ ...q, answerSource: q.answer_source }));
  }
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
