// Checks which bank questions each sample chapter would get (grade rule + chapter gate).
//   node scripts/bank-match-test.mjs <bank.sql.json>
import fs from 'node:fs';
import { matchesChapter, chapterWords, terms } from '../src/bank.js';

const bank = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((q) => ({ ...q, options: JSON.stringify(q.options) }));

const chapters = [
  { cls: '11', subject: 'physics', title: 'Kinematics', slides: ['Displacement, velocity and acceleration', 'Equations of motion v = u + at, s = ut + 1/2 at^2', 'Projectile motion: range and time of flight'] },
  { cls: '12', subject: 'physics', title: 'Electromagnetic Induction', slides: ["Faraday's law of induction, magnetic flux", "Lenz's law", 'Self and mutual inductance, AC generator, transformer'] },
  { cls: '11', subject: 'mathematics', title: 'Matrices and Determinants', slides: ['Types of matrices, transpose', 'Determinant of a 2x2 and 3x3 matrix', 'Inverse of a matrix'] },
  { cls: '12', subject: 'biology', title: 'Human Circulatory System', slides: ['Structure of the heart, chambers and valves', 'Cardiac cycle, pacemaker (SA node)', 'Blood vessels: arteries and veins, blood pressure'] },
  { cls: '11', subject: 'chemistry', title: 'Chemical Bonding and Shapes of Molecules', slides: ['Ionic and covalent bonds', 'VSEPR theory, hybridization sp, sp2, sp3', 'Dipole moment, hydrogen bonding'] },
  { cls: '11', subject: 'physics', title: 'Laws of Motion', slides: ["Newton's first, second and third laws", 'Inertia, momentum and impulse', 'Friction: static and kinetic'] },
  { cls: '12', subject: 'physics', title: 'Current Electricity', slides: ["Ohm's law, resistance and resistivity", "Kirchhoff's laws", 'Wheatstone bridge, potentiometer'] },
  { cls: '12', subject: 'physics', title: 'Electrostatics', slides: ["Coulomb's law, electric field", "Gauss's law", 'Electric potential, capacitors'] },
  { cls: '12', subject: 'chemistry', title: 'Haloalkanes and Haloarenes', slides: ['Nomenclature of haloalkanes', 'SN1 and SN2 mechanisms', 'Chloroform, chlorobenzene'] },
  { cls: '12', subject: 'biology', title: 'Genetics', slides: ["Mendel's laws of inheritance", 'Monohybrid and dihybrid cross, alleles', 'Sex-linked inheritance, chromosomes'] },
];

for (const c of chapters) {
  const context = { title: c.title, slides: c.slides.map((text, i) => ({ n: i + 1, text })) };
  const words = chapterWords(context);
  const pool = bank.filter((q) => q.subject === c.subject && (c.cls === '12' || q.grade === '11'));
  const hits = pool.filter((q) => matchesChapter(q, words, new Set(terms(c.title))));
  console.log(`\n=== Class ${c.cls} ${c.subject}: ${c.title} → ${hits.length} of ${pool.length} eligible`);
  for (const q of hits.slice(0, 12)) console.log(`  [G${q.grade} ${q.exam} · ${q.topic}] ${q.question.slice(0, 95)}`);
}
