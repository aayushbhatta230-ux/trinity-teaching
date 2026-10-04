/**
 * Video player with large touch controls.
 * Plays `resource.src` when a real file is attached; otherwise runs a simulated
 * timeline over the lesson chapters so the flow can be demonstrated end to end.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ViewerHeader, useFullscreen } from './Viewer.jsx';
import { videoChapters } from '../lib/pages.js';
import { UNITS } from '../data/curriculum.js';
import { getPortion, getClass } from '../lib/catalog.js';
import { FitPage } from './Pages.jsx';

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function VideoPlayer({ r, go }) {
  const chapters = useMemo(() => videoChapters(r), [r]);
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(r.video?.duration ?? 0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [present, togglePresent] = useFullscreen();
  const real = !!r.src;

  // Simulated clock for demo videos.
  useEffect(() => {
    if (real || !playing) return undefined;
    const id = setInterval(() => setT((x) => {
      const n = x + 0.25;
      if (n >= duration) { setPlaying(false); return duration; }
      return n;
    }), 250);
    return () => clearInterval(id);
  }, [real, playing, duration]);

  const play = () => {
    if (real) { playing ? videoRef.current.pause() : videoRef.current.play(); }
    else { if (t >= duration) setT(0); setPlaying(!playing); }
  };
  const seek = (s) => {
    const v = Math.min(Math.max(s, 0), duration);
    if (real) videoRef.current.currentTime = v;
    setT(v);
  };

  useEffect(() => {
    const on = (e) => {
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); play(); }
      else if (e.key === 'ArrowRight') seek(t + 10);
      else if (e.key === 'ArrowLeft') seek(t - 10);
      else if (e.key.toLowerCase() === 'f') togglePresent();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  // Timeline: tap or drag anywhere on the bar.
  const barRef = useRef(null);
  const seekFromPointer = (e) => {
    const b = barRef.current.getBoundingClientRect();
    seek(((e.clientX - b.left) / b.width) * duration);
  };

  // (no findLastIndex — older board browsers lack it)
  const chapterIdx = chapters.reduce((acc, c, i) => (c.start <= t ? i : acc), 0);
  const ch = chapters[chapterIdx];
  const unit = UNITS[r.scope.portion]?.[r.scope.cls]?.[r.video?.unit ?? 0];
  const framePage = {
    orient: 'landscape', layout: chapterIdx === 0 ? 'title' : 'concept',
    kicker: 'Video lesson', title: chapterIdx === 0 ? unit?.t ?? r.title : ch.title, n: chapterIdx, unit: unit?.t,
    ctx: { portion: getPortion(r.scope.portion)?.label, cls: getClass(r.scope.cls)?.label, teacher: '' },
  };

  return (
    <div className={`screen viewer ${present ? 'is-present' : ''}`}>
      {!present && <ViewerHeader r={r} go={go} />}
      <div className="viewer-body">
        <div className="video-stage" onClick={play}>
          {real ? (
            <video
              ref={videoRef}
              src={r.src}
              className="video-el"
              onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              playsInline
            />
          ) : (
            <div className="video-mock">
              <FitPage page={framePage} />
              <span className="video-badge">Demo playback · no video file attached</span>
            </div>
          )}
          {!playing && (
            <span className="video-bigplay"><Icon name="play" size={110} stroke={1.5} /></span>
          )}
        </div>
        {!present && (
          <aside className="chapters">
            <h3>Chapters</h3>
            {chapters.map((c, i) => (
              <button key={i} className={`chapter ${i === chapterIdx ? 'is-active' : ''}`} onClick={() => seek(c.start)}>
                <span className="chapter-time">{fmt(c.start)}</span>
                <span className="chapter-title">{c.title}</span>
              </button>
            ))}
          </aside>
        )}
      </div>
      <footer className="controls">
        <div className="controls-group">
          <button className="ctl" onClick={() => seek(t - 10)} aria-label="Back 10 seconds"><Icon name="rewind" size={44} /></button>
          <button className="ctl ctl-wide ctl-primary" onClick={play}>
            <Icon name={playing ? 'pause' : 'play'} size={44} /><span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button className="ctl" onClick={() => seek(t + 10)} aria-label="Forward 10 seconds"><Icon name="forward" size={44} /></button>
        </div>
        <div className="timeline">
          <span className="time">{fmt(t)}</span>
          <div
            className="timeline-bar"
            ref={barRef}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e); }}
            onPointerMove={(e) => { if (e.buttons) seekFromPointer(e); }}
          >
            <div className="timeline-track">
              <div className="timeline-fill" style={{ width: `${duration ? (t / duration) * 100 : 0}%` }} />
              {chapters.slice(1).map((c, i) => (
                <span key={i} className="timeline-mark" style={{ left: `${(c.start / duration) * 100}%` }} />
              ))}
            </div>
            <div className="timeline-knob" style={{ left: `${duration ? (t / duration) * 100 : 0}%` }} />
          </div>
          <span className="time">{fmt(duration)}</span>
        </div>
        <div className="controls-group">
          <button className="ctl ctl-wide" onClick={togglePresent}>
            <Icon name={present ? 'minimize' : 'maximize'} size={40} />
            <span>{present ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
