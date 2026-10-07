/**
 * Presentations a teacher can upload: PDF, PowerPoint (.pptx) and plain text (.txt).
 * Every kind opens as the same kind of document for the viewer:
 *
 *   { kind, numPages, aspect,
 *     mount(n, element, cssWidth, { clone }) → { promise, cancel },   // show page n
 *     extractSlides() → Promise<[{ n, text }]>,                       // text for Ask AI / Quiz
 *     destroy() }
 *
 * Everything runs on the board, offline. PowerPoint slides are laid out with pptx-preview
 * (loaded only when a .pptx is opened); text files are split into readable pages.
 */
import { openPdf, renderPage, extractSlides as extractPdfSlides, isPdf } from './pdf.js';
import { prettyMath } from './mathText.js';

export const KINDS = {
  pdf: { label: 'PDF' },
  pptx: { label: 'PowerPoint' },
  txt: { label: 'Text' },
};

/** Accept attribute for the file picker. */
export const ACCEPT = [
  '.pdf', 'application/pdf',
  '.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt', 'text/plain',
].join(',');

const userError = (message) => Object.assign(new Error(message), { forUser: true });

/** What kind of file this is, checked by its first bytes as well as its name. */
export async function detectKind(file) {
  const name = (file.name || '').toLowerCase();
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const zip = head[0] === 0x50 && head[1] === 0x4b; // "PK"
  if (await isPdf(file)) return 'pdf';
  if (name.endsWith('.pptx') && zip) return 'pptx';
  if (name.endsWith('.ppt') || name.endsWith('.pps') || name.endsWith('.ppsx')) {
    throw userError('This is an older PowerPoint format. In PowerPoint choose File → Save As → PowerPoint Presentation (.pptx), then upload that file.');
  }
  if (name.endsWith('.txt')) {
    if (file.size > 2 * 1024 * 1024) throw userError('This text file is too large (over 2 MB).');
    return 'txt';
  }
  if (name.endsWith('.key') || name.endsWith('.odp')) {
    throw userError('Please save this presentation as PowerPoint (.pptx) or PDF, then upload it.');
  }
  throw userError('Please choose a PDF, PowerPoint (.pptx) or text (.txt) file.');
}

/** Opens a stored presentation (record with { kind, file }) for viewing. */
export function openDocument({ kind = 'pdf', file }) {
  if (kind === 'pptx') return openPptx(file);
  if (kind === 'txt') return openText(file);
  return openPdfDocument(file);
}

// ---------- PDF ----------

async function openPdfDocument(file) {
  const pdf = await openPdf(file);
  const first = await pdf.getPage(1);
  const vp = first.getViewport({ scale: 1 });
  return {
    kind: 'pdf',
    numPages: pdf.numPages,
    aspect: vp.width / vp.height,
    mount(n, el, cssWidth) {
      const canvas = document.createElement('canvas');
      el.appendChild(canvas);
      let task;
      let live = true;
      const promise = pdf.getPage(n).then((pg) => {
        if (!live) return undefined;
        task = renderPage(pg, canvas, cssWidth);
        return task.promise;
      });
      promise.catch(() => {});
      return { promise, cancel: () => { live = false; task?.cancel(); canvas.remove(); } };
    },
    extractSlides: () => extractPdfSlides(pdf),
    destroy: () => pdf.destroy(),
  };
}

// ---------- pages laid out as HTML (PowerPoint and text) ----------

const BASE_W = 960;

/** Shows page elements of size BASE_W × BASE_W/aspect scaled to any width. */
function htmlDocument(kind, pages, aspect, texts, host) {
  const owner = new Map(); // page → element it is shown in (the original node moves; thumbnails clone)
  return {
    kind,
    numPages: pages.length,
    aspect,
    mount(n, el, cssWidth, { clone = false } = {}) {
      const page = pages[n - 1];
      if (!page) return { promise: Promise.resolve(), cancel() {} };
      const frame = document.createElement('div');
      frame.className = 'html-page';
      frame.style.width = `${cssWidth}px`;
      frame.style.height = `${cssWidth / aspect}px`;
      const node = clone || owner.has(page) ? page.cloneNode(true) : page;
      if (node === page) owner.set(page, el);
      node.style.transform = `scale(${cssWidth / BASE_W})`;
      frame.appendChild(node);
      el.appendChild(frame);
      return {
        promise: Promise.resolve(),
        cancel() {
          frame.remove();
          if (node === page) { owner.delete(page); host?.appendChild(page); }
        },
      };
    },
    extractSlides: async () => texts.map((text, i) => ({ n: i + 1, text })),
    destroy() { host?.remove(); },
  };
}

/** An off-screen place where pages are laid out (layout needs to be in the document). */
function offscreenHost() {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${BASE_W}px;pointer-events:none;`;
  document.body.appendChild(host);
  return host;
}

// ---------- PowerPoint ----------

/**
 * Charts without a title get the library's Chinese placeholder ("图表标题" = "Chart title").
 * Charts are drawn by ECharts, so drop that placeholder whenever a chart is configured.
 */
let chartsPatched = false;
async function patchChartTitles() {
  if (chartsPatched) return;
  chartsPatched = true;
  const echarts = await import('echarts');
  const probe = echarts.init(document.createElement('div'), null, { width: 10, height: 10 });
  const proto = Object.getPrototypeOf(probe);
  const setOption = proto.setOption;
  proto.setOption = function patched(option, ...rest) {
    for (const t of [].concat(option?.title || [])) {
      if (t && String(t.text || '').trim() === '图表标题') { t.text = ''; t.show = false; }
    }
    return setOption.call(this, option, ...rest);
  };
  probe.dispose();
}

async function openPptx(file) {
  const { init } = await import('pptx-preview');
  await patchChartTitles().catch(() => {});
  const buf = await file.arrayBuffer();
  const host = offscreenHost();
  try {
    // First read the slide size, then lay the slides out at that shape.
    const probe = init(document.createElement('div'), { width: BASE_W, height: 540, mode: 'list' });
    const info = await probe.load(buf.slice(0));
    const aspect = info?.width && info?.height ? info.width / info.height : 16 / 9;
    const viewer = init(host, { width: BASE_W, height: Math.round(BASE_W / aspect), mode: 'list' });
    await viewer.preview(buf);
    // Charts without a title get the library's Chinese placeholder ("图表标题"); hide it.
    const pages = [...host.querySelectorAll('.pptx-preview-slide-wrapper')];
    if (!pages.length) throw userError('This PowerPoint file has no slides that can be shown. Save it as PDF from PowerPoint and upload that instead.');
    const texts = pages.map((p) => (p.innerText || p.textContent || '')
      .replace(/■/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim().slice(0, 4000));
    for (const p of pages) {
      p.style.margin = '0';
      p.style.transformOrigin = '0 0';
      p.style.position = 'absolute';
      p.style.left = '0';
      p.style.top = '0';
    }
    const wrapper = host.querySelector('.pptx-preview-wrapper');
    if (wrapper) { wrapper.style.height = 'auto'; wrapper.style.overflow = 'visible'; }
    return htmlDocument('pptx', pages, aspect, texts, wrapper || host);
  } catch (e) {
    host.remove();
    throw e.forUser ? e : userError('This PowerPoint file could not be opened. It may be damaged. Save it as PDF from PowerPoint and upload that instead.');
  }
}

// ---------- Text ----------

const TXT_ASPECT = 16 / 9;
const LINE_CHARS = 48; // characters per line at the page font size (kept on the safe side)
const PAGE_ROWS = 10;  // lines that fit on one page

async function readText(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Splits text into pages: at form feeds, else at blank lines when a page is full. */
export function paginateText(text) {
  const out = [];
  for (const section of text.replace(/\r\n?/g, '\n').split('\f')) {
    let page = [];
    let rows = 0;
    const flush = () => { const t = page.join('\n').trim(); if (t) out.push(t); page = []; rows = 0; };
    const blocks = section.split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.split('\n');
      const need = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / LINE_CHARS)), 0) + (page.length ? 1 : 0);
      if (rows && rows + need > PAGE_ROWS) flush();
      if (need > PAGE_ROWS) {
        // A block longer than a page: split it by lines.
        for (const l of lines) {
          const r = Math.max(1, Math.ceil(l.length / LINE_CHARS));
          if (rows + r > PAGE_ROWS) flush();
          page.push(l); rows += r;
        }
      } else {
        if (page.length) page.push('');
        page.push(...lines); rows += need;
      }
    }
    flush();
  }
  return out.length ? out : [''];
}

async function openText(file) {
  const text = await readText(file);
  const pagesText = paginateText(text);
  const host = offscreenHost();
  const pages = pagesText.map((t, i) => {
    const el = document.createElement('div');
    el.className = 'txt-page';
    el.style.width = `${BASE_W}px`;
    el.style.height = `${Math.round(BASE_W / TXT_ASPECT)}px`;
    el.innerHTML = '<div class="txt-page-body"></div><div class="txt-page-num"></div>';
    el.firstChild.textContent = prettyMath(t);
    // A short first line of the file reads as its title.
    const firstLine = t.split('\n')[0];
    if (i === 0 && firstLine.length <= 70 && t.includes('\n')) el.classList.add('has-title');
    el.lastChild.textContent = `${i + 1} / ${pagesText.length}`;
    host.appendChild(el);
    return el;
  });
  return htmlDocument('txt', pages, TXT_ASPECT, pagesText, host);
}
