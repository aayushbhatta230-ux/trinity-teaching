/**
 * Read-only file viewer. Deliberately has no editing, pen, annotation or highlight tools —
 * only page navigation, zoom and fullscreen.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import { BackButton, Clock, useRemPx } from '../components/Chrome.jsx';
import { findResource, getTeacher } from '../lib/catalog.js';
import { buildPages } from '../lib/pages.js';
import Page, { PAGE_SIZE, ScaledPage } from './Pages.jsx';
import VideoPlayer from './VideoPlayer.jsx';
import { formatDate, formatSize } from '../screens/ResourcesScreen.jsx';

const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3];

/** Fullscreen state that follows the browser (Esc / board's own controls). */
export function useFullscreen() {
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
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [on]);
  return [on, toggle];
}

export function ViewerHeader({ r, go }) {
  const teacher = getTeacher(r.scope.teacher);
  return (
    <header className="viewer-header">
      <BackButton onClick={go.resources} label="Resources" />
      <div className="viewer-title">
        <div className="viewer-name">{r.title}<span className="viewer-ext">.{r.ext}</span></div>
        <div className="viewer-meta">{teacher?.name} · {formatDate(r.date)} · {formatSize(r.sizeMB)}</div>
      </div>
      <Clock />
      <button className="btn-home" onClick={go.home} aria-label="Home"><Icon name="home" size={44} /></button>
    </header>
  );
}

export default function Viewer({ sel, id, page, go }) {
  const r = findResource(id);
  if (!r || r.scope.cls !== sel.cls || r.scope.portion !== sel.portion) {
    return (
      <div className="screen viewer">
        <div className="empty">
          <Icon name="alert" size={96} />
          <h2>This file is not available</h2>
          <button className="btn-primary" onClick={go.resources}>Back to Resources</button>
        </div>
      </div>
    );
  }
  if (r.type === 'video') return <VideoPlayer r={r} go={go} />;
  return <DocViewer key={r.id} r={r} page={page} go={go} />;
}

function DocViewer({ r, page, go }) {
  const pages = useMemo(() => buildPages(r), [r]);
  const total = pages.length;
  const p = Math.min(Math.max(page, 1), total);
  const cur = pages[p - 1];

  const [zoom, setZoom] = useState(1);
  const [present, togglePresent] = useFullscreen();
  const [grid, setGrid] = useState(false);
  const rem = useRemPx() / 16; // thumbnails follow the screen scale

  const goto = useCallback((k) => {
    const n = Math.min(Math.max(k, 1), total);
    if (n !== p) { go.setPage(r.id, n); setZoom(1); }
  }, [p, total, go, r.id]);
  const zoomBy = useCallback((dir) => {
    setZoom((z) => {
      const i = ZOOMS.indexOf(z) + dir;
      return ZOOMS[Math.min(Math.max(i, 0), ZOOMS.length - 1)];
    });
  }, []);

  // Keyboard & presentation clickers.
  useEffect(() => {
    const on = (e) => {
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
  }, [goto, p, total, zoomBy, togglePresent]);

  // Fit-to-area sizing.
  const areaRef = useRef(null);
  const [area, setArea] = useState({ w: 1400, h: 800 });
  useLayoutEffect(() => {
    const el = areaRef.current;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [bw, bh] = PAGE_SIZE[cur.orient];
  const fit = Math.min((area.w - 48) / bw, (area.h - 48) / bh);
  const scale = fit * zoom;

  // Keep the view centred when zooming.
  useLayoutEffect(() => {
    const el = areaRef.current;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = zoom === 1 ? 0 : (el.scrollHeight - el.clientHeight) / 2;
  }, [zoom, p]);

  // Swipe to turn pages (only at fit zoom), double-tap to zoom.
  const gesture = useRef({});
  const onPointerDown = (e) => { gesture.current = { ...gesture.current, x: e.clientX, y: e.clientY, t: Date.now(), type: e.pointerType }; };
  const onPointerUp = (e) => {
    const g = gesture.current;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (zoom === 1 && Math.abs(dx) > 120 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goto(dx < 0 ? p + 1 : p - 1);
      return;
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = Date.now();
      if (e.pointerType === 'touch' && now - (g.lastTap ?? 0) < 320) { setZoom((z) => (z === 1 ? 2 : 1)); g.lastTap = 0; }
      else gesture.current.lastTap = now;
    }
  };

  // Keep the active thumbnail visible.
  const thumbsRef = useRef(null);
  useEffect(() => {
    thumbsRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [p]);

  return (
    <div className={`screen viewer ${present ? 'is-present' : ''}`}>
      {!present && <ViewerHeader r={r} go={go} />}
      <div className="viewer-body">
        {!present && total > 1 && (
          <aside className="thumbs" ref={thumbsRef}>
            {pages.map((pg, i) => (
              <button key={i} className={`thumb ${i + 1 === p ? 'is-active' : ''}`} onClick={() => goto(i + 1)}>
                <span className="thumb-num">{i + 1}</span>
                <ScaledPage page={pg} number={i + 1} total={total} width={(pg.orient === 'landscape' ? 200 : 150) * rem} />
              </button>
            ))}
          </aside>
        )}
        <div
          className={`canvas ${zoom > 1 ? 'is-zoomed' : ''}`}
          ref={areaRef}
          onPointerDown={onPointerDown}
          onDoubleClick={() => { if (gesture.current.type !== 'touch') setZoom((z) => (z === 1 ? 2 : 1)); }}
          onPointerUp={onPointerUp}
        >
          <div className="canvas-page" style={{ width: bw * scale, height: bh * scale }}>
            <div className="page-native" style={{ width: bw, height: bh, transform: `scale(${scale})` }}>
              <Page page={cur} number={p} total={total} />
            </div>
          </div>
        </div>
      </div>

      <footer className="controls">
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
          <button className="ctl" onClick={() => zoomBy(-1)} disabled={zoom <= ZOOMS[0]} aria-label="Zoom out">
            <Icon name="zoomOut" size={44} />
          </button>
          <button className="ctl ctl-zoom" onClick={() => setZoom(1)} aria-label="Fit to screen">
            {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </button>
          <button className="ctl" onClick={() => zoomBy(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} aria-label="Zoom in">
            <Icon name="zoomIn" size={44} />
          </button>
        </div>
        <div className="controls-group">
          <button className="ctl ctl-wide" onClick={togglePresent}>
            <Icon name={present ? 'minimize' : 'maximize'} size={40} />
            <span>{present ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>
        </div>
      </footer>

      {grid && (
        <div className="overlay" onClick={() => setGrid(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h2>Go to page</h2>
              <button className="btn-icon" onClick={() => setGrid(false)} aria-label="Close"><Icon name="close" size={48} /></button>
            </div>
            <div className={`page-grid ${cur.orient}`}>
              {pages.map((pg, i) => (
                <button key={i} className={`grid-item ${i + 1 === p ? 'is-active' : ''}`} onClick={() => { goto(i + 1); setGrid(false); }}>
                  <ScaledPage page={pg} number={i + 1} total={total} width={(pg.orient === 'landscape' ? 300 : 220) * rem} />
                  <span>{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
