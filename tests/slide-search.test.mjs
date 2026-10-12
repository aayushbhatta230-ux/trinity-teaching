// Offline slide search: "Take me to the slide about …" works on the board without internet.
//   npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { findSlide, isNavigation } from '../src/lib/ai.js';

const slides = [
  { n: 1, text: 'Electromagnetic Induction\nChapter 3' },
  { n: 2, text: "Faraday's laws\nemf = -N dΦ/dt" },
  { n: 3, text: "Lenz's law\nThe induced current opposes the change in flux" },
  { n: 4, text: 'Transformers\nVs / Vp = Ns / Np\nCopper, eddy current and hysteresis losses' },
];

test('recognises navigation requests', () => {
  assert.ok(isNavigation("Take me to the slide about Lenz's law"));
  assert.ok(isNavigation('Open the slide on transformers'));
  assert.ok(isNavigation('show me slides about Faraday'));
  assert.ok(!isNavigation('Explain Lenz law'));
  assert.ok(!isNavigation('10 toughest MCQs on this chapter'));
});

test('finds the slide a request is about', () => {
  assert.equal(findSlide(slides, "Take me to the slide about Lenz's law"), 3);
  assert.equal(findSlide(slides, 'Open the slide about transformers'), 4);
  assert.equal(findSlide(slides, "Go to the slide on Faraday's laws"), 2);
});

test('title lines count for more than body text', () => {
  const s = [{ n: 1, text: 'Intro\nOverview\nwe will meet transformers later' }, { n: 2, text: 'Transformers\nstep up and step down' }];
  assert.equal(findSlide(s, 'slide about transformers'), 2);
});

test('returns null when nothing matches well enough', () => {
  assert.equal(findSlide(slides, 'Take me to the slide about photosynthesis'), null);
  assert.equal(findSlide(slides, 'slide'), null);
});
