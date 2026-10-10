// Question bank: real past questions (with exam and year) and the college's practice question
// bank (IOE and IOM). Finds the questions that belong to the chapter on the board.
// Matching is done here (cheap, no AI); the AI then chooses among the shortlist.

const STOP = new Set(('the a an and or of to in on for with by from at as is are was were be been this that these those it its into than then '
  + 'which what when where who how why can will would should could may might also about between under over each such their there '
  + 'slide chapter class physics chemistry mathematics biology english teacher morning day unit using used use given find value '
  + 'following correct option answer true false statement both none above all most best').split(' '));

/** Lower-case word stems (≥4 letters, crude plural trimming) for overlap scoring. */
export function terms(text = '') {
  return (text.toLowerCase().match(/[a-zα-ω][a-zα-ω'’-]{3,}/g) || [])
    .map((w) => w.replace(/['’]s$/, '').replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1'))
    .filter((w) => !STOP.has(w));
}

/** The chapter's most frequent meaningful terms; the title counts extra. */
export function chapterTerms(context) {
  const freq = new Map();
  const add = (w, n) => freq.set(w, (freq.get(w) || 0) + n);
  for (const s of context.slides || []) for (const w of terms(s.text)) add(w, 1);
  for (const w of terms(`${context.title || ''} ${context.portionLabel || ''}`)) add(w, 5);
  return new Map([...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60));
}

/** Every meaningful word in the chapter (title and all slides). */
export function chapterWords(context) {
  const set = new Set(terms(context.title || ''));
  for (const s of context.slides || []) for (const w of terms(s.text)) set.add(w);
  return set;
}

// What each bank topic is about. A question is used only when its topic shows up in the chapter.
const TOPIC_KEYS = {
  // mathematics
  algebra: ['algebra', 'equation', 'root', 'polynomial', 'quadratic'], quadratics: ['quadratic', 'root', 'discriminant'],
  'complex numbers': ['complex', 'imaginary', 'argand', 'modulus'], logarithms: ['logarithm', 'log'], matrices: ['matri', 'determinant'],
  probability: ['probabilit', 'event', 'random'], statistics: ['statistic', 'mean', 'median', 'variance', 'deviation'],
  sequences: ['sequence', 'series', 'progression'], trigonometry: ['trigonometr', 'sine', 'cosine', 'tangent', 'angle'],
  'coordinate geometry': ['coordinate', 'straight', 'slope', 'line', 'circle'], geometry: ['geometr', 'circle', 'triangle', 'line'],
  conics: ['conic', 'parabola', 'ellipse', 'hyperbola'], vectors: ['vector', 'scalar', 'dot', 'cross'],
  limits: ['limit', 'continuit'], differentiation: ['derivative', 'differentia', 'tangent', 'maxima', 'minima'],
  integration: ['integra', 'antiderivative', 'area'],
  // physics
  units: ['unit', 'dimension', 'measurement'], dimensions: ['dimension', 'unit'], 'units and dimensions': ['unit', 'dimension'],
  kinematics: ['kinemat', 'velocity', 'acceleration', 'displacement', 'projectile', 'motion'], motion: ['motion', 'velocity', 'acceleration'],
  mechanics: ['newton', 'force', 'friction', 'momentum', 'inertia'], newton: ['newton', 'force', 'inertia'],
  momentum: ['momentum', 'impulse', 'collision'], work: ['work', 'energy', 'power'], 'work and energy': ['work', 'energy', 'power'],
  'circular motion': ['circular', 'centripetal', 'angular'], gravitation: ['gravit', 'satellite', 'orbit', 'planet'],
  fluids: ['fluid', 'pressure', 'viscosity', 'bernoulli', 'buoyan'], oscillations: ['oscillat', 'harmonic', 'pendulum', 'spring'],
  shm: ['harmonic', 'oscillat', 'pendulum'], waves: ['wave', 'frequency', 'wavelength', 'sound'], sound: ['sound', 'wave', 'doppler', 'pitch'],
  heat: ['heat', 'temperature', 'thermal', 'specific'], 'thermal physics': ['thermal', 'heat', 'temperature', 'expansion'],
  thermodynamics: ['thermodynamic', 'heat', 'entropy', 'isothermal', 'adiabatic'], 'gas laws': ['gas', 'pressure', 'boyle', 'charles'],
  optics: ['optic', 'lens', 'mirror', 'refract', 'reflect', 'light'], electrostatics: ['electrostatic', 'coulomb', 'gauss', 'potential', 'capacit'],
  capacitors: ['capacit', 'dielectric'], electricity: ['current', 'resist', 'ohm', 'circuit', 'kirchhoff', 'wheatstone'],
  'current electricity': ['current', 'resist', 'ohm', 'circuit', 'kirchhoff'], magnetism: ['magnetism', 'biot', 'ampere', 'lorentz', 'solenoid', 'galvanometer', 'cyclotron'],
  electromagnetism: ['electromagnet', 'induction', 'induced', 'faraday', 'lenz'], induction: ['induct', 'faraday', 'lenz', 'flux'],
  'modern physics': ['photo', 'electron', 'quantum', 'bohr', 'x-ray', 'atom', 'nucle'], nuclear: ['nucle', 'fission', 'fusion', 'binding'],
  radioactivity: ['radioactiv', 'decay', 'half-life', 'alpha', 'beta', 'gamma'], semiconductor: ['semiconductor', 'diode', 'transistor', 'junction'],
  // chemistry
  'mole concept': ['mole', 'avogadro', 'molar'], stoichiometry: ['stoichiometr', 'mole', 'limiting', 'molar'], 'chemical stoichiometry': ['stoichiometr', 'mole'],
  'atomic structure': ['atom', 'orbital', 'quantum', 'electron', 'bohr'], periodicity: ['periodic', 'ionization', 'electronegativ', 'atomic radi'],
  'periodic table': ['periodic', 'group', 'period', 'element'], bonding: ['bond', 'hybridi', 'vsepr', 'covalent', 'ionic'],
  'chemical bonding': ['bond', 'hybridi', 'vsepr', 'covalent', 'ionic'], redox: ['redox', 'oxidation', 'reduction'],
  'chemical kinetics': ['kinetic', 'rate', 'order', 'activation'], kinetics: ['kinetic', 'rate', 'order', 'activation'],
  equilibrium: ['equilibri', 'chatelier', 'constant'], 'chemical equilibrium': ['equilibri', 'chatelier'],
  solutions: ['solution', 'molarity', 'molality', 'concentration', 'solubilit'], 'acids and bases': ['acid', 'base', 'ph', 'buffer'],
  'acids bases': ['acid', 'base', 'ph'], acids: ['acid', 'base', 'ph'], ph: ['acid', 'base', 'buffer', 'hydrogen ion'],
  electrochemistry: ['electrochem', 'electrode', 'electrolysis', 'cell', 'faraday'], 'gas laws (chem)': ['gas'],
  organic: ['organic', 'carbon', 'hydrocarbon', 'alkane', 'alkene', 'functional'], 'organic chemistry': ['organic', 'carbon', 'functional', 'isomer'],
  hydrocarbons: ['hydrocarbon', 'alkane', 'alkene', 'alkyne', 'benzene'], 'aromatic compounds': ['aromatic', 'benzene'],
  haloalkanes: ['haloalkane', 'halide', 'sn1', 'sn2'], biomolecules: ['biomolecule', 'carbohydrate', 'protein', 'lipid', 'vitamin'],
  polymers: ['polymer', 'monomer'], 'coordination chemistry': ['coordination', 'ligand', 'complex'], coordination: ['coordination', 'ligand', 'complex'],
  'transition metals': ['transition', 'd-block', 'metal'],
  // biology
  cell: ['cell', 'organelle', 'membrane'], 'cell biology': ['cell', 'organelle', 'membrane', 'mitochondri'], 'cell division': ['mitosis', 'meiosis', 'division'],
  genetics: ['gene', 'genetic', 'mendel', 'allele', 'inherit', 'chromosome'], ecology: ['ecolog', 'ecosystem', 'food chain', 'population'],
  photosynthesis: ['photosynth', 'chlorophyll', 'light reaction', 'calvin'], 'plant physiology': ['plant', 'transpiration', 'osmosis', 'stomata', 'photosynth'],
  transport: ['transport', 'xylem', 'phloem', 'osmosis'], respiration: ['respiration', 'glycolysis', 'krebs', 'atp'],
  reproduction: ['reproduct', 'pollination', 'fertili', 'gamete'], evolution: ['evolution', 'darwin', 'natural selection', 'fossil'],
  'human physiology': ['human', 'physiolog', 'organ'], digestion: ['digest', 'enzyme', 'stomach', 'intestine'],
  circulation: ['circulat', 'heart', 'blood', 'artery'], heart: ['heart', 'cardiac'], blood: ['blood', 'plasma', 'hemoglobin'],
  excretion: ['excret', 'kidney', 'nephron', 'urine'], 'nervous system': ['nerv', 'neuron', 'brain', 'impulse'],
  endocrine: ['endocrine', 'hormone', 'gland'], endocrinology: ['endocrine', 'hormone', 'gland'], hormones: ['hormone', 'gland'],
  immunity: ['immun', 'antibod', 'antigen', 'vaccine'], immunology: ['immun', 'antibod', 'antigen', 'vaccine'],
  // english
  grammar: ['grammar', 'tense', 'sentence', 'clause'], 'english grammar': ['grammar', 'tense', 'sentence'], agreement: ['agreement', 'concord', 'subject'],
  articles: ['article'], prepositions: ['preposition'], voice: ['voice', 'passive', 'active'], vocabulary: ['vocabular', 'synonym', 'antonym', 'meaning', 'word'],
};

const topicKeys = (topic) => TOPIC_KEYS[String(topic || '').toLowerCase()] || terms(topic || '');

// Words too general to tie a question to one chapter.
const GENERIC = new Set(('human body system process type form mainly primarily directly responsible represent represents state states '
  + 'normal common called known level example nature main part role effect effects change changes increase decrease number law laws expressed').split(' '));

/**
 * Does this question belong to the chapter on the board?
 *   - at least two of the question's specific words appear in the chapter, or
 *   - one does, and the question's topic is clearly the chapter's (in its title, or two of the
 *     topic's key terms in its slides).
 * Questions from other chapters of the same subject never show.
 */
export function matchesChapter(q, words, titleWords = new Set()) {
  const list = [...words];
  const has = (k, pool = list) => pool.some((w) => w.startsWith(k.split(' ')[0]));
  const topicName = terms(q.topic || '');
  // Whole words (allowing plural/stem endings): "Electricity" is not "Electrostatics".
  const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a)));
  const inTitle = topicName.length > 0 && topicName.every((t) => [...titleWords].some((w) => sameWord(w, t)));
  const topicStrong = inTitle || topicKeys(q.topic).filter((k) => has(k)).length >= 2;
  // The question and its correct answer only: words in the wrong options say nothing about the chapter.
  const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [];
  const right = options['ABCD'.indexOf(q.answer)] || '';
  const own = new Set(terms(`${q.question} ${right}`).filter((w) => !GENERIC.has(w)));
  const overlap = [...own].filter((w) => words.has(w)).length;
  return overlap >= 2 || (overlap >= 1 && topicStrong);
}

function score(q, weights) {
  let s = 0;
  for (const w of new Set(terms(`${q.topic || ''} ${q.topic || ''} ${q.question} ${q.options}`))) s += Math.min(weights.get(w) || 0, 6);
  return s;
}

/**
 * Questions for a chapter: same subject and exams, right for the class (Class 11 gets Grade 11
 * questions only; Class 12 gets Grade 11 and 12), answer confirmed, and about this chapter.
 * Ranked by relevance, then difficulty.
 */
export async function shortlist(db, { subject, exams, cls, context, weights, limit }) {
  const params = [subject];
  let sql = 'SELECT * FROM questions WHERE subject = ? AND (verified = 1 OR answer_source = \'key\')';
  if (exams?.length) { sql += ` AND exam IN (${exams.map(() => '?').join(',')})`; params.push(...exams); }
  if (String(cls) === '11') sql += " AND grade = '11'";
  sql += ' LIMIT 3000';
  let results;
  try {
    ({ results } = await db.prepare(sql).bind(...params).all());
  } catch {
    return []; // bank not set up yet
  }
  const words = chapterWords(context);
  const titleWords = new Set(terms(context.title || ''));
  return results
    .filter((q) => matchesChapter(q, words, titleWords))
    .map((q) => ({ q, s: score(q, weights) + (q.difficulty || 3) * 0.5 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.q);
}

/** Shape a stored question for the app: a real past question, or a question-bank item. */
export function present(q) {
  return {
    kind: q.year ? 'past' : 'bank',
    id: q.id,
    exam: q.exam,
    year: q.year,
    qno: q.qno,
    topic: q.topic,
    question: q.question,
    options: JSON.parse(q.options),
    answer: q.answer,
    answerSource: q.answer_source,
    explanation: q.explanation || null,
  };
}

/** Compact listing of shortlisted questions for the AI prompt. */
export function listForPrompt(questions) {
  return questions.map((q) => {
    const o = JSON.parse(q.options);
    const where = q.year ? `real past question, ${q.exam} ${q.year} Q${q.qno || '?'}` : `question bank, ${q.exam}`;
    return `[id ${q.id}] ${where} (difficulty ${q.difficulty || '?'}/5, topic: ${q.topic || '-'}, answer: ${q.answer || 'not known'})\n${q.question}\nA) ${o[0]}  B) ${o[1]}  C) ${o[2]}  D) ${o[3]}`;
  }).join('\n\n');
}
