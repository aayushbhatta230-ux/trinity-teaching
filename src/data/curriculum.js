/**
 * Mock teaching content, keyed by portion → class.
 * Each unit: t = title, p = key points, f = key formula / fact.
 * Used to generate realistic slides, notes and question papers.
 */
export const UNITS = {
  'math.analytical': {
    '11': [
      { t: 'Coordinates in a Plane', p: ['Cartesian coordinate system', 'Distance between two points', 'Section formula (internal & external)', 'Area of a triangle'], f: 'd = √[(x₂ − x₁)² + (y₂ − y₁)²]' },
      { t: 'Straight Lines', p: ['Slope of a line', 'Slope–intercept and point–slope forms', 'Angle between two lines', 'Perpendicular distance from a point'], f: 'y − y₁ = m(x − x₁)' },
      { t: 'Pair of Straight Lines', p: ['Homogeneous equation of second degree', 'Angle between the pair', 'Condition for perpendicularity', 'Bisectors of the angles'], f: 'tan θ = 2√(h² − ab) / (a + b)' },
    ],
    '12': [
      { t: 'Conic Sections', p: ['Circle, parabola, ellipse, hyperbola', 'Focus, directrix and eccentricity', 'Standard equations', 'Tangents and normals'], f: 'x²/a² + y²/b² = 1' },
      { t: 'Coordinates in Space', p: ['Direction cosines and ratios', 'Projection of a segment', 'Angle between two lines', 'Distance in 3D'], f: 'l² + m² + n² = 1' },
      { t: 'Planes', p: ['General equation of a plane', 'Intercept and normal forms', 'Angle between planes', 'Distance of a point from a plane'], f: 'ax + by + cz + d = 0' },
    ],
  },
  'math.calculus': {
    '11': [
      { t: 'Limits and Continuity', p: ['Concept of a limit', 'Left-hand and right-hand limits', 'Standard limits', 'Continuity at a point'], f: 'lim (sin x)/x = 1 as x → 0' },
      { t: 'Derivatives', p: ['Derivative from first principles', 'Rules of differentiation', 'Chain rule', 'Derivatives of trigonometric functions'], f: 'd/dx (xⁿ) = n·xⁿ⁻¹' },
      { t: 'Applications of Derivatives', p: ['Tangents and normals', 'Increasing and decreasing functions', 'Maxima and minima', 'Rate of change'], f: "f′(x) = 0 at a stationary point" },
    ],
    '12': [
      { t: 'Antiderivatives', p: ['Integration as reverse differentiation', 'Integration by substitution', 'Integration by parts', 'Partial fractions'], f: '∫ xⁿ dx = xⁿ⁺¹/(n + 1) + C' },
      { t: 'Definite Integrals', p: ['Fundamental theorem of calculus', 'Properties of definite integrals', 'Area under a curve', 'Area between two curves'], f: '∫ₐᵇ f(x) dx = F(b) − F(a)' },
      { t: 'Differential Equations', p: ['Order and degree', 'Variable separable form', 'Homogeneous equations', 'Linear first-order equations'], f: 'dy/dx + Py = Q' },
    ],
  },
  'phy.mechanics': {
    '11': [
      { t: 'Introduction to Mechanics', p: ['Physical quantities and units', 'Scalars and vectors', 'Motion in one dimension', 'Equations of uniformly accelerated motion'], f: 'v = u + at' },
      { t: "Newton's Laws of Motion", p: ['Inertia and the first law', 'Momentum and the second law', 'Action and reaction', 'Friction and its laws'], f: 'F = ma' },
      { t: 'Projectile Motion', p: ['Motion in two dimensions', 'Time of flight', 'Maximum height', 'Horizontal range'], f: 'R = u² sin 2θ / g' },
    ],
    '12': [
      { t: 'Rotational Dynamics', p: ['Angular displacement and velocity', 'Moment of inertia', 'Torque and angular acceleration', 'Conservation of angular momentum'], f: 'τ = Iα' },
      { t: 'Simple Harmonic Motion', p: ['Restoring force', 'Displacement, velocity and acceleration', 'Energy in SHM', 'Simple pendulum'], f: 'T = 2π √(l / g)' },
      { t: 'Fluid Dynamics', p: ['Equation of continuity', "Bernoulli's principle", 'Viscosity', "Stokes' law and terminal velocity"], f: 'P + ½ρv² + ρgh = constant' },
    ],
  },
  'phy.electricity': {
    '11': [
      { t: 'Electric Charges', p: ['Properties of charge', 'Conductors and insulators', 'Charging by induction', 'Quantisation of charge'], f: 'q = ne' },
      { t: 'Electric Field', p: ["Coulomb's law", 'Electric field intensity', 'Field lines', 'Electric flux'], f: 'F = kq₁q₂ / r²' },
      { t: 'Potential and Capacitance', p: ['Electric potential', 'Equipotential surfaces', 'Capacitors in series and parallel', 'Energy stored in a capacitor'], f: 'C = Q / V' },
    ],
    '12': [
      { t: 'DC Circuits', p: ["Ohm's law", "Kirchhoff's laws", 'Wheatstone bridge', 'Potentiometer'], f: 'V = IR' },
      { t: 'Magnetic Effect of Current', p: ['Biot–Savart law', "Ampère's circuital law", 'Force on a current-carrying conductor', 'Moving-coil galvanometer'], f: 'F = BIl sin θ' },
      { t: 'Electromagnetic Induction', p: ["Faraday's laws", "Lenz's law", 'Self and mutual induction', 'AC generator'], f: 'ε = −dΦ/dt' },
    ],
  },
  'phy.thermo': {
    '11': [
      { t: 'Heat and Temperature', p: ['Thermal equilibrium', 'Temperature scales', 'Thermometers', 'Zeroth law of thermodynamics'], f: '°F = 9/5 °C + 32' },
      { t: 'Thermal Expansion', p: ['Linear expansion', 'Superficial and cubical expansion', 'Anomalous expansion of water', 'Applications'], f: 'ΔL = αLΔT' },
      { t: 'Quantity of Heat', p: ['Specific heat capacity', 'Latent heat', 'Method of mixtures', "Newton's law of cooling"], f: 'Q = mcΔθ' },
    ],
    '12': [
      { t: 'Kinetic Theory of Gases', p: ['Assumptions of kinetic theory', 'Pressure exerted by a gas', 'RMS speed', 'Degrees of freedom'], f: 'P = ⅓ ρ c̄²' },
      { t: 'First Law of Thermodynamics', p: ['Internal energy', 'Work done by a gas', 'Isothermal and adiabatic processes', 'Molar heat capacities'], f: 'ΔQ = ΔU + ΔW' },
      { t: 'Second Law and Heat Engines', p: ['Reversible and irreversible processes', 'Carnot engine', 'Efficiency', 'Refrigerators'], f: 'η = 1 − T₂ / T₁' },
    ],
  },
  'chem.physical': {
    '11': [
      { t: 'Atomic Structure', p: ['Rutherford and Bohr models', 'Quantum numbers', 'Aufbau principle', "Hund's rule"], f: 'E = −13.6 / n² eV' },
      { t: 'States of Matter', p: ['Gas laws', 'Ideal gas equation', "Dalton's law of partial pressure", "Graham's law of diffusion"], f: 'PV = nRT' },
      { t: 'Chemical Equilibrium', p: ['Law of mass action', 'Equilibrium constant', "Le Chatelier's principle", 'Kp and Kc'], f: 'Kp = Kc (RT)^Δn' },
    ],
    '12': [
      { t: 'Chemical Kinetics', p: ['Rate of reaction', 'Order and molecularity', 'Half-life', 'Arrhenius equation'], f: 'k = A e^(−Ea/RT)' },
      { t: 'Electrochemistry', p: ['Electrolytic conductance', "Faraday's laws of electrolysis", 'Electrochemical cells', 'Nernst equation'], f: 'E = E° − (0.0591/n) log Q' },
      { t: 'Thermochemistry', p: ['Enthalpy of reaction', "Hess's law", 'Bond energy', 'Entropy and free energy'], f: 'ΔG = ΔH − TΔS' },
    ],
  },
  'chem.organic': {
    '11': [
      { t: 'Fundamentals of Organic Chemistry', p: ['Tetravalency of carbon', 'Functional groups', 'IUPAC nomenclature', 'Isomerism'], f: 'CₙH₂ₙ₊₂ (alkanes)' },
      { t: 'Hydrocarbons', p: ['Alkanes, alkenes, alkynes', 'Preparation methods', 'Markovnikov addition', 'Combustion'], f: 'C₂H₄ + H₂ → C₂H₆' },
      { t: 'Aromatic Compounds', p: ['Structure of benzene', 'Aromaticity (Hückel rule)', 'Electrophilic substitution', 'Uses of benzene'], f: '4n + 2 π electrons' },
    ],
    '12': [
      { t: 'Haloalkanes and Haloarenes', p: ['Classification', 'SN1 and SN2 reactions', 'Elimination reactions', 'Environmental effects'], f: 'R–X + OH⁻ → R–OH + X⁻' },
      { t: 'Alcohols, Phenols and Ethers', p: ['Preparation of alcohols', 'Acidity of phenol', "Lucas test", 'Williamson synthesis'], f: 'R–OH' },
      { t: 'Aldehydes and Ketones', p: ['Carbonyl group', 'Nucleophilic addition', 'Aldol condensation', "Tollens' and Fehling's tests"], f: 'R–CHO / R–CO–R′' },
    ],
  },
  'chem.inorganic': {
    '11': [
      { t: 'Periodic Classification', p: ['Modern periodic law', 's, p, d and f blocks', 'Atomic and ionic radii', 'Ionisation energy and electronegativity'], f: 'Z = atomic number' },
      { t: 'Chemical Bonding', p: ['Ionic and covalent bonds', 'VSEPR theory', 'Hybridisation', 'Hydrogen bonding'], f: 'sp³ → 109.5°' },
      { t: 'Oxidation and Reduction', p: ['Oxidation number', 'Balancing redox equations', 'Oxidising and reducing agents', 'Redox titrations'], f: 'OIL RIG' },
    ],
    '12': [
      { t: 'Transition Metals', p: ['Electronic configuration', 'Variable oxidation states', 'Coloured ions', 'Catalytic properties'], f: '(n−1)d¹⁻¹⁰ ns¹⁻²' },
      { t: 'Coordination Compounds', p: ["Werner's theory", 'Ligands and coordination number', 'Nomenclature', 'Isomerism in complexes'], f: '[Co(NH₃)₆]Cl₃' },
      { t: 'Metallurgy', p: ['Ores and minerals', 'Concentration of ores', 'Roasting and calcination', 'Refining'], f: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂' },
    ],
  },
  'bio.botany': {
    '11': [
      { t: 'Cell Biology', p: ['Cell theory', 'Prokaryotic and eukaryotic cells', 'Cell organelles', 'Cell division: mitosis and meiosis'], f: 'Cell = basic unit of life' },
      { t: 'Plant Kingdom', p: ['Algae and fungi', 'Bryophytes', 'Pteridophytes', 'Gymnosperms and angiosperms'], f: 'Five-kingdom classification' },
      { t: 'Plant Anatomy', p: ['Meristematic tissue', 'Permanent tissue', 'Anatomy of root, stem and leaf', 'Secondary growth'], f: 'Xylem ↑ water, phloem ↕ food' },
    ],
    '12': [
      { t: 'Plant Physiology', p: ['Water relations', 'Photosynthesis', 'Respiration', 'Plant hormones'], f: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' },
      { t: 'Genetics', p: ["Mendel's laws", 'Linkage and crossing over', 'Mutation', 'DNA structure and replication'], f: '3 : 1 monohybrid ratio' },
      { t: 'Ecology', p: ['Ecosystem structure', 'Energy flow', 'Ecological succession', 'Biodiversity of Nepal'], f: '10% law of energy transfer' },
    ],
  },
  'bio.zoology': {
    '11': [
      { t: 'Animal Diversity', p: ['Basis of classification', 'Non-chordates', 'Chordates', 'Characters of each phylum'], f: 'Kingdom Animalia' },
      { t: 'Animal Tissues', p: ['Epithelial tissue', 'Connective tissue', 'Muscular tissue', 'Nervous tissue'], f: 'Four basic tissue types' },
      { t: 'Earthworm and Frog', p: ['Morphology', 'Digestive system', 'Circulatory system', 'Life cycle'], f: 'Pheretima posthuma' },
    ],
    '12': [
      { t: 'Human Physiology', p: ['Digestion and absorption', 'Breathing and gas exchange', 'Circulation', 'Excretion'], f: 'Cardiac output = SV × HR' },
      { t: 'Developmental Biology', p: ['Gametogenesis', 'Fertilisation', 'Cleavage', 'Gastrulation'], f: 'Zygote → morula → blastula' },
      { t: 'Evolution', p: ['Origin of life', "Darwin's theory", 'Evidences of evolution', 'Human evolution'], f: 'Natural selection' },
    ],
  },
  'eng.general': {
    '11': [
      { t: 'Reading Comprehension', p: ['Skimming and scanning', 'Inference questions', 'Vocabulary in context', 'Summary writing'], f: 'Read → Question → Answer' },
      { t: 'Grammar: Tense and Aspect', p: ['Simple, continuous, perfect', 'Time expressions', 'Sequence of tenses', 'Common errors'], f: 'have + past participle' },
      { t: 'Short Stories', p: ['Plot and setting', 'Characterisation', 'Theme and message', 'Critical response'], f: 'Exposition → Climax → Resolution' },
    ],
    '12': [
      { t: 'Essay Writing', p: ['Argumentative essays', 'Structuring paragraphs', 'Cohesive devices', 'Conclusions'], f: 'Intro · Body · Conclusion' },
      { t: 'Grammar: Reported Speech', p: ['Statements', 'Questions', 'Commands and requests', 'Changes of time and place'], f: 'said that + backshift' },
      { t: 'Poetry Appreciation', p: ['Figures of speech', 'Tone and mood', 'Imagery', 'Writing an appreciation'], f: 'Simile · Metaphor · Personification' },
    ],
  },
  'nep.general': {
    '11': [
      { t: 'नेपाली व्याकरण: वर्ण र वर्णविन्यास', p: ['स्वर र व्यञ्जन वर्ण', 'ह्रस्व र दीर्घ', 'शिरबिन्दु र चन्द्रबिन्दु', 'शुद्ध लेखन'], f: 'वर्ण → शब्द → वाक्य' },
      { t: 'कथा: पाठ र विश्लेषण', p: ['कथावस्तु', 'पात्र र चरित्र', 'परिवेश', 'उद्देश्य'], f: 'आरम्भ · मध्य · अन्त्य' },
      { t: 'निबन्ध लेखन', p: ['विषय छनोट', 'भूमिका', 'मुख्य भाग', 'निष्कर्ष'], f: 'भूमिका · विषयवस्तु · उपसंहार' },
    ],
    '12': [
      { t: 'कविता: भाव र सौन्दर्य', p: ['कविताको भाव', 'लय र छन्द', 'अलङ्कार', 'प्रतीक र बिम्ब'], f: 'भाव + लय = कविता' },
      { t: 'नेपाली व्याकरण: काल र पक्ष', p: ['भूत, वर्तमान, भविष्यत्', 'पूर्ण र अपूर्ण पक्ष', 'वाच्य', 'वाक्य परिवर्तन'], f: 'काल · पक्ष · भाव' },
      { t: 'पत्र लेखन', p: ['औपचारिक पत्र', 'अनौपचारिक पत्र', 'निवेदन', 'सम्पादकलाई चिठी'], f: 'मिति · सम्बोधन · विषय' },
    ],
  },
  'comp.general': {
    '11': [
      { t: 'Computer Systems', p: ['Hardware and software', 'Number systems', 'Boolean logic', 'Logic gates'], f: '(1011)₂ = (11)₁₀' },
      { t: 'Programming in C', p: ['Variables and data types', 'Operators and expressions', 'Conditionals and loops', 'Functions'], f: 'printf("Hello, Trinity");' },
      { t: 'Web Technology', p: ['How the web works', 'HTML structure', 'CSS styling', 'Basic JavaScript'], f: '<html> … </html>' },
    ],
    '12': [
      { t: 'Database Management', p: ['DBMS concepts', 'ER diagrams', 'Normalisation', 'SQL queries'], f: 'SELECT * FROM students;' },
      { t: 'Object-Oriented Programming', p: ['Classes and objects', 'Encapsulation', 'Inheritance', 'Polymorphism'], f: 'class Student { … }' },
      { t: 'Networking', p: ['Network topologies', 'OSI and TCP/IP models', 'IP addressing', 'Network security'], f: '192.168.1.0 / 24' },
    ],
  },
};
