/**
 * Reads facts about a PowerPoint file WITHOUT changing or re-drawing it.
 *
 * PowerPoint chapters are presented in PowerPoint itself (or the board's office app), so every
 * picture, font, animation and transition plays exactly as the teacher made it. This file only
 * reads what the app needs around that: the slide count, the slide shape, the text of each slide
 * (for Ask AI, the quiz and slide search) and the preview picture PowerPoint saves in the file.
 *
 * .pptx / .ppsx are zip packages and can be read; the old binary .ppt / .pps format cannot, so
 * for those only the file itself is kept.
 */
import JSZip from 'jszip';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e.toLowerCase()] ?? _;
});

/** The text of one slide's XML: one line per paragraph. */
export function slideText(xml) {
  const lines = [];
  for (const para of xml.split(/<\/a:p>/)) {
    const runs = [...para.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1]));
    const line = runs.join('').replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
  }
  return lines.join('\n').slice(0, 4000);
}

/** Slide files in presentation order: presentation.xml lists slide ids, its .rels maps them to files. */
function slideOrder(presentationXml, relsXml) {
  const targets = new Map();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]+)"/)?.[1];
    const target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target && /\/slide\d*\.xml$|^slides\//.test(target)) targets.set(id, target.replace(/^\/?ppt\//, '').replace(/^\.\//, ''));
  }
  const list = presentationXml.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/)?.[1] || '';
  return [...list.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => targets.get(m[1])).filter(Boolean).map((t) => `ppt/${t}`);
}

/**
 * { numPages, aspect, slides: [{ n, text }], thumbnail: Blob | null, readable }
 * `readable` is false for old binary PowerPoint files, which are stored and presented as they are.
 */
export async function readPowerPoint(file) {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!(head[0] === 0x50 && head[1] === 0x4b)) {
    return { numPages: null, aspect: 16 / 9, slides: [], thumbnail: null, readable: false };
  }
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const read = (p) => zip.file(p)?.async('string');
  const presentation = (await read('ppt/presentation.xml')) || '';
  const rels = (await read('ppt/_rels/presentation.xml.rels')) || '';
  let files = slideOrder(presentation, rels);
  if (!files.length) {
    // Unusual packages: fall back to the slide files themselves, by number.
    files = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  }
  const slides = [];
  for (let i = 0; i < files.length; i++) slides.push({ n: i + 1, text: slideText((await read(files[i])) || '') });

  const size = presentation.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const aspect = size ? Number(size[1]) / Number(size[2]) : 16 / 9;
  const thumbEntry = zip.file('docProps/thumbnail.jpeg') || zip.file('docProps/thumbnail.png');
  const thumbnail = thumbEntry
    ? new Blob([await thumbEntry.async('uint8array')], { type: thumbEntry.name.endsWith('.png') ? 'image/png' : 'image/jpeg' })
    : null;
  return { numPages: slides.length || null, aspect, slides, thumbnail, readable: true };
}

/** File type for the device's presentation app. */
export function powerPointMime(fileName = '') {
  const ext = fileName.toLowerCase().split('.').pop();
  return {
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    ppt: 'application/vnd.ms-powerpoint',
    pps: 'application/vnd.ms-powerpoint',
  }[ext] || 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
}
