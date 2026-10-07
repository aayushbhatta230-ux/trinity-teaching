/**
 * Ask AI: search the chapter for formulas, definitions and past MCQs, or jump to a slide.
 * Everything is answered from this presentation's slides and the past-paper bank.
 */
import { useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import QuestionCard from './QuestionCard.jsx';
import RichText from '../components/RichText.jsx';
import { askAi, chapterContext, findSlide, getAiConfig, isNavigation } from '../lib/ai.js';
import { useBackHandler } from '../lib/native.js';

const SUGGESTIONS = [
  'Key formulas in this chapter',
  'Toughest past MCQs on this chapter',
  'Explain the current slide simply',
  'Take me to the slide about ',
];

export default function AskPanel({ sel, rec, getSlides, page, onGoto, onClose }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle' });
  const inputRef = useRef(null);
  useBackHandler(true, onClose);

  const submit = async (q = query) => {
    q = q.trim();
    if (!q || state.status === 'busy') return;
    setState({ status: 'busy' });
    try {
      const slides = await getSlides();
      if (!slides.some((s) => s.text)) {
        throw new Error('This PDF has no readable text (its slides are pictures), so it cannot be searched.');
      }
      // Slide navigation is answered on the board first: instant, and works without internet.
      if (isNavigation(q)) {
        const n = findSlide(slides, q);
        if (n) { onGoto(n); onClose(); return; }
      }
      if (!getAiConfig()) {
        throw new Error(isNavigation(q)
          ? 'No slide in this presentation matches that.'
          : 'AI is not set up on this board yet. Slide search still works — try "Take me to the slide about …".');
      }
      const r = await askAi(chapterContext(sel, rec, slides, page), q);
      if (r.action === 'goto_slide' && r.slide) { onGoto(r.slide); onClose(); return; }
      setState({ status: 'done', q, r });
    } catch (e) {
      setState({ status: 'error', message: e.message || 'Something went wrong.' });
    }
  };

  const pickSuggestion = (s) => {
    if (s.endsWith(' ')) { setQuery(s); inputRef.current?.focus(); return; }
    setQuery(s);
    submit(s);
  };

  const r = state.r;
  return (
    <div className="overlay ai-overlay" onClick={onClose}>
      <div className="ai-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ask-title">
        <div className="overlay-head">
          <h2 id="ask-title"><Icon name="sparkles" size={40} /> Ask AI</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" size={48} /></button>
        </div>
        <form className="ai-ask" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            ref={inputRef}
            className="text-input"
            value={query}
            maxLength={300}
            placeholder="Ask about this chapter, or “Take me to the slide about …”"
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-primary ai-go" disabled={!query.trim() || state.status === 'busy'}>
            <Icon name="search" size={40} stroke={2.25} /><span>Ask</span>
          </button>
        </form>
        <div className="ai-body">
          {state.status === 'idle' && (
            <div className="ai-suggest">
              <p>Answers come only from <b>Chapter {rec.chapter}: {rec.title}</b> and the IOE and IOM entrance syllabus and past papers.</p>
              <div className="ai-chips">
                {SUGGESTIONS.map((s) => <button key={s} className="btn-secondary" onClick={() => pickSuggestion(s)}>{s.trim()}{s.endsWith(' ') ? '…' : ''}</button>)}
              </div>
            </div>
          )}
          {state.status === 'busy' && <div className="ai-wait"><span className="spinner" /> Reading the slides…</div>}
          {state.status === 'error' && <div className="dialog-error" role="alert"><Icon name="alert" size={36} /> {state.message}</div>}
          {state.status === 'done' && (
            <div className="ai-result">
              <div className="ai-q">“{state.q}”</div>
              {r.demo && <div className="ai-demo">Demo mode — the AI is not connected yet</div>}
              {r.answer && <RichText className={`ai-answer ${r.action === 'not_in_material' ? 'is-missing' : ''}`} text={r.answer} />}
              {r.citedSlides?.length > 0 && (
                <div className="ai-cites">
                  <span>From slide{r.citedSlides.length > 1 ? 's' : ''}:</span>
                  {r.citedSlides.map((n) => (
                    <button key={n} className="ai-cite" onClick={() => { onGoto(n); onClose(); }}>{n}</button>
                  ))}
                </div>
              )}
              {r.questions?.map((q, i) => (
                <QuestionCard key={q.id} q={q} number={i + 1} onSlide={(n) => { onGoto(n); onClose(); }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
