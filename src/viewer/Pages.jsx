/**
 * Renders a single page descriptor at its native size.
 * Landscape slides are 1600×900, portrait documents 1000×1414 (A4).
 * The viewer scales these to fit, so text stays crisp at any zoom.
 */
import { Mark } from '../components/Logo.jsx';
import { useLayoutEffect, useRef, useState } from 'react';
import { INSTITUTION } from '../data/institution.js';

export const PAGE_SIZE = { landscape: [1600, 900], portrait: [1000, 1414] };

function SlideFrame({ page, number, children, plain }) {
  const { ctx } = page;
  return (
    <div className="slide">
      <div className="slide-brand">
        <Mark />
        <div>
          <div className="slide-brand-name">TRINITY</div>
          <div className="slide-brand-sub">INTERNATIONAL COLLEGE</div>
        </div>
      </div>
      {children}
      {!plain && (
        <div className="slide-foot">
          <span>{[ctx?.subject, ctx?.portion !== ctx?.subject ? ctx?.portion : null, ctx?.cls].filter(Boolean).join('  ·  ')}</span>
          <span>{number}</span>
        </div>
      )}
      <svg className="slide-wave" viewBox="0 0 1600 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 C 500 10, 1000 100, 1600 30 L1600 90 L0 90 Z" fill="#E9A03B" />
        <path d="M0 72 C 520 30, 1030 108, 1600 50 L1600 90 L0 90 Z" fill="#9D1B2F" />
      </svg>
    </div>
  );
}

function Slide({ page, number }) {
  switch (page.layout) {
    case 'title':
      return (
        <SlideFrame page={page} number={number} plain>
          <div className="slide-tagline">{INSTITUTION.tagline}</div>
          <div className="slide-title-art"><Mark mono /></div>
          <div className="slide-title-text">
            <div className="slide-kicker">{page.kicker}</div>
            <h1>{page.title}</h1>
            <div className="slide-byline">{page.ctx.teacher} · {page.ctx.cls}</div>
          </div>
        </SlideFrame>
      );
    case 'bullets':
      return (
        <SlideFrame page={page} number={number}>
          <h2 className="slide-h">{page.title}</h2>
          {page.lead && <p className="slide-lead">{page.lead}</p>}
          <ul className={`slide-list ${page.numbered ? 'numbered' : ''}`}>
            {page.items.map((t, i) => (
              <li key={i}><span className="slide-bullet">{page.numbered ? i + 1 : ''}</span>{t}</li>
            ))}
          </ul>
        </SlideFrame>
      );
    case 'map':
      return (
        <SlideFrame page={page} number={number}>
          <h2 className="slide-h">{page.title}</h2>
          <div className="slide-map">
            <svg viewBox="0 0 1400 560" className="slide-map-lines" aria-hidden="true">
              {[[350, 110], [1050, 110], [350, 450], [1050, 450]].map(([x, y], i) => (
                <line key={i} x1="700" y1="280" x2={x} y2={y} stroke="#E2C7A8" strokeWidth="6" />
              ))}
            </svg>
            <div className="map-center">{page.center}</div>
            {page.items.slice(0, 4).map((t, i) => (
              <div key={i} className={`map-node map-node-${i}`}>{t}</div>
            ))}
          </div>
        </SlideFrame>
      );
    case 'concept':
      return (
        <SlideFrame page={page} number={number}>
          <div className="slide-concept">
            <div className="concept-num">{page.n}</div>
            <div>
              <div className="concept-unit">{page.unit}</div>
              <h2 className="concept-title">{page.title}</h2>
              <div className="concept-rule" />
              <p className="concept-prompt">Definition · Explanation · Example from daily life</p>
            </div>
          </div>
        </SlideFrame>
      );
    case 'formula':
      return (
        <SlideFrame page={page} number={number}>
          <h2 className="slide-h">{page.title}</h2>
          <div className="slide-formula">{page.formula}</div>
        </SlideFrame>
      );
    case 'summary':
      return (
        <SlideFrame page={page} number={number}>
          <h2 className="slide-h">{page.title}</h2>
          <div className="slide-summary">
            {page.items.map((t, i) => (
              <div key={i} className="summary-card"><span>{i + 1}</span>{t}</div>
            ))}
          </div>
          <div className="slide-summary-formula">{page.formula}</div>
        </SlideFrame>
      );
    default:
      return <SlideFrame page={page} number={number} />;
  }
}

function DocFrame({ page, number, total, children, className = '' }) {
  const { ctx } = page;
  return (
    <div className={`doc ${className}`}>
      <div className="doc-head">
        <div className="doc-brand">
          <Mark />
          <span>Trinity International College</span>
        </div>
        <span>{[ctx?.subject, ctx?.portion !== ctx?.subject ? ctx?.portion : null, ctx?.cls].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="doc-body">{children}</div>
      <div className="doc-foot">
        <span>{ctx?.teacher}</span>
        <span>Page {number} of {total}</span>
      </div>
    </div>
  );
}

function Doc({ page, number, total }) {
  switch (page.layout) {
    case 'notes':
      return (
        <DocFrame page={page} number={number} total={total} className="doc-notes">
          <h2 className="notes-h">{page.heading}</h2>
          {page.lines.map((l, i) => <p key={i} className="notes-line">{l}</p>)}
          {page.boxed && <div className="notes-box">{page.boxed}</div>}
        </DocFrame>
      );
    case 'paper':
      return (
        <DocFrame page={page} number={number} total={total}>
          <h2 className="doc-h center">{page.heading}</h2>
          <div className="paper-meta"><span>Full marks: 25</span><span>Time: 45 minutes</span></div>
          {page.groups.map((g, i) => (
            <section key={i} className="paper-group">
              <h3>{g.h}</h3>
              <ol>{g.q.map((q, j) => <li key={j}>{q}</li>)}</ol>
            </section>
          ))}
        </DocFrame>
      );
    case 'table':
      return (
        <DocFrame page={page} number={number} total={total}>
          <h2 className="doc-h">{page.heading}</h2>
          <table className="doc-table">
            <thead><tr>{page.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{page.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </DocFrame>
      );
    default:
      return (
        <DocFrame page={page} number={number} total={total}>
          <h2 className="doc-h">{page.heading}</h2>
          {page.blocks?.map((b, i) => (
            <section key={i} className="doc-block">
              <h3>{b.h}</h3>
              <p className={b.mono ? 'doc-mono' : ''}>{b.t}</p>
            </section>
          ))}
        </DocFrame>
      );
  }
}

export default function Page({ page, number, total }) {
  if (page.layout === 'image') {
    return <img className="page-image" src={page.image} alt={`Page ${number}`} draggable="false" />;
  }
  return page.orient === 'landscape'
    ? <Slide page={page} number={number} />
    : <Doc page={page} number={number} total={total} />;
}

/** A page drawn at a fixed scale (used for thumbnails and the page grid). */
export function ScaledPage({ page, number, total, width }) {
  const [w, h] = PAGE_SIZE[page.orient];
  const s = width / w;
  return (
    <div className="scaled" style={{ width, height: h * s }}>
      <div className="page-native" style={{ width: w, height: h, transform: `scale(${s})` }}>
        <Page page={page} number={number} total={total} />
      </div>
    </div>
  );
}

/** A page scaled to fit whatever box it is placed in (used by the video frame). */
export function FitPage({ page, number = '', total = 1 }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const [w, h] = PAGE_SIZE[page.orient];
  const width = Math.max(0, Math.min(box.w, (box.h * w) / h));
  return (
    <div ref={ref} className="fit-box">
      {width > 0 && <ScaledPage page={page} number={number} total={total} width={width} />}
    </div>
  );
}
