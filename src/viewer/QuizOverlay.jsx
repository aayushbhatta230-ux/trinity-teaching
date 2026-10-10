/**
 * AI Quiz: the toughest real IOE / IOM past questions that match this chapter,
 * one at a time on the board. AI practice questions only fill gaps and are labelled.
 */
import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import QuestionCard from './QuestionCard.jsx';
import { chapterContext, getAiConfig, quizAi } from '../lib/ai.js';
import { useBackHandler } from '../lib/native.js';

const EXAMS = [
  { id: 'IOE', label: 'IOE (Engineering)' },
  { id: 'IOM', label: 'IOM (Medical)' },
];
const COUNTS = [10, 20, 30, 50];
const MIN_COUNT = 5;
const MAX_COUNT = 50;
// Which entrance exams test each subject (official syllabi) …
const TESTED = {
  physics: ['IOE', 'IOM'],
  chemistry: ['IOE', 'IOM'],
  biology: ['IOM'],
  mathematics: ['IOE'],
  english: ['IOE'],
};
// … and which exams each group prepares for.
const GROUP_EXAMS = { PHY: ['IOE'], BIO: ['IOM', 'IOE'] };

export default function QuizOverlay({ sel, rec, getSlides, page, onGoto, onClose }) {
  const offered = EXAMS.filter((e) => (TESTED[sel.subject] || []).includes(e.id) && (GROUP_EXAMS[sel.group] || []).includes(e.id));
  const [exams, setExams] = useState(offered.map((e) => e.id));
  const [count, setCount] = useState(10);
  const [state, setState] = useState({ status: 'setup' });
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ right: 0, done: 0 });
  useBackHandler(true, onClose);

  const toggle = (id) => setExams((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const start = async () => {
    setState({ status: 'busy' });
    try {
      if (!getAiConfig()) throw new Error('AI is not set up on this board yet.');
      const slides = await getSlides();
      if (!slides.some((s) => s.text)) throw new Error('This presentation has no readable text (its slides are pictures), so a quiz cannot be made from it.');
      const r = await quizAi(chapterContext(sel, rec, slides, page), { count, exams });
      if (!r.items?.length) throw new Error('No questions could be made for this chapter yet.');
      setIndex(0);
      setScore({ right: 0, done: 0 });
      setState({ status: 'quiz', items: r.items, pastAvailable: r.pastAvailable, demo: r.demo });
    } catch (e) {
      setState({ status: 'setup', error: e.message || 'Something went wrong.' });
    }
  };

  const items = state.items || [];
  const item = items[index];
  const pastCount = items.filter((q) => q.kind === 'past' || q.kind === 'bank').length;

  return (
    <div className="overlay ai-overlay">
      <div className="ai-panel quiz-panel" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
        <div className="overlay-head">
          <h2 id="quiz-title"><Icon name="trophy" size={40} /> AI Quiz · Chapter {rec.chapter}</h2>
          {state.status === 'quiz' && <span className="quiz-progress">{Math.min(index + 1, items.length)} / {items.length}</span>}
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="close" size={48} /></button>
        </div>

        {(state.status === 'setup' || state.status === 'busy') && (
          <div className="ai-body quiz-setup">
            <p className="quiz-lead">Toughest <b>real past questions</b> that match <b>{rec.title}</b>, hardest first, then practice questions on the official entrance syllabus.</p>
            {!offered.length && <div className="quiz-note">The entrance exams for this group do not test this subject.</div>}
            <div className="quiz-row">
              <span className="field-label">Entrance exams</span>
              <div className="ai-chips">
                {offered.map((e) => (
                  <button key={e.id} className={`btn-secondary ${exams.includes(e.id) ? 'is-on' : ''}`} onClick={() => toggle(e.id)}>
                    {exams.includes(e.id) && <Icon name="check" size={30} stroke={2.5} />}{e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="quiz-row">
              <span className="field-label">Questions (toughest first)</span>
              <div className="ai-chips quiz-count">
                <div className="stepper-input">
                  <button onClick={() => setCount((c) => Math.max(MIN_COUNT, c - 5))} disabled={count <= MIN_COUNT} aria-label="Fewer questions">
                    <Icon name="minus" size={36} stroke={2.25} />
                  </button>
                  <span className="stepper-value">{count}</span>
                  <button onClick={() => setCount((c) => Math.min(MAX_COUNT, c + 5))} disabled={count >= MAX_COUNT} aria-label="More questions">
                    <Icon name="plus" size={36} stroke={2.25} />
                  </button>
                </div>
                {COUNTS.map((n) => (
                  <button key={n} className={`btn-secondary ${count === n ? 'is-on' : ''}`} onClick={() => setCount(n)}>{n}</button>
                ))}
              </div>
              {count > 20 && <span className="quiz-hint">A large quiz takes about {Math.round((count * 4) / 60)} minutes to prepare.</span>}
            </div>
            {state.error && <div className="dialog-error" role="alert"><Icon name="alert" size={36} /> {state.error}</div>}
            <button className="btn-primary btn-wide" onClick={start} disabled={!exams.length || !offered.length || state.status === 'busy'}>
              {state.status === 'busy' ? <><span className="spinner" /> Choosing the toughest questions…</> : <><Icon name="trophy" size={44} /> Start quiz</>}
            </button>
          </div>
        )}

        {state.status === 'quiz' && item && (
          <div className="ai-body">
            {state.demo && <div className="ai-demo">Demo mode — the AI is not connected yet</div>}
            {index === 0 && pastCount < items.length && (
              <div className="quiz-note">
                {pastCount ? `${pastCount} question${pastCount === 1 ? '' : 's'} from the IOE/IOM question bank matched this chapter;` : 'No question-bank questions match this chapter yet;'} the rest are AI practice questions and are labelled.
              </div>
            )}
            <QuestionCard
              key={index}
              q={item}
              number={index + 1}
              big
              onAnswer={(ok) => setScore((s) => ({ right: s.right + (ok ? 1 : 0), done: s.done + 1 }))}
              onSlide={(n) => { onGoto(n); onClose(); }}
            />
            <div className="quiz-nav">
              <button className="btn-secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
                <Icon name="back" size={40} /> Previous
              </button>
              <button className="btn-primary" onClick={() => setIndex((i) => i + 1)}>
                {index + 1 < items.length ? <>Next question <Icon name="next" size={44} /></> : <>Finish <Icon name="check" size={44} /></>}
              </button>
            </div>
          </div>
        )}

        {state.status === 'quiz' && !item && (
          <div className="ai-body quiz-end">
            <Icon name="trophy" size={120} stroke={1.4} />
            <h3>Quiz complete</h3>
            {score.done > 0 && <p>Class answered <b>{score.right}</b> of <b>{score.done}</b> correctly on the first try.</p>}
            <div className="quiz-nav">
              <button className="btn-secondary" onClick={() => setIndex(0)}>Review questions</button>
              <button className="btn-primary" onClick={() => setState({ status: 'setup' })}>New quiz</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
