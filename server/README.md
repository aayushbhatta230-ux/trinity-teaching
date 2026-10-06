# Trinity Teaching AI server

A small server (a Cloudflare Worker with a D1 database) behind **Ask AI** and **AI Quiz** in the app.
It holds the college's Anthropic API key, so the key never sits on a board or in the public app
download, and it keeps the bank of CEE (MECEE), IOE and IOM past questions.

- **Ask AI**: definitions, formulas, explanations and past MCQs, answered only from the open
  chapter's slides and the past-paper bank, with the slide numbers it used. "Take me to the slide
  about …" opens that slide; the board tries this itself first, so it works without internet.
- **AI Quiz**: the toughest real past questions that match the chapter, hardest first. The answer
  comes from the official key when there is one; otherwise it is marked "worked out by AI". If the
  bank does not have enough matching questions, AI practice questions fill the gap and are labelled.
- Model: `claude-opus-5-5`. Server-side fallback (`fallbacks: "default"`) is on, so if that model
  declines a request the API retries once with its fallback model.
- A college-wide daily limit (`DAILY_LIMIT`, default 400 requests) caps the bill.

## One-time setup

You need a free Cloudflare account and an Anthropic API key (console.anthropic.com).

```bash
cd server
npm install
npx wrangler login
npx wrangler d1 create trinity-ai
```

Copy the `database_id` it prints into `wrangler.toml`, then:

```bash
npm run db:init
npx wrangler secret put ANTHROPIC_API_KEY
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

## Adding past papers

Scan or download each paper as a PDF (one exam and year per file). With an answer key, pass it too.

```bash
cd server
set ANTHROPIC_API_KEY=...
set AI_SERVER=https://trinity-ai.<account>.workers.dev
set ADMIN_TOKEN=...
npm run ingest -- --exam IOE --year 2079 --file "papers/IOE 2079.pdf" --key "papers/IOE 2079 key.pdf"
```

`--exam` is `CEE`, `IOE` or `IOM`. Add `--dry-run` to only write `<file>.questions.json` so a
teacher can check it. Then send the checked file with `--from-json "<file>.questions.json"`.
Each paper is read once, so this is a one-time cost of roughly US$1–3 per paper.

List or remove papers:

```bash
curl -H "Authorization: Bearer %ADMIN_TOKEN%" %AI_SERVER%/admin/papers
curl -X DELETE -H "Authorization: Bearer %ADMIN_TOKEN%" %AI_SERVER%/admin/papers/12
```

## Rough running cost

A chapter's slides are cached between requests during a lesson.

- Ask AI: about US$0.02–0.06 per question.
- AI Quiz (10 questions): about US$0.15–0.40, since it reads the chapter and the past-question shortlist carefully.

## Testing without a key

`node scripts/local-test.mjs 8799` runs the server on this PC in **demo mode**, with an
in-memory database and no AI calls. Demo answers are marked "Demo mode". The test access code
is `test-code-123` and the admin token is `test-admin-456`. On a normal PC, `npm run dev` with a
`.dev.vars` file (`DEMO_MODE=1`, `ACCESS_CODE=…`, `ADMIN_TOKEN=…`) does the same through Wrangler.
