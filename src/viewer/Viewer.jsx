/**
 * Read-only presentation viewer for uploaded chapter PDFs. Deliberately has no editing,
 * pen, annotation or highlight tools — only page navigation, zoom and full screen.
 */
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import { BackButton, Clock, useRemPx } from '../components/Chrome.jsx';
import { getTeacher, resolveTeacher } from '../lib/catalog.js';
import { getPresentation, saveSlides } from '../lib/library.js';
import { openPdf, renderPage, extractSlides } from '../lib/pdf.js';
import AskPanel from './AskPanel.jsx';
import QuizOverlay from './QuizOverlay.jsx';
import { formatDate, formatSize } from '../lib/format.js';
import { isNativeApp, useBackHandler } from '../lib/native.js';

const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3];

/** Fullscreen state that follows the browser (Esc / the board's own controls). */
function useFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => { if (!document.fullscreenElement) setOn(false); };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggle = useCallback(() => {
    if (on) {
      setOn(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } else {
      setOn(true);
      // The Android app is already immersive full screen; in a browser, ask for full screen too.
      if (!isNativeApp) document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [on]);
  return [on, toggle];
}

function Unavailable({ go, title, message }) {
  return (
    <div className="screen viewer">
      <div className="empty">
        <Icon name="alert" size={96} />
        <h2>{title}</h2>
        {message && <p className="viewer-empty-msg">{message}</p>}
        <button className="btn-primary" onClick={go.resources}>Back to Presentations</button>
      </div>
    </div>
  );
}

export default function Viewer({ sel, id, page, go }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let doc;
    let cancelled = false;
    (async () => {
      try {
        // Only this classroom's own storage is opened, so other classrooms' files cannot load.
        const rec = await getPresentation(sel, id);
        const teacher = resolveTeacher(sel);
        if (!rec || rec.cls !== sel.cls || rec.portion !== sel.portion || rec.teacher !== teacher?.id) {
          if (!cancelled) setState({ status: 'missing' });
          return;
        }
        doc = await openPdf(rec.file);
        if (cancelled) { doc.destroy(); return; }
        const first = await doc.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setState({ status: 'ready', rec, doc, aspect: vp.width / vp.height });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => { cancelled = true; doc?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (state.status === 'loading') return <div className="screen viewer"><div className="viewer-loading">Opening presentation…</div></div>;
  if (state.status === 'missing') return <Unavailable go={go} title="This presentation belongs to another classroom" />;
  if (state.status === 'error') return <Unavailable go={go} title="This presentation could not be opened" message="The PDF may be damaged. Remove it and upload it again." />;
  return <PdfViewer {...state} sel={sel} page={page} go={go} />;
}

/** A page thumbnail that renders only once it scrolls into view. */
function Thumb({ doc, number, width, aspect }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return undefined;
    let task;
    let live = true;
    doc.getPage(number).then((pg) => { if (live) { task = renderPage(pg, ref.current, width); task.promise.catch(() => {}); } });
    return () => { live = false; task?.cancel(); };
  }, [visible, doc, number, width]);
  return <canvas ref={ref} className="thumb-canvas" style={{ width, height: width / aspect }} />;
}

function PdfViewer({ sel, rec, doc, aspect, page, go }) {
  const total = doc.numPages;
  const p = Math.min(Math.max(page, 1), total);
  const [zoom, setZoom] = useState(1);
  const [present, togglePresent] = useFullscreen();
  const [grid, setGrid] = useState(false);
  const [ai, setAi] = useState(null); // 'ask' | 'quiz' | null
  const rem = useRemPx() / 16;
  useBackHandler(grid, () => setGrid(false));
  useBackHandler(present && !grid, togglePresent);

  // Full screen shows only the slide; tapping the middle shows small controls for 3 seconds.
  const [hud, setHud] = useState(false);
  const hudTimer = useRef(null);
  const showHud = useCallback(() => {
    setHud(true);
    clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(false), 3000);
  }, []);
  useEffect(() => {
    if (present) { setZoom(1); showHud(); } else setHud(false);
    return () => clearTimeout(hudTimer.current);
  }, [present, showHud]);

  const goto = useCallback((k) => {
    const n = Math.min(Math.max(k, 1), total);
    if (n !== p) { go.setPage(rec.id, n); setZoom(1); }
  }, [p, total, go, rec.id]);
  const zoomBy = useCallback((dir) => {
    setZoom((z) => ZOOMS[Math.min(Math.max(ZOOMS.indexOf(z) + dir, 0), ZOOMS.length - 1)]);
  }, []);

  // Keyboard and presentation clickers.
  useEffect(() => {
    const on = (e) => {
      if (ai || e.target.closest?.('input, textarea')) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goto(p + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); goto(p - 1); }
      else if (e.key === 'Home') goto(1);
      else if (e.key === 'End') goto(total);
      else if (e.key === '+' || e.key === '=') zoomBy(1);
      else if (e.key === '-') zoomBy(-1);
      else if (e.key === '0') setZoom(1);
      else if (e.key.toLowerCase() === 'f') togglePresent();
      else if (e.key === 'Escape') setGrid(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [goto, p, total, zoomBy, togglePresent, ai]);

  // Fit the page to the available area.
  const areaRef = useRef(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, []);
  // Full screen uses every pixel; otherwise keep a small margin around the slide.
  const margin = present ? 0 : 24;
  const fitW = Math.max(0, Math.min(area.w - margin, (area.h - margin) * aspect));
  const cssW = Math.round(fitW * zoom);

  // Render the current page (re-render on page, size or zoom change).
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    if (!cssW) return undefined;
    let task;
    let live = true;
    setRendered(false);
    doc.getPage(p).then((pg) => {
      if (!live) return;
      task = renderPage(pg, canvasRef.current, cssW);
      task.promise.then(() => live && setRendered(true)).catch(() => {});
    });
    return () => { live = false; task?.cancel(); };
  }, [doc, p, cssW]);

  // Keep the view centred when zooming.
  useLayoutEffect(() => {
    const el = areaRef.current;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = zoom === 1 ? 0 : (el.scrollHeight - el.clientHeight) / 2;
  }, [zoom, p]);

  // Swipe to turn pages (at fit zoom); double-tap or double-click to zoom.
  const gesture = useRef({});
  const onPointerDown = (e) => { gesture.current = { ...gesture.current, x: e.clientX, y: e.clientY, type: e.pointerType }; };
  const onPointerUp = (e) => {
    const g = gesture.current;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (zoom === 1 && Math.abs(dx) > 120 && Math.abs(dx) > Math.abs(dy) * 1.5) { goto(dx < 0 ? p + 1 : p - 1); return; }
    // Full screen: tap the left or right edge to turn the page, the middle to show the controls.
    if (present && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const x = e.clientX / window.innerWidth;
      if (x < 0.3) goto(p - 1);
      else if (x > 0.7) goto(p + 1);
      else showHud();
      return;
    }
    if (e.pointerType === 'touch' && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = Date.now();
      if (now - (g.lastTap ?? 0) < 320) { setZoom((z) => (z === 1 ? 2 : 1)); g.lastTap = 0; } else g.lastTap = now;
    }
  };

  // Slide text for AI: saved at upload; read once from the PDF for older uploads.
  const slidesRef = useRef(rec.slides ? Promise.resolve(rec.slides) : null);
  const getSlides = useCallback(() => {
    if (!slidesRef.current) {
      slidesRef.current = extractSlides(doc).then((slides) => {
        saveSlides(sel, rec.id, slides).catch(() => {});
        return slides;
      });
    }
    return slidesRef.current;
  }, [doc, sel, rec.id]);

  const thumbsRef = useRef(null);
  useEffect(() => { thumbsRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' }); }, [p]);

  const pagesArr = Array.from({ length: total }, (_, i) => i + 1);
  const teacher = getTeacher(rec.teacher);

  return (
    <div className={`screen viewer ${present ? 'is-present' : ''}`}>
      {!present && (
        <header className="viewer-header">
          <BackButton onClick={go.resources} label="Presentations" />
          <div className="viewer-title">
            <div className="viewer-name"><span className="viewer-chapter">Chapter {rec.chapter}</span>{rec.title}</div>
            <div className="viewer-meta">{teacher?.name} · {total} slides · {formatSize(rec.size)} · uploaded {formatDate(rec.uploadedAt)}</div>
          </div>
          <Clock />
          <button className="btn-home" onClick={go.home} aria-label="Home"><Icon name="home" size={40} /></button>
        </header>
      )}
      <div className="viewer-body">
        {!present && total > 1 && (
          <aside className="thumbs" ref={thumbsRef}>
            {pagesArr.map((n) => (
              <button key={n} className={`thumb ${n === p ? 'is-active' : ''}`} onClick={() => goto(n)}>
                <span className="thumb-num">{n}</span>
                <Thumb doc={doc} number={n} aspect={aspect} width={Math.round((aspect >= 1 ? 190 : 140) * rem)} />
              </button>
            ))}
          </aside>
        )}
        <div
          className={`canvas ${zoom > 1 ? 'is-zoomed' : ''}`}
          ref={areaRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onDoubleClick={() => { if (!present && gesture.current.type !== 'touch') setZoom((z) => (z === 1 ? 2 : 1)); }}
        >
          <div className="canvas-page" style={{ width: cssW, height: cssW / aspect }}>
            <canvas ref={canvasRef} className={rendered ? '' : 'is-rendering'} />
          </div>
        </div>
      </div>

      {present && (
        <div className={`present-hud ${hud ? 'is-on' : ''}`} onPointerDown={showHud}>
          <button className="hud-btn" onClick={() => goto(p - 1)} disabled={p <= 1} aria-label="Previous slide"><Icon name="back" size={40} stroke={2.25} /></button>
          <span className="hud-page"><b>{p}</b> / {total}</span>
          <button className="hud-btn" onClick={() => goto(p + 1)} disabled={p >= total} aria-label="Next slide"><Icon name="next" size={40} stroke={2.25} /></button>
          <button className="hud-btn hud-exit" onClick={togglePresent}><Icon name="minimize" size={34} /><span>Exit full screen</span></button>
        </div>
      )}

      {!present && <footer className="controls">
        <div className="controls-group">
          <button className="ctl ctl-wide" onClick={() => goto(p - 1)} disabled={p <= 1}>
            <Icon name="back" size={48} stroke={2.25} /><span>Previous</span>
          </button>
          <button className="ctl ctl-page" onClick={() => setGrid(true)} disabled={total < 2}>
            <Icon name="grid" size={36} />
            <span><b>{p}</b> / {total}</span>
          </button>
          <button className="ctl ctl-wide ctl-primary" onClick={() => goto(p + 1)} disabled={p >= total}>
            <span>Next</span><Icon name="next" size={48} stroke={2.25} />
          </button>
        </div>
        <div className="controls-group">
          <button className="ctl" onClick={() => zoomBy(-1)} disabled={zoom <= ZOOMS[0]} aria-label="Zoom out"><Icon name="zoomOut" size={44} /></button>
          <button className="ctl ctl-zoom" onClick={() => setZoom(1)} aria-label="Fit to screen">{zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}</button>
          <button className="ctl" onClick={() => zoomBy(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} aria-label="Zoom in"><Icon name="zoomIn" size={44} /></button>
        </div>
        <div className="controls-group">
          <button className="ctl ctl-ai" onClick={() => setAi('ask')}>
            <Icon name="sparkles" size={40} /><span>Ask AI</span>
          </button>
          <button className="ctl ctl-ai" onClick={() => setAi('quiz')}>
            <Icon name="trophy" size={40} /><span>Quiz</span>
          </button>
          <button className="ctl ctl-wide" onClick={togglePresent}>
            <Icon name={present ? 'minimize' : 'maximize'} size={40} />
            <span>{present ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>
        </div>
      </footer>}

      {ai === 'ask' && <AskPanel sel={sel} rec={rec} getSlides={getSlides} page={p} onGoto={goto} onClose={() => setAi(null)} />}
      {ai === 'quiz' && <QuizOverlay sel={sel} rec={rec} getSlides={getSlides} page={p} onGoto={goto} onClose={() => setAi(null)} />}

      {grid && (
        <div className="overlay" onClick={() => setGrid(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h2>Go to slide</h2>
              <button className="btn-icon" onClick={() => setGrid(false)} aria-label="Close"><Icon name="close" size={48} /></button>
            </div>
            <div className="page-grid">
              {pagesArr.map((n) => (
                <button key={n} className={`grid-item ${n === p ? 'is-active' : ''}`} onClick={() => { goto(n); setGrid(false); }}>
                  <Thumb doc={doc} number={n} aspect={aspect} width={Math.round((aspect >= 1 ? 290 : 210) * rem)} />
                  <span>{n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
