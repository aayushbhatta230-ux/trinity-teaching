// Entrance-exam syllabi the AI works from (summarised from the official documents):
//   CEE  – Medical Education Commission, "Syllabus for Bachelor Level Common Entrance
//          Examination" (MECEE-BL), third revision 28 April 2026, programme group I
//          (MBBS, BDS, BSc Nursing/Midwifery, BASLP, B Perfusion Technology).
//   IOM  – Since 2020 the bachelor programmes of TU Institute of Medicine admit through the same
//          MEC common entrance. Programme group II (B Pharm, BSc MLT, BSc MIT, BPT, B Optometry,
//          BAMS) and group III (BPH) use smaller PCB weightage; that weightage is used here.
//   IOE  – TU Institute of Engineering, "Detail Syllabus of B.E./B.Arch. Entrance Examination".
// The +2 courses (NEB Grade 11–12, CDC curriculum 2076) are the prerequisite for all three.
// Numbers are questions per unit in one paper.

export const EXAMS = {
  CEE: {
    name: 'CEE (MECEE-BL, Medical Education Commission)',
    format: '200 single-best-answer MCQs with four options, 3 hours, 1 mark each, −0.25 for a wrong answer. Items are set in the ratio 50:30:20 for recall, understanding and application.',
    style: 'Short stems testing exact facts, definitions, named examples and one- or two-step calculations. Distractors are close variants of the right answer. Application items use realistic data.',
  },
  IOM: {
    name: 'IOM programmes (B Pharm, BPH, BSc MLT, BPT …) through the MEC common entrance',
    format: '200 single-best-answer MCQs with four options, 3 hours, −0.25 for a wrong answer, 50:30:20 recall/understanding/application. PCB weightage is smaller than for MBBS, and 20 questions come from the PCL/diploma course.',
    style: 'Same style as the CEE: fact recall with close distractors, plus short applied numericals.',
  },
  IOE: {
    name: 'IOE B.E./B.Arch. entrance (TU Institute of Engineering)',
    format: '100 MCQs with four options, 2 hours: section A has 60 one-mark questions, section B has 40 two-mark questions (140 marks). Wrong answers lose 10% of the question\'s marks.',
    style: 'Numerical problem solving dominates: multi-step calculations, formula manipulation, limiting cases and graphs. Section B questions combine two ideas. Theory questions test precise statements of laws.',
  },
};

// Units with questions per paper, and what each unit covers.
export const SYLLABUS = {
  physics: {
    CEE: { total: 50, units: [
      ['Mechanics', 10, 'dimensions, significant figures, vectors; kinematics and projectiles; Newton\'s laws, impulse, momentum, collisions, friction; work, energy, power; rotational dynamics (moment of inertia of a rod, radius of gyration, torque); fluids (pressure, surface tension, capillarity, Stokes, Poiseuille, Bernoulli); circular motion; SHM and forced oscillation; gravitation; elasticity (stress, strain, moduli, Poisson ratio, energy density)'],
      ['Heat and thermodynamics', 7, 'temperature and thermometers; conduction, Stefan–Boltzmann law; thermal expansion; specific and latent heat, triple point; kinetic theory, rms speed; first law and isothermal/adiabatic/isochoric/isobaric processes; second law, engines, refrigerators, entropy'],
      ['Waves and optics', 8, 'progressive waves, speed of sound in solids, liquids, gases; stationary waves, harmonics in pipes and strings; intensity, loudness, pitch, Doppler effect; mirrors, refraction, lenses, dispersion, chromatic aberration; interference and Young\'s double slit; single-slit diffraction, grating, resolving power; polarization, Brewster\'s law'],
      ['Current electricity and magnetism', 9, 'Ohm and Joule laws; Kirchhoff\'s laws, Wheatstone and metre bridge, potentiometer, galvanometer conversion; Seebeck and Peltier effects; AC peak/rms, impedance, power, Q-factor, LCR phase, bridge rectifier; dia/para/ferromagnetism, hysteresis; B-field of wire, coil, solenoid, force on charges and conductors, Hall effect; Faraday and Lenz laws, AC generator, transformer, eddy currents, self and mutual inductance, energy in an inductor'],
      ['Electrostatics and capacitors', 4, 'Coulomb\'s law, electric field of point charges, induction; field, potential, potential energy, Gauss\'s law; parallel-plate capacitor, combinations, energy density, dielectrics'],
      ['Modern physics', 12, 'nucleus, mass defect, binding energy per nucleon, fission and fusion; electron in E and B fields, Millikan and J.J. Thomson; photoelectric effect; Bohr model, spectral series, de Broglie, uncertainty principle, X-rays, Bragg\'s law; radioactivity, half-life, mean life, carbon dating, medical uses and hazards; energy bands, semiconductors, p-n diode, rectifier, logic gates; particles, quarks, leptons, Higgs boson, nanotechnology, big bang, Hubble law'],
    ] },
    IOM: { total: 40, units: [['Mechanics', 8], ['Heat and thermodynamics', 6], ['Waves and optics', 6], ['Current electricity and magnetism', 7], ['Electrostatics and capacitors', 3], ['Modern physics', 10]] },
    IOE: { total: 40, marks: 'Physics: 40 marks', units: [
      ['Mechanics', null, 'dimensions, vectors, equations of motion, projectiles, relative motion; Newton\'s laws, momentum conservation, friction; work–energy theorem, collisions; circular motion, conical pendulum, banking, gravitation, satellites, SHM, damped and forced oscillation; rotational dynamics, angular momentum; elasticity; fluids (buoyancy, surface tension, capillarity, viscosity, Stokes, Poiseuille, Reynolds number, continuity, Bernoulli)'],
      ['Heat and thermodynamics', null, 'specific and latent heat, method of mixtures, Newton\'s law of cooling, triple point; expansion; conduction, convection, radiation, black body, Stefan–Boltzmann; kinetic theory, heat capacities; first and second laws, Carnot, Otto and Diesel cycles, refrigerator, entropy'],
      ['Geometric and physical optics', null, 'mirrors; refraction, critical angle, total internal reflection, prism and minimum deviation, lens and lens-maker formulas, optical fibre; dispersion, aberrations, scattering; Huygens principle; Young\'s double slit; Fraunhofer diffraction, grating, resolving power; polarization, Brewster\'s law'],
      ['Waves and sound', null, 'travelling and stationary waves; speed of sound and effect of temperature, pressure, humidity; pipes, resonance tube, strings; intensity level, ultrasonics, Doppler effect'],
      ['Electricity and magnetism', null, 'Coulomb, Gauss, potential, capacitors and dielectrics; DC circuits, Kirchhoff; thermoelectric effects; Biot–Savart, Ampere, force on conductors, Hall effect; magnetic materials; Faraday\'s law, induced emf, generators, self and mutual induction, transformer; AC, phasors, Q-factor, power factor'],
      ['Modern physics', null, 'Millikan, cathode rays, specific charge; photoelectric effect, Bohr theory, spectral series, de Broglie, uncertainty, X-rays and Bragg\'s law, laser; semiconductors, p-n junction, Zener diode, transistor, logic gates; radioactivity, mass defect, fission and fusion, carbon dating; particle physics, cosmology, seismology, telecommunication, nanotechnology, superconductors'],
    ] },
  },
  chemistry: {
    CEE: { total: 50, units: [
      ['Physical chemistry', 17, 'mole concept, stoichiometry, limiting reagent, percentage yield; atomic structure (Bohr, de Broglie, quantum numbers, Aufbau, Pauli, Hund); periodicity; bonding, VSEPR, hybridization, dipole moment, hydrogen bonding; redox balancing; gases, liquids, solids (unit cell, 7 crystal systems, 14 Bravais lattices); chemical equilibrium, Kp–Kc, Le Chatelier; volumetric analysis, normality, molarity, molality, ppm; ionic equilibrium, pH, buffers, solubility product, common ion effect; kinetics (order, zero/first-order half-life, activation energy, catalysis); electrochemistry, electrode potentials, cells; thermodynamics (enthalpies, Hess\'s law, entropy, Gibbs energy and K); nuclear chemistry'],
      ['Inorganic chemistry', 10, 'hydrogen and heavy water, oxides, ozone; ammonia, phosphine, nitric acid; halogens and hydrogen halides; carbon allotropes, CO, H2S, SO2, sulphuric acid; metallurgy (calcination, roasting, smelting, refining); alkali and alkaline-earth metals, sodium compounds; 3d transition metals, complex shapes, crystal field theory; extraction of Cu, Zn, Hg, Ag, Fe; vitriols, calomel; steel, corrosion; bio-inorganic chemistry and metal toxicity'],
      ['Organic chemistry', 17, 'IUPAC naming, isomerism, bond fission, electrophiles and nucleophiles, inductive and resonance effects; alkanes, alkenes, alkynes, octane and cetane numbers; benzene and aromaticity; haloalkanes, SN1 and SN2, chloroform, chlorobenzene; alcohols and phenol; ethers, Williamson synthesis; aldehydes, ketones, benzaldehyde; carboxylic acids and derivatives; nitro compounds; amines, Hoffmann separation, aniline; Grignard reagent'],
      ['Applied chemistry', 3, 'chemical industry; Ostwald, Haber, Contact, Solvay and diaphragm-cell processes, urea; cement, paper; uses of common elements and compounds; polymers, dyes, drugs, pesticides, fertilizers, colloids, radioisotopes'],
      ['Analytical chemistry', 3, 'tests for acid and basic radicals and functional groups, Lassaigne\'s test, biomolecule tests; separation techniques, chromatography; acid–base, redox and complexometric titrations, indicator choice'],
    ] },
    IOM: { total: 40, units: [['Physical chemistry', 14], ['Inorganic chemistry', 7], ['Organic chemistry', 13], ['Applied chemistry', 3], ['Analytical chemistry', 3]] },
    IOE: { total: 30, marks: 'Chemistry: 30 marks', units: [
      ['Physical chemistry', null, 'chemical arithmetic, equivalent masses, limiting reactant; states of matter; atomic structure and periodic table; redox and equilibrium; volumetric analysis; ionic equilibrium, acids, bases, salts; electrochemistry; energetics, kinetics, bonding and shapes'],
      ['Inorganic chemistry', null, 'hydrogen, oxygen, ozone, water, nitrogen compounds, halogens, carbon, phosphorus, sulphur, noble gases, pollution; metallurgy, alkali and alkaline-earth metals, coinage metals; extraction of zinc, mercury, iron compounds'],
      ['Organic chemistry', null, 'purification, nomenclature, isomerism, reaction mechanisms; hydrocarbons and aromatics; haloalkanes and haloarenes; alcohols, phenols, ethers; aldehydes, ketones, carboxylic acids and derivatives; nitro compounds and amines'],
    ] },
  },
  biology: {
    CEE: { total: 80, units: [
      ['Zoology: Evolutionary biology', 3, 'Oparin–Haldane, Miller–Urey, evidences of evolution, Lamarckism, Darwinism, neo-Darwinism, human evolution'],
      ['Zoology: Animal diversity and classification', 4, 'diagnostic features from Protozoa to Chordata'],
      ['Zoology: Animal tissues and histology', 4, 'epithelial, connective, muscular, nervous tissue'],
      ['Zoology: Selected animals', 6, 'Plasmodium and malaria, earthworm (Pheretima), frog (Rana)'],
      ['Zoology: Human biology and physiology', 15, 'digestion, respiration, circulation, cardiac cycle, blood groups and pressure, excretion, nervous system and impulse, eye and ear, endocrine glands, reproduction, gametogenesis, menstrual cycle'],
      ['Zoology: Microbial diseases and immunology', 4, 'typhoid, TB, HIV, cholera, influenza, hepatitis, candidiasis; innate and acquired immunity; antigens, antibodies; vaccines'],
      ['Zoology: Medical technology and applied biology', 2, 'transplantation, IVF, amniocentesis, transgenic animals, applied microbiology'],
      ['Zoology: Biota, environment and conservation', 2, 'behaviour, pollution, adaptations, protected areas, Ramsar sites, IUCN categories, endangered species of Nepal'],
      ['Botany: Basic components of life', 2, 'carbohydrates, lipids, minerals, proteins, enzymes'],
      ['Botany: Biodiversity', 9, 'classification systems, bacteria, cyanobacteria, viruses, fungi (yeast, Mucor), lichens, algae (Spirogyra), bryophytes (Marchantia), pteridophytes (Dryopteris), gymnosperms (Pinus), angiosperm morphology, families Brassicaceae, Solanaceae, Fabaceae, Liliaceae, economic and medicinal plants of Nepal'],
      ['Botany: Ecology and vegetation', 4, 'pond and forest ecosystems, carbon and nitrogen cycles, greenhouse effect, acid rain, ozone depletion, forest types of Nepal, succession, hydrosere, xerosere'],
      ['Botany: Cell biology', 5, 'prokaryotic and eukaryotic cells, organelles, cell cycle, mitosis, meiosis'],
      ['Botany: Genetics', 6, 'DNA and RNA, replication, central dogma, genetic code, Mendel\'s laws, incomplete and co-dominance, linkage, crossing over, sex-linked inheritance, mutation, polyploidy, genetic disorders'],
      ['Botany: Plant anatomy', 3, 'tissues, vascular bundles, monocot and dicot root, stem, leaf'],
      ['Botany: Plant physiology', 6, 'water potential, osmosis, plasmolysis, transpiration, ascent of sap; photosynthesis, PS I and II, C3 and C4 cycles, photorespiration; glycolysis, Krebs cycle, ETS; auxins, gibberellins, cytokinins, germination, dormancy'],
      ['Botany: Developmental botany', 2, 'sporogenesis and gametogenesis in angiosperms, pollination, fertilization, embryo, endosperm'],
      ['Botany: Applied botany', 3, 'plant tissue culture, genetic engineering, biofertilizers, plant breeding, food security'],
    ] },
    IOM: { total: 80, units: 'same zoology and botany weightage as the CEE' },
  },
  mathematics: {
    IOE: { total: 50, marks: 'Mathematics: 50 marks', units: [
      ['Set, logic and functions', null, 'real numbers, intervals, absolute value, logic and connectives; injective, surjective, bijective, inverse and composite functions'],
      ['Algebra', null, 'matrices and determinants, inverse; complex numbers and polynomial equations; sequences and series, permutations and combinations; binomial theorem, exponential and logarithmic series'],
      ['Trigonometry', null, 'trigonometric equations and general values, inverse functions and principal values, properties and solution of triangles, in-, ortho- and circum-centre'],
      ['Coordinate geometry', null, 'straight lines and pairs of lines; circles, tangent and normal; parabola, ellipse, hyperbola; coordinates in space and the plane'],
      ['Calculus', null, 'limits, continuity, L\'Hospital\'s rule; derivatives, tangents and normals, rates, maxima and minima; integration, definite integrals, area between curves; first-order differential equations (separable, homogeneous, linear, exact)'],
      ['Vectors', null, 'vector algebra, linear dependence, scalar and vector products, scalar triple product'],
      ['Statistics and probability', null, 'measures of location and dispersion, correlation and regression, conditional probability, Bayes\' theorem, binomial distribution'],
    ] },
  },
  english: {
    IOE: { total: 20, marks: 'English: 20 marks', units: [
      ['Grammar I', null, 'sequence of tenses, concord, direct and indirect speech, transformation of sentences'],
      ['Grammar II', null, 'sentence patterns, conditionals, parts of speech, voice, infinitives, gerunds, participles, punctuation, prepositions, vocabulary, idioms'],
      ['Phonetics', null, 'vowel and consonant phonemes, syllables, word and sentence stress'],
      ['Comprehension', null, 'reading passages, general and technical English'],
    ] },
  },
};

/** The exams each +2 group prepares for: Physical group IOE only, Biology group CEE and IOE. */
export const GROUP_EXAMS = { PHY: ['IOE'], BIO: ['CEE', 'IOE'] };

/** Entrance exams that test a subject, limited to the class's group. */
export function examsFor(subject, group) {
  const forGroup = GROUP_EXAMS[group] || ['CEE', 'IOE'];
  return Object.keys(SYLLABUS[subject] || {}).filter((e) => forGroup.includes(e));
}

/** The syllabus text for one subject and the chosen exams, for the AI prompt. */
export function syllabusBlock(subject, exams = Object.keys(EXAMS)) {
  const bySubject = SYLLABUS[subject];
  if (!bySubject) return '';
  const parts = [];
  for (const exam of exams) {
    const s = bySubject[exam];
    if (!s) continue;
    const e = EXAMS[exam];
    const lines = [`${exam}: ${e.name}`, `Format: ${e.format}`, `Question style: ${e.style}`,
      `${subject[0].toUpperCase()}${subject.slice(1)} in this exam: ${s.marks || `${s.total} questions`}`];
    if (Array.isArray(s.units)) {
      for (const [unit, n, topics] of s.units) {
        lines.push(`- ${unit}${n ? ` (${n} questions)` : ''}${topics ? `: ${topics}` : ''}`);
      }
    } else {
      lines.push(`- ${s.units}`);
    }
    parts.push(lines.join('\n'));
  }
  return parts.length ? `ENTRANCE EXAM SYLLABUS\n${parts.join('\n\n')}` : '';
}
