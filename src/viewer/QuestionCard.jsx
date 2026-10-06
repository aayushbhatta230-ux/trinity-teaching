import { useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];

/** "IOE 2079 · Q23" for a real past question, "AI practice question" otherwise. */
export function sourceLabel(q) {
  if (q.kind !== 'past') return 'AI practice question';
  return [`${q.exam}${q.year ? ` ${q.year}` : ''}`, q.qno ? `Q${q.qno}` : ''].filter(Boolean).join(' · ');
}

export const ANSWER_NOTE = {
  key: 'Official answer key',
  ai: 'Answer worked out by AI — not from the official key',
  practice: 'Practice question written by AI from these slides',
};

/**
 * One MCQ. Tapping an option (or "Show answer") reveals the answer.
 * `onAnswer(correct)` is called once, on the first tap.
 */
export default function QuestionCard({ q, number, onAnswer, onSlide, big }) {
  const [picked, setPicked] = useState(null);
  const [shown, setShown] = useState(false);
  const reveal = (i) => {
    if (shown) return;
    setPicked(i);
    setShown(true);
    onAnswer?.(i != null && LETTERS[i] === q.answer);
  };
  return (
    <div className={`qcard ${big ? 'qcard-big' : ''}`}>
      <div className="qcard-top">
        {number != null && <span className="qcard-num">{number}</span>}
        <span className={`qcard-source ${q.kind === 'past' ? 'is-past' : 'is-practice'}`}>{sourceLabel(q)}</span>
        {q.topic && <span className="qcard-topic">{q.topic}</span>}
      </div>
      <p className="qcard-question">{q.question}</p>
      <div className="qcard-options">
        {q.options.map((o, i) => {
          const isAnswer = shown && LETTERS[i] === q.answer;
          const isWrong = shown && picked === i && !isAnswer;
          return (
            <button key={i} className={`qopt ${isAnswer ? 'is-right' : ''} ${isWrong ? 'is-wrong' : ''}`} onClick={() => reveal(i)}>
              <b>{LETTERS[i]}</b><span>{o}</span>
            </button>
          );
        })}
      </div>
      {!shown && q.answer && <button className="btn-link qcard-show" onClick={() => reveal(null)}>Show answer</button>}
      {shown && (
        <div className="qcard-answer">
          <div>
            {q.answer ? <b>Answer: {q.answer}</b> : <b className="qcard-nokey">Not in the official answer key — the AI Quiz works it out</b>}
            {ANSWER_NOTE[q.answerSource] && <span className="qcard-note">{ANSWER_NOTE[q.answerSource]}</span>}
          </div>
          {q.explanation && <p>{q.explanation}</p>}
          {q.slide && onSlide && <button className="btn-link" onClick={() => onSlide(q.slide)}>See slide {q.slide}</button>}
        </div>
      )}
    </div>
  );
}
