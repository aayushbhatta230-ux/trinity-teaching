/**
 * A PowerPoint chapter. The app does not draw PowerPoint slides itself: "Start presentation"
 * opens the original file, unchanged, in PowerPoint (or the board's office app), which shows
 * every picture, font, animation and transition exactly as the teacher made them.
 * Ask AI and the quiz still work here, from the slide text read at upload.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { BackButton, Clock } from '../components/Chrome.jsx';
import { getTeacher } from '../lib/catalog.js';
import { saveSlides } from '../lib/library.js';
import { presentOriginal, presentSupport, OLD_APP_MESSAGE } from '../lib/present.js';
import { formatDate, formatSize, countLabel } from '../lib/format.js';
import AskPanel from './AskPanel.jsx';
import QuizOverlay from './QuizOverlay.jsx';
import AiErrorBoundary from '../components/AiErrorBoundary.jsx';

export default function PresentLauncher({ sel, rec, doc, go }) {
  const [state, setState] = useState({ status: 'idle' }); // idle | opening | opened | error
  const [progress, setProgress] = useState(0);
  const [ai, setAi] = useState(null); // 'ask' | 'quiz' | null
  const teacher = getTeacher(rec.teacher);

  // Slide text for AI: saved at upload; read once from the file for older uploads.
  const slidesRef = useRef(rec.slides?.length ? Promise.resolve(rec.slides) : null);
  const getSlides = useCallback(() => {
    if (!slidesRef.current) {
      slidesRef.current = doc.extractSlides().then((slides) => {
        if (slides.length) saveSlides(sel, rec.id, slides).catch(() => {});
        return slides;
      });
    }
    return slidesRef.current;
  }, [doc, sel, rec.id]);

  const start = async () => {
    if (state.status === 'opening') return;
    setProgress(0);
    setState({ status: 'opening' });
    try {
      const r = await presentOriginal(rec, setProgress);
      setState({ status: 'opened', app: r?.app });
    } catch (e) {
      setState({ status: 'error', message: e?.forUser ? e.message : 'The presentation could not be opened. Try again.' });
    }
  };

  // Coming back from PowerPoint: ready to present again.
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') setState((s) => (s.status === 'opened' ? { status: 'returned' } : s)); };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, []);

  const count = countLabel('pptx', doc.numPages || rec.pages);
  const support = presentSupport();

  return (
    <div className="screen viewer viewer-launch">
      <header className="viewer-header">
        <BackButton onClick={go.resources} label="Presentations" />
        <div className="viewer-title">
          <div className="viewer-name"><span className="viewer-chapter">Chapter {rec.chapter}</span>{rec.title}</div>
          <div className="viewer-meta">{teacher?.name} · {count} · {formatSize(rec.size)} · uploaded {formatDate(rec.uploadedAt)}</div>
        </div>
        <Clock />
        <button className="btn-home" onClick={go.home} aria-label="Home"><Icon name="home" size={40} /></button>
      </header>

      <div className="launch-body">
        <div className="launch-preview" style={{ aspectRatio: String(doc.aspect || 16 / 9) }}>
          {doc.thumbnail
            ? <><img src={doc.thumbnail} alt={`First slide of ${rec.title}`} draggable="false" /><span className="launch-preview-label">Preview of slide 1 · the slide show is shown by PowerPoint</span></>
            : <div className="launch-placeholder"><Icon name="presentation" size={120} stroke={1.3} /><span>PowerPoint</span></div>}
        </div>

        <div className="launch-side">
          <div className="launch-file">
            <Icon name="presentation" size={40} />
            <div>
              <b>{rec.fileName || rec.title}</b>
              <span>Original file, exactly as uploaded</span>
            </div>
          </div>

          <button className="btn-start launch-go" onClick={start} disabled={support !== 'yes' || state.status === 'opening'}>
            <Icon name="play" size={56} stroke={1.8} />
            <span>{state.status === 'opening' ? 'Opening…' : state.status === 'opened' || state.status === 'returned' ? 'Present again' : 'Start presentation'}</span>
          </button>

          {state.status === 'opening' && progress > 0 && progress < 1 && (
            <div className="launch-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          )}
          {state.status === 'opened' && (
            <p className="launch-note">Opened{state.app ? ` in ${state.app}` : ''}. Pictures, animations and transitions play exactly as made. Come back here for Ask AI or the quiz.</p>
          )}
          {state.status === 'error' && (
            <div className="dialog-error" role="alert"><Icon name="alert" size={36} /> <span>{state.message}</span></div>
          )}
          {support === 'old-app' && <div className="dialog-error" role="alert"><Icon name="download" size={36} /> <span>{OLD_APP_MESSAGE}</span></div>}
          {support === 'browser' && (
            <p className="launch-note">PowerPoint chapters are presented from the Trinity Teaching app on the board or the school computer.</p>
          )}

          <p className="launch-help">
            Opens in PowerPoint on school computers and in the board’s office app (such as WPS Office) on boards.
            Use the presentation app’s own controls to move between slides.
          </p>

          <div className="launch-ai">
            <button className="ctl ctl-ai" onClick={() => setAi('ask')}><Icon name="sparkles" size={40} /><span>Ask AI</span></button>
            <button className="ctl ctl-ai" onClick={() => setAi('quiz')}><Icon name="trophy" size={40} /><span>Quiz</span></button>
          </div>
        </div>
      </div>

      {ai === 'ask' && (
        <AiErrorBoundary onClose={() => setAi(null)}>
          <AskPanel sel={sel} rec={rec} getSlides={getSlides} page={1} onClose={() => setAi(null)} />
        </AiErrorBoundary>
      )}
      {ai === 'quiz' && (
        <AiErrorBoundary onClose={() => setAi(null)}>
          <QuizOverlay sel={sel} rec={rec} getSlides={getSlides} page={1} onClose={() => setAi(null)} />
        </AiErrorBoundary>
      )}
    </div>
  );
}
