# Trinity Teaching AI server

A small server (a Cloudflare Worker with a D1 database) behind **Ask AI** and **AI Quiz** in the app.
It uses **free AI models only** and keeps the bank of IOE and IOM past questions.
Any key stays on the server, never on a board or in the public app download.

- **Ask AI**: definitions, formulas, explanations and past MCQs, answered only from the open
  chapter's slides and the past-paper bank, with the slide numbers it used. "Take me to the slide
  about …" opens that slide; the board tries this itself first, so it works without internet.
- **AI Quiz**: the toughest real past questions that match the chapter, hardest first. The answer
  comes from the official key when there is one; otherwise it is marked "worked out by AI". If the
  bank does not have enough matching questions, AI practice questions fill the gap and are labelled.
- Models, both free:
  1. **Google Gemini** (`GEMINI_MODEL`, default `gemini-3.5-flash`), using the free tier of a Google AI Studio key.
  2. **Cloudflare Workers AI** (`CF_MODEL`, default Llama 3.3 70B). It is free up to 10,000 "neurons" a day
     (roughly 100–200 answers) and needs no key.
  Gemini answers first. If its free limit is reached for the minute or the day, Workers AI answers instead.
- A college-wide daily limit (`DAILY_LIMIT`, default 400 requests) keeps usage inside the free limits.

## What the AI knows

[src/syllabus.js](src/syllabus.js) holds the official entrance syllabi, summarised unit by unit:
- **IOM (medical):** the medical entrance is held as the Medical Education Commission's common entrance. This is its syllabus, third revision of 28 April 2026, with the number of questions per unit.
- **IOE:** the B.E./B.Arch. entrance syllabus, with subject marks and chapter topics.

With every request the AI gets the open chapter's slides, the syllabus of the exams that test that subject, and any matching past questions. Physical group classes get IOE. Biology group classes get IOM and IOE, each subject only where that exam tests it: biology is IOM only, mathematics and English are IOE only. Practice questions are written in the chosen exam's style for a syllabus unit the chapter covers, and are labelled "AI practice · IOE style" and so on. Real past questions always come first once papers are added.

If a syllabus is revised, update `src/syllabus.js` and run `npm run deploy`.

## One-time setup

You need a free Cloudflare account. For better answers, also get a free Gemini key at
https://aistudio.google.com/apikey (sign in with a Google account, no card needed).

```bash
cd server
npm install
npx wrangler login
npx wrangler d1 create trinity-ai
```

Copy the `database_id` it prints into `wrangler.toml`, then:

```bash
npm run db:init
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ACCESS_CODE
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

- `ACCESS_CODE`: the school code typed once on each board. Choose something long.
- `ADMIN_TOKEN`: a different long secret, only for the team that adds past papers.

`deploy` prints the server address, e.g. `https://trinity-ai.<account>.workers.dev`.

## Turning AI on for a board

On the home screen, **press and hold the Trinity logo for 3 seconds**. Enter the server address and
the access code, then tap **Save and test**. It shows how many past questions are in the bank.
Each board has to be set up once. The same dialog shows the board's screen details, which help with support.

## The question bank (IOE and IOM practice questions)

The college's practice question sets (JSONL, one set for Grade 11 and a cumulative set for Grade 12) are imported with:

```bash
cd server
node scripts/import-bank.mjs Grade11.jsonl Grade12_CUMULATIVE.jsonl bank.sql
npx wrangler d1 execute trinity-ai --remote --file=bank.sql
```

The import:
- strips filler wording ("Choose the correct option: …") and merges duplicates;
- drops Mental Agility items and items without four distinct options;
- maps MECEE-BL to IOM;
- tags questions from the Grade 11 set as grade 11 (used for Class 11 and 12), and the rest as grade 12 (Class 12 only).

Running it again replaces the previous import.

These are practice questions, not past papers. The app labels them **"Question bank · IOE/IOM"**.

**Answer checking.** Every question is solved independently by Gemini in the background, every 5 minutes, 15 at a time (`verifyBatch` in `src/index.js`). A question is used in class only once its key is confirmed, or, for a question with no key, once the AI has worked out an answer (shown as "worked out by AI"). Questions where the AI disagrees with the key (`verified = -2`, AI answer in `check_answer`) or finds the question ambiguous (`verified = -1`) are held back for review. `/health` shows the progress.

**Chapter matching.** A question is offered only when it belongs to the open chapter: two of its specific words (question plus correct answer) appear in the slides, or one does and its topic is clearly the chapter's. `node scripts/bank-match-test.mjs bank.sql.json` shows the matches for sample chapters.

## Adding past papers

Scan or download each paper as a PDF (one exam and year per file). With an answer key, pass it too.

```bash
cd server
set GEMINI_API_KEY=...
set AI_SERVER=https://trinity-ai.<account>.workers.dev
set ADMIN_TOKEN=...
npm run ingest -- --exam IOE --year 2079 --file "papers/IOE 2079.pdf" --key "papers/IOE 2079 key.pdf"
```

`--exam` is `IOE` or `IOM`. Add `--dry-run` to only write `<file>.questions.json` so a
teacher can check it. Then send the checked file with `--from-json "<file>.questions.json"`.
Reading papers is free with the Gemini key. If the free per-minute limit is hit, the script waits and retries.

List or remove papers:

```bash
curl -H "Authorization: Bearer %ADMIN_TOKEN%" %AI_SERVER%/admin/papers
curl -X DELETE -H "Authorization: Bearer %ADMIN_TOKEN%" %AI_SERVER%/admin/papers/12
```

## Cost and limits

Nothing is paid, as long as you stay on the free tiers and never add a billing account to the
Google project or a paid plan to Cloudflare.

- The free limits change from time to time (see https://ai.google.dev/gemini-api/docs/rate-limits and
  https://developers.cloudflare.com/workers-ai/platform/pricing/). When both models are busy, the board
  says "Try again in a minute".
- On the free tier Google may use what is sent to improve its products. That is only slide text and
  exam questions, never student data.
- If a model is renamed or retired, change `GEMINI_MODEL` or `CF_MODEL` in `wrangler.toml` and run `npm run deploy`.

## Testing without a key

`node scripts/mock-test.mjs` checks the Gemini → Workers AI switching with fake replies.
`node scripts/local-test.mjs 8799` runs the server on this PC in **demo mode**, with an
in-memory database and no AI calls. Demo answers are marked "Demo mode". The test access code
is `test-code-123` and the admin token is `test-admin-456`. On a normal PC, `npm run dev` with a
`.dev.vars` file (`DEMO_MODE=1`, `ACCESS_CODE=…`, `ADMIN_TOKEN=…`) does the same through Wrangler.
