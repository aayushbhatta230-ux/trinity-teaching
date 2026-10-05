/**
 * Academic structure of the college.
 * Everything the selection flow shows is derived from this file —
 * add a class, shift, group, section or subject here and the UI follows.
 */

const letters = (from, to) => {
  const out = [];
  for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) out.push(String.fromCharCode(c));
  return out;
};

export const CLASSES = [
  { id: '11', label: 'Class 11', short: 'XI' },
  { id: '12', label: 'Class 12', short: 'XII' },
];

export const SHIFTS = [
  { id: 'M', label: 'Morning', icon: 'sunrise' },
  { id: 'D', label: 'Day', icon: 'sun' },
];

/**
 * Groups (streams). `sections` is keyed by shift id.
 * `subjects` is the ordered list of subject ids taught in this group.
 */
export const GROUPS = [
  {
    id: 'PHY',
    label: 'Physical',
    icon: 'atom',
    sections: { M: letters('A', 'H'), D: letters('A', 'H') },
    subjects: ['mathematics', 'physics', 'chemistry', 'english', 'nepali', 'computer'],
  },
  {
    id: 'BIO',
    label: 'Biology',
    icon: 'leaf',
    sections: { M: letters('I', 'Q'), D: letters('I', 'T') },
    subjects: ['biology', 'physics', 'chemistry', 'mathematics', 'english', 'nepali'],
  },
];

/**
 * Subjects. A subject with a single portion skips the "Select Portion" step.
 */
export const SUBJECTS = {
  mathematics: { label: 'Mathematics', icon: 'sigma', portions: ['math.algebra', 'math.analytical', 'math.calculus'] },
  physics: { label: 'Physics', icon: 'atom', portions: ['phy.mechanics', 'phy.electricity', 'phy.thermo'] },
  chemistry: { label: 'Chemistry', icon: 'flask', portions: ['chem.physical', 'chem.organic', 'chem.inorganic'] },
  biology: { label: 'Biology', icon: 'leaf', portions: ['bio.botany', 'bio.zoology'] },
  english: { label: 'English', icon: 'book', portions: ['eng.general'] },
  nepali: { label: 'Nepali', native: 'नेपाली', icon: 'languages', portions: ['nep.general'] },
  computer: { label: 'Computer Science', icon: 'monitor', portions: ['comp.general'] },
};

export const PORTIONS = {
  'math.algebra': { label: 'Algebra', detail: 'Sets, functions, matrices & sequences', icon: 'variable' },
  'math.analytical': { label: 'Analytical', detail: 'Coordinate & analytic geometry', icon: 'triangle' },
  'math.calculus': { label: 'Calculus', detail: 'Limits, derivatives & integrals', icon: 'sigma' },
  'phy.mechanics': { label: 'Mechanics', detail: 'Motion, force & energy', icon: 'cog' },
  'phy.electricity': { label: 'Electricity', detail: 'Charges, circuits & fields', icon: 'zap' },
  'phy.thermo': { label: 'Thermodynamics', detail: 'Heat, temperature & gases', icon: 'thermometer' },
  'chem.physical': { label: 'Physical', detail: 'Atomic structure & equilibria', icon: 'atom' },
  'chem.organic': { label: 'Organic', detail: 'Carbon compounds & reactions', icon: 'hexagon' },
  'chem.inorganic': { label: 'Inorganic', detail: 'Elements & periodic properties', icon: 'flask' },
  'bio.botany': { label: 'Botany', detail: 'Plant biology', icon: 'sprout' },
  'bio.zoology': { label: 'Zoology', detail: 'Animal biology', icon: 'bug' },
  'eng.general': { label: 'English', detail: 'Language & literature', icon: 'book' },
  'nep.general': { label: 'Nepali', detail: 'भाषा र साहित्य', icon: 'languages' },
  'comp.general': { label: 'Computer Science', detail: 'Programming & systems', icon: 'monitor' },
};

/** Section code used everywhere in the app: shift + section + class, e.g. Morning·A·Class 11 → "MA1", Day·B·Class 12 → "DB2". */
export const sectionCode = (cls, shift, section) => `${shift}${section}${cls === '11' ? 1 : 2}`;
