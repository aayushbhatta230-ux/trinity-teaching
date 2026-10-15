// PowerPoint chapters: the app reads facts from the file but never changes it.
// Fixtures were saved by Microsoft PowerPoint: 3 slides, a picture, transitions and an animation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readPowerPoint, slideText, powerPointMime } from '../src/lib/pptx.js';

const fixture = (name) => new URL(`./fixtures/${name}`, import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('reads slide count, order, text, shape and preview picture from a real .pptx', async () => {
  const bytes = readFileSync(fixture('em-induction.pptx'));
  const info = await readPowerPoint(new Blob([bytes]));
  assert.equal(info.readable, true);
  assert.equal(info.numPages, 3);
  assert.equal(Math.round(info.aspect * 100) / 100, 1.78);
  assert.deepEqual(info.slides.map((s) => s.n), [1, 2, 3]);
  assert.match(info.slides[0].text, /^Electromagnetic Induction\nChapter 3 · Physics · Class 12$/);
  assert.match(info.slides[1].text, /Faraday's laws & Lenz's law/);
  assert.match(info.slides[1].text, /EMF = -dΦ\/dt, where Φ = BA cos θ/);
  assert.match(info.slides[2].text, /Energy stored U = ½ L I²/);
  assert.ok(info.thumbnail instanceof Blob && info.thumbnail.size > 1000, 'PowerPoint\'s own preview picture');
  assert.equal(info.thumbnail.type, 'image/jpeg');
});

test('reading never changes the file: the bytes are identical afterwards', async () => {
  const bytes = readFileSync(fixture('em-induction.pptx'));
  const before = sha(bytes);
  const blob = new Blob([bytes]);
  await readPowerPoint(blob);
  assert.equal(sha(Buffer.from(await blob.arrayBuffer())), before);
});

test('old binary .ppt is accepted as it is (no text, presented by PowerPoint)', async () => {
  const info = await readPowerPoint(new Blob([readFileSync(fixture('em-induction.ppt'))]));
  assert.equal(info.readable, false);
  assert.equal(info.numPages, null);
  assert.deepEqual(info.slides, []);
});

test('slide text: one line per paragraph, XML entities decoded', () => {
  const xml = '<p:sp><a:p><a:r><a:t>Lenz&apos;s law &amp; energy</a:t></a:r></a:p>'
    + '<a:p><a:r><a:t>Φ = BA cos θ</a:t></a:r><a:r><a:t xml:space="preserve"> (weber)</a:t></a:r></a:p><a:p></a:p></p:sp>';
  assert.equal(slideText(xml), "Lenz's law & energy\nΦ = BA cos θ (weber)");
});

test('file types handed to the presentation app', () => {
  assert.equal(powerPointMime('Chapter 3.pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.equal(powerPointMime('show.PPSX'), 'application/vnd.openxmlformats-officedocument.presentationml.slideshow');
  assert.equal(powerPointMime('old.ppt'), 'application/vnd.ms-powerpoint');
});
