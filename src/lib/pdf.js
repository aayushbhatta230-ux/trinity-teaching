/**
 * PDF rendering with Mozilla pdf.js (legacy build, for older board browsers).
 *
 * pdf.js normally runs in a Web Worker loaded from a separate file. This app ships as a
 * single HTML file that must also work from file://, where Chrome blocks loading that
 * worker, so the worker code is bundled and run on the main thread instead. Slides
 * render fast enough this way.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

globalThis.pdfjsWorker = pdfWorker;

/** Open a PDF from a Blob/File. Resolves to a pdf.js document. */
export async function openPdf(blob) {
  const data = new Uint8Array(await blob.arrayBuffer());
  return pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;
}

/** Quick check that a file really is a PDF (by its first bytes, not just the name). */
export async function isPdf(file) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === '%PDF-';
}

/**
 * Render one page into a canvas so it is `cssWidth` CSS pixels wide.
 * Returns the pdf.js render task (cancel it if the page changes mid-render).
 */
export function renderPage(page, canvas, cssWidth) {
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Cap the bitmap size so deep zoom on a 4K board stays within memory.
  const maxW = 6000;
  const scale = Math.min((cssWidth / base.width) * dpr, maxW / base.width);
  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${(cssWidth * base.height) / base.width}px`;
  return page.render({ canvasContext: canvas.getContext('2d'), viewport });
}
