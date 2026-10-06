// DEMO_MODE: answers without calling the AI, so the app can be tested end to end with no key.
// Same output shapes as ai.js. Never used when DEMO_MODE is "0".
import { terms } from './bank.js';

function bestSlide(context, text) {
  const want = new Set(terms(text));
  let best = { n: context.currentSlide || 1, s: 0 };
  for (const sl of context.slides || []) {
    const s = terms(sl.text).filter((w) => want.has(w)).length;
    if (s > best.s) best = { n: sl.n, s };
  }
  return best;
}

export function ask({ context, query, past }) {
  const q = query.toLowerCase();
  const hit = bestSlide(context, query);
  if (/\b(take me|go to|open|show)\b.*\bslide\b|\bslide (about|on|for)\b/.test(q)) {
    return { action: 'goto_slide', answer: `(demo) Opening slide ${hit.n}.`, slide: hit.n, cited_slides: [], question_ids: [] };
  }
  if (/\b(mcq|mcqs|question|questions|past)\b/.test(q)) {
    if (!past.length) return { action: 'not_in_material', answer: '(demo) No past questions in the bank for this chapter yet.', slide: null, cited_slides: [], question_ids: [] };
    return { action: 'show_questions', answer: `(demo) ${Math.min(past.length, 5)} past questions on this topic.`, slide: null, cited_slides: [], question_ids: past.slice(0, 5).map((p) => p.id) };
  }
  if (!hit.s) return { action: 'not_in_material', answer: '(demo) This chapter\'s slides do not cover that.', slide: null, cited_slides: [], question_ids: [] };
  const text = (context.slides.find((s) => s.n === hit.n)?.text || '').replace(/\s+/g, ' ').slice(0, 260);
  return { action: 'answer', answer: `(demo) From slide ${hit.n}: ${text}`, slide: null, cited_slides: [hit.n], question_ids: [] };
}

export function quiz({ context, count, past }) {
  const items = past.slice(0, count).map((p) => ({
    question_id: p.id, question: null, options: null, answer: p.answer || 'A',
    explanation: '(demo) Explanation appears here when the AI is connected.', slide: null,
  }));
  for (const s of context.slides || []) {
    if (items.length >= count) break;
    const line = (s.text || '').split('\n').map((l) => l.trim()).find((l) => l.length > 12);
    if (!line) continue;
    items.push({
      question_id: null,
      question: `(demo practice) Which statement matches slide ${s.n}?`,
      options: [line.slice(0, 90), 'None of these', 'Both A and B are wrong', 'Cannot be determined'],
      answer: 'A',
      explanation: `(demo) Taken from slide ${s.n}.`,
      slide: s.n,
      style: 'CEE',
      unit: '(demo unit)',
    });
  }
  return { items };
}
