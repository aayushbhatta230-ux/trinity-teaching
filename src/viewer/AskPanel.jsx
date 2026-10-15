/**
 * Ask AI: answers from this chapter's slides first, and any other study question from general
 * knowledge (clearly labelled). Can read a picture: a photo, or the slide on the board.
 */
import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import QuestionCard from './QuestionCard.jsx';
import RichText from '../components/RichText.jsx';
import { askAi, chapterContext, findSlide, getAiConfig, isNavigation, imageFileToDataUrl } from '../lib/ai.js';
import { useBackHandler } from '../lib/native.js';

const SUGGESTIONS = [
  'Key formulas in this chapter',
  '10 toughest MCQs on this chapter',
  'Explain the current slide simply',
  'Make 5 reasoning questions on this chapter',
  'Take me to the slide about ',
];

/** A reply in the shape the panel expects, whatever the AI sent. */
function tidy(r) {
  const nums = (v) => (Array.isArray(v) ? v : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return {
    ...r,
    answer: r?.answer == null ? '' : String(r.answer),
    slide: Number.isInteger(Number(r?.slide)) && Number(r?.slide) > 0 ? Number(r.slide) : null,
    citedSlides: nums(r?.citedSlides),
    questions: (Array.isArray(r?.questions) ? r.questions : [])
      .filter((q) => q && typeof q === 'object' && q.question && Array.isArray(q.options) && q.options.length >= 2),
  };
}

export default function AskPanel({ sel, rec, getSlides, getSlideImage, page, onGoto, onClose }) {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState(null); // JPEG data URL of an attached picture
  const fileRef = useRef(null);
  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setImage(await imageFileToDataUrl(f)); } catch (err) { setState({ status: 'error', message: err.message }); }
  };
  const useSlide = () => {
    const img = getSlideImage?.();
    if (img) setImage(img);
    else setState({ status: 'error', message: 'This slide cannot be sent as a picture (only PDF slides can). Attach a photo instead.' });
  };
  const [state, setState] = useState({ status: 'idle' });
  const inputRef = useRef(null);
  useBackHandler(true, onClose);

  const submit = async (q = query) => {
    q = q.trim();
    if (!q && image) q = 'Explain what this picture shows and solve any question in it.';
    if (!q || state.status === 'busy') return;
    setState({ status: 'busy', q, mcq: /\b(mcqs?|questions?|quiz|practice)\b/i.test(q) });
    try {
      const slides = await getSlides();
      if (!slides.some((s) => s.text) && !image && isNavigation(q)) {
        throw new Error('This presentation has no readable text (its slides are pictures), so it cannot be searched.');
      }
      // Slide navigation is answered on the board first: instant, and works without internet.
      if (!image && isNavigation(q)) {
        const n = findSlide(slides, q);
        if (n) { setState({ status: 'done', q, r: { action: 'goto_slide', slide: n, answer: `Slide ${n} matches that.` } }); return; }
      }
      if (!getAiConfig()) {
        throw new Error(isNavigation(q)
          ? 'No slide in this presentation matches that.'
          : 'AI is not set up on this board yet. Slide search still works — try "Take me to the slide about …".');
      }
      const r = await askAi(chapterContext(sel, rec, slides, page), q, image);
      setState({ status: 'done', q, r: tidy(r) });
    } catch (e) {
      setState({ status: 'error', q, message: e.message || 'Something went wrong.' });
    }
  };

  const pickSuggestion = (s) => {
    if (s.endsWith(' ')) { setQuery(s); inputRef.current?.focus(); return; }
    setQuery(s);
    submit(s);
  };

  // Seconds waited, so a slow answer never looks frozen.
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (state.status !== 'busy') return undefined;
    setWaited(0);
    const t = setInterval(() => setWaited((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [state.status]);

  const r = state.r;
  return (
    <div className="overlay ai-overlay">
      <div className="ai-panel" role="dialog" aria-modal="true" aria-labelledby="ask-title">
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
            placeholder={image ? 'Ask about this picture (or just tap Ask)' : 'Ask anything about this subject, or “Take me to the slide about …”'}
            onChange={(e) => setQuery(e.target.value)}
          />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} aria-label="Attach a photo"><Icon name="camera" size={36} /></button>
          {getSlideImage && <button type="button" className="btn-secondary" onClick={useSlide} aria-label="Use this slide as a picture"><Icon name="image" size={36} /></button>}
          <button className="btn-primary ai-go" disabled={(!query.trim() && !image) || state.status === 'busy'}>
            <Icon name="search" size={40} stroke={2.25} /><span>Ask</span>
          </button>
        </form>
        {image && (
          <div className="ai-attach">
            <div className="ai-thumb"><img src={image} alt="Attached picture" /><button onClick={() => setImage(null)} aria-label="Remove picture"><Icon name="close" size={20} /></button></div>
            <span className="ai-source">The AI will read this picture with your question.</span>
          </div>
        )}
        <div className="ai-body">
          {state.status === 'idle' && (
            <div className="ai-suggest">
              <p>Answers come from <b>Chapter {rec.chapter}: {rec.title}</b> first. Other study questions are answered too, and marked as not from the slides. Tap the camera to attach a photo{getSlideImage ? ', or the picture button to ask about this slide' : ''}.</p>
              <div className="ai-chips">
                {SUGGESTIONS.map((s) => <button key={s} className="btn-secondary" onClick={() => pickSuggestion(s)}>{s.trim()}{s.endsWith(' ') ? '…' : ''}</button>)}
              </div>
            </div>
          )}
          {state.status === 'busy' && (
            <div className="ai-wait"><span className="spinner" /> {state.mcq ? 'Building exam-style questions…' : image ? 'Reading the picture…' : 'Reading the slides…'} <span className="ai-waited">{waited}s</span></div>
          )}
          {state.status === 'error' && (
            <div className="dialog-error ai-error" role="alert">
              <Icon name="alert" size={36} /> <span>{state.message}</span>
              {state.q && <button className="btn-secondary ai-retry" onClick={() => submit(state.q)}>Try again</button>}
            </div>
          )}
          {state.status === 'done' && (
            <div className="ai-result">
              <div className="ai-q">“{state.q}”</div>
              {r.demo && <div className="ai-demo">Demo mode — the AI is not connected yet</div>}
              {r.action === 'general' && <div className="ai-source">Not from this chapter’s slides: a general answer</div>}
              {r.action === 'image' && <div className="ai-source">Answer from the picture</div>}
              {r.answer && <RichText className={`ai-answer ${r.action === 'not_in_material' ? 'is-missing' : ''} ${r.action === 'general' ? 'is-general' : ''}`} text={r.answer} />}
              {r.action === 'goto_slide' && r.slide && (
                onGoto
                  ? <button className="btn-primary ai-goto" onClick={() => { onGoto(r.slide); onClose(); }}><Icon name="next" size={40} stroke={2.25} /><span>Go to slide {r.slide}</span></button>
                  : <div className="ai-source">It is slide {r.slide} of the presentation.</div>
              )}
              {r.citedSlides.length > 0 && (
                <div className="ai-cites">
                  <span>From slide{r.citedSlides.length > 1 ? 's' : ''}:</span>
                  {r.citedSlides.map((n) => (onGoto
                    ? <button key={n} className="ai-cite" onClick={() => { onGoto(n); onClose(); }}>{n}</button>
                    : <span key={n} className="ai-cite">{n}</span>))}
                </div>
              )}
              {r.questions.map((q, i) => (
                <QuestionCard key={q.id ?? i} q={q} number={i + 1} onSlide={onGoto ? (n) => { onGoto(n); onClose(); } : undefined} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
