/**
 * Built-in pen for the board: draw and highlight over the slide, per slide, while the chapter is
 * open. Works on every board, even where the board's own annotation tool is unavailable.
 * Ink is kept in memory only: it is never saved into the presentation file.
 * Coordinates are stored relative to the slide (0..1), so ink stays in place when zooming.
 */
import { useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';

export const PEN_COLOURS = ['#d32f2f', '#1565c0', '#111111', '#2e7d32'];
const WIDTH = { pen: 0.004, highlighter: 0.022 };

const toPath = (pts, aspect) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${(y * 1000 / aspect).toFixed(1)}`).join(' ');

/** Ink over one slide. `strokes` are owned by the viewer so each slide keeps its own drawing. */
export function InkLayer({ active, tool, colour, aspect, strokes, setStrokes }) {
  const ref = useRef(null);
  const live = useRef(null);
  const [, redraw] = useState(0);

  const point = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  };
  const eraseAt = ([x, y]) => {
    const near = (s) => s.pts.some(([a, b]) => Math.hypot(a - x, (b - y) / aspect) < 0.02);
    setStrokes((list) => (list.some(near) ? list.filter((s) => !near(s)) : list));
  };

  const down = (e) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    try { ref.current.setPointerCapture?.(e.pointerId); } catch { /* not every pointer can be captured */ }
    const pt = point(e);
    if (!pt) return;
    if (tool === 'eraser') { live.current = { erasing: true }; eraseAt(pt); return; }
    live.current = { tool, colour, pts: [pt] };
    redraw((n) => n + 1);
  };
  const move = (e) => {
    if (!active || !live.current) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = point(e);
    if (!pt) return;
    if (live.current.erasing) { eraseAt(pt); return; }
    live.current.pts.push(pt);
    redraw((n) => n + 1);
  };
  const up = (e) => {
    if (!live.current) return;
    e.stopPropagation();
    const s = live.current;
    live.current = null;
    if (!s.erasing && s.pts.length) setStrokes((list) => [...list, s]);
    redraw((n) => n + 1);
  };

  const all = live.current && !live.current.erasing ? [...strokes, live.current] : strokes;
  return (
    <svg
      ref={ref}
      className={`ink ${active ? 'is-active' : ''} ${active && tool === 'eraser' ? 'is-erasing' : ''}`}
      viewBox={`0 0 1000 ${1000 / aspect}`}
      preserveAspectRatio="none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {all.map((s, i) => (
        <path
          key={i}
          d={s.pts.length === 1 ? `${toPath(s.pts, aspect)} l0.1 0` : toPath(s.pts, aspect)}
          fill="none"
          stroke={s.tool === 'highlighter' ? '#ffd400' : s.colour}
          strokeOpacity={s.tool === 'highlighter' ? 0.42 : 1}
          strokeWidth={WIDTH[s.tool] * 1000}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** The pen toolbar: colours, highlighter, eraser, undo, clear, close. */
export function InkTools({ tool, setTool, colour, setColour, canUndo, onUndo, onClear, onClose, boardTools }) {
  return (
    <div className="ink-tools" role="toolbar" aria-label="Pen">
      {PEN_COLOURS.map((c) => (
        <button key={c} className={`ink-colour ${tool === 'pen' && colour === c ? 'is-on' : ''}`} style={{ background: c }}
          onClick={() => { setTool('pen'); setColour(c); }} aria-label="Pen colour" />
      ))}
      <button className={`ink-btn ${tool === 'highlighter' ? 'is-on' : ''}`} onClick={() => setTool('highlighter')} aria-label="Highlighter">
        <Icon name="highlighter" size={36} /><span>Highlight</span>
      </button>
      <button className={`ink-btn ${tool === 'eraser' ? 'is-on' : ''}`} onClick={() => setTool('eraser')} aria-label="Eraser">
        <Icon name="eraser" size={36} /><span>Erase</span>
      </button>
      <button className="ink-btn" onClick={onUndo} disabled={!canUndo} aria-label="Undo"><Icon name="undo" size={36} /><span>Undo</span></button>
      <button className="ink-btn" onClick={onClear} disabled={!canUndo} aria-label="Clear slide"><Icon name="trash" size={36} /><span>Clear</span></button>
      {boardTools && (
        <button className="ink-btn" onClick={boardTools} aria-label="Board annotation tools"><Icon name="monitor" size={36} /><span>Board pen</span></button>
      )}
      <button className="ink-btn ink-done" onClick={onClose}><Icon name="check" size={36} /><span>Done</span></button>
    </div>
  );
}
