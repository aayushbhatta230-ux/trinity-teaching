/**
 * Presentations a teacher can upload: PDF, PowerPoint (.pptx, .ppsx, .ppt, .pps) and plain text (.txt).
 * The uploaded file is stored exactly as it is and never converted.
 *
 * PDF and text open in the app's own viewer:
 *   { kind, numPages, aspect,
 *     mount(n, element, cssWidth, { clone }) → { promise, cancel },   // show page n
 *     extractSlides() → Promise<[{ n, text }]>,                       // text for Ask AI / Quiz
 *     destroy() }
 *
 * PowerPoint is never re-drawn by the app: it is presented in PowerPoint itself (or the board's
 * office app) from the original file, so pictures, fonts, animations and transitions are exactly
 * as the teacher made them. Its document is { kind: 'pptx', external: true, numPages, aspect,
 * thumbnail, extractSlides, destroy } (see present.js).
 */
import { openPdf, renderPage, extractSlides as extractPdfSlides, isPdf } from './pdf.js';
import { prettyMath } from './mathText.js';
import { readPowerPoint } from './pptx.js';

export const KINDS = {
  pdf: { label: 'PDF' },
  pptx: { label: 'PowerPoint' },
  txt: { label: 'Text' },
};

/** Accept attribute for the file picker. */
export const ACCEPT = [
  '.pdf', 'application/pdf',
  '.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppsx', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  '.ppt', '.pps', 'application/vnd.ms-powerpoint',
  '.txt', 'text/plain',
].join(',');

const userError = (message) => Object.assign(new Error(message), { forUser: true });

/** What kind of file this is, checked by its first bytes as well as its name. */
export async function detectKind(file) {
  const name = (file.name || '').toLowerCase();
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const zip = head[0] === 0x50 && head[1] === 0x4b; // "PK": .pptx / .ppsx
  const ole = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0; // .ppt / .pps
  if (await isPdf(file)) return 'pdf';
  if (/\.(pptx|ppsx)$/.test(name) && zip) return 'pptx';
  if (/\.(ppt|pps)$/.test(name) && ole) return 'pptx';
  if (/\.(pptx|ppsx|ppt|pps)$/.test(name)) {
    throw userError('This PowerPoint file looks damaged and could not be read. Open it in PowerPoint, save it again, then upload it.');
  }
  if (name.endsWith('.txt')) {
    if (file.size > 2 * 1024 * 1024) throw userError('This text file is too large (over 2 MB).');
    return 'txt';
  }
  if (name.endsWith('.key') || name.endsWith('.odp')) {
    throw userError('Please save this presentation as PowerPoint (.pptx) or PDF, then upload it.');
  }
  throw userError('Please choose a PowerPoint, PDF or text (.txt) file.');
}

/** Opens a stored presentation (record with { kind, file }) for viewing. */
export function openDocument({ kind = 'pdf', file }) {
  if (kind === 'pptx') return openPowerPoint(file);
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

/** PowerPoint: read-only facts about the file; the slides themselves are shown by PowerPoint. */
async function openPowerPoint(file) {
  const info = await readPowerPoint(file).catch(() => null);
  if (!info) throw userError('This PowerPoint file could not be read. It may be damaged. Open it in PowerPoint, save it again, then upload it.');
  let thumbUrl = info.thumbnail ? URL.createObjectURL(info.thumbnail) : null;
  return {
    kind: 'pptx',
    external: true,
    readable: info.readable,
    numPages: info.numPages,
    aspect: info.aspect,
    thumbnail: thumbUrl,
    extractSlides: async () => info.slides,
    destroy() { if (thumbUrl) URL.revokeObjectURL(thumbUrl); thumbUrl = null; },
  };
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
