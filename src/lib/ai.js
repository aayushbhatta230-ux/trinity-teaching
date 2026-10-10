/**
 * Ask AI and AI Quiz: talks to the college's own AI server (server/ in this repo).
 *
 * The college's server address and access code are built into the app (vite.config.js), so
 * every board works without setup. The hidden AI setup (press and hold the logo on the home
 * screen for 3 seconds) can point one board at a different server or code.
 *
 * Slide navigation also works offline: findSlide() searches the slide text on the board.
 */
import { getPortion, getSubject, getClass } from './catalog.js';

const CONFIG_KEY = 'trinity-ai';
// eslint-disable-next-line no-undef
const BUILT_IN = typeof __AI_DEFAULT__ !== 'undefined' ? __AI_DEFAULT__ : null;

/** This board's own setting if it has one, otherwise the college server built into the app. */
export function getAiConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
    if (c?.url && c?.code) return c;
  } catch { /* storage unavailable */ }
  return BUILT_IN?.url && BUILT_IN?.code ? BUILT_IN : null;
}

export const isBuiltInAi = () => {
  try { return !localStorage.getItem(CONFIG_KEY) && !!BUILT_IN; } catch { return !!BUILT_IN; }
};

export function setAiConfig(cfg) {
  try {
    if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(CONFIG_KEY);
  } catch { /* storage unavailable */ }
}

export const normaliseUrl = (u) => {
  let s = String(u || '').trim();
  if (s && !/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/+$/, '');
};

class AiError extends Error {}

async function call(path, { method = 'POST', body, cfg = getAiConfig(), timeout = 60000 } = {}) {
  if (!cfg) throw new AiError('AI is not set up on this board yet.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(`${cfg.url}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-access-code': cfg.code },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new AiError(e?.name === 'AbortError' ? 'The AI is busy right now and did not answer in time. Tap Try again.' : 'No internet connection to the AI server.');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new AiError(data.error || `The AI server returned an error (${res.status}).`), { status: res.status });
  return data;
}

/** Checks the address and the access code. Resolves to the server's /health info. */
export async function testAiConfig(cfg) {
  const health = await call('/health', { method: 'GET', cfg, timeout: 15000 });
  try {
    await call('/ask', { cfg, body: {}, timeout: 15000 }); // 400 "missing" = the code was accepted
  } catch (e) {
    if (e.status !== 400) throw e;
  }
  return health;
}

/** The chapter as the AI sees it. */
export function chapterContext(sel, rec, slides, currentSlide) {
  return {
    cls: getClass(sel.cls)?.label?.replace(/^Class\s*/i, '') || sel.cls,
    group: sel.group,
    subject: sel.subject,
    subjectLabel: getSubject(sel.subject)?.label || sel.subject,
    portion: sel.portion,
    portionLabel: getPortion(sel.portion)?.label || '',
    chapter: rec.chapter,
    title: rec.title,
    currentSlide,
    slides,
  };
}

export const askAi = (context, query) => call('/ask', { body: { context, query }, timeout: 100000 });
export const quizAi = (context, { count, exams }) => call('/quiz', { body: { context, count, exams }, timeout: 240000 });

// ---------- offline slide search ----------

const STOP = new Set('the a an and or of to in on for with by from at as is are about slide slides take me go open show find page please what which where'.split(' '));
const words = (t = '') => (t.toLowerCase().match(/[a-z0-9ऀ-ॿ]+/g) || [])
  .map((w) => w.replace(/['’]s$/, '').replace(/([^s])s$/, '$1'))
  .filter((w) => w.length > 1 && !STOP.has(w));

/** Is this a "take me to the slide about …" request? */
export const isNavigation = (q) => /\b(take me|go to|open|show( me)?|jump to|find)\b.*\bslides?\b|\bslides? (about|on|for|with)\b/i.test(q);

/** Best slide for a request by word overlap (title-like first lines count double). */
export function findSlide(slides, query) {
  const want = words(query);
  if (!want.length) return null;
  let best = null;
  for (const s of slides) {
    const lines = (s.text || '').split('\n');
    const head = new Set(words(lines.slice(0, 2).join(' ')));
    const all = new Set(words(s.text));
    let score = 0;
    for (const w of want) score += (all.has(w) ? 1 : 0) + (head.has(w) ? 1 : 0);
    if (score > 0 && (!best || score > best.score)) best = { n: s.n, score };
  }
  // Confident only when most of the request's words were found.
  return best && best.score >= Math.max(1, want.length) ? best.n : null;
}
