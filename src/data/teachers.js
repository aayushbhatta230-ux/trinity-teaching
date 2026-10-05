/**
 * Teachers and the rules that assign them to classes.
 *
 * Teacher names are placeholders until the academic office supplies the
 * real teaching schedule — replace `name` below, nothing else needs to change.
 *
 * HOW ASSIGNMENT WORKS
 * Each rule names a `portion` and a `teacher`. An optional `where` narrows it
 * to specific classes / shifts / groups / sections. For a given selection,
 * every matching rule is collected and the MOST SPECIFIC one wins
 * (the one with the most `where` conditions). Ties go to the rule listed first.
 *
 * Example — split one portion between two teachers by section:
 *   { portion: 'phy.mechanics', teacher: 'T-PM',  where: { sections: ['A', 'B', 'C', 'D'] } },
 *   { portion: 'phy.mechanics', teacher: 'T-PM2', where: { sections: ['E', 'F', 'G', 'H'] } },
 */

export const TEACHERS = {
  'T-MAL': { name: 'Mathematics Teacher 1', subject: 'mathematics' },
  'T-MA1': { name: 'Mathematics Teacher 2', subject: 'mathematics' },
  'T-MC':  { name: 'Mathematics Teacher 3', subject: 'mathematics' },
  'T-PM':  { name: 'Physics Teacher 1', subject: 'physics' },
  'T-PE':  { name: 'Physics Teacher 2', subject: 'physics' },
  'T-PT':  { name: 'Physics Teacher 3', subject: 'physics' },
  'T-CP':  { name: 'Chemistry Teacher 1', subject: 'chemistry' },
  'T-CO':  { name: 'Chemistry Teacher 2', subject: 'chemistry' },
  'T-CI':  { name: 'Chemistry Teacher 3', subject: 'chemistry' },
  'T-BB':  { name: 'Biology Teacher 1', subject: 'biology' },
  'T-BZ':  { name: 'Biology Teacher 2', subject: 'biology' },
  'T-EN':  { name: 'English Teacher 1', subject: 'english' },
  'T-NE':  { name: 'Nepali Teacher 1', subject: 'nepali' },
  'T-CS':  { name: 'Computer Teacher 1', subject: 'computer' },
};

export const ASSIGNMENTS = [
  // Mathematics
  { portion: 'math.algebra', teacher: 'T-MAL' },
  { portion: 'math.analytical', teacher: 'T-MA1' },
  { portion: 'math.calculus', teacher: 'T-MC' },

  // Physics
  { portion: 'phy.mechanics', teacher: 'T-PM' },
  { portion: 'phy.electricity', teacher: 'T-PE' },
  { portion: 'phy.thermo', teacher: 'T-PT' },

  // Chemistry
  { portion: 'chem.physical', teacher: 'T-CP' },
  { portion: 'chem.organic', teacher: 'T-CO' },
  { portion: 'chem.inorganic', teacher: 'T-CI' },

  // Biology
  { portion: 'bio.botany', teacher: 'T-BB' },
  { portion: 'bio.zoology', teacher: 'T-BZ' },

  // Single-teacher subjects
  { portion: 'eng.general', teacher: 'T-EN' },
  { portion: 'nep.general', teacher: 'T-NE' },
  { portion: 'comp.general', teacher: 'T-CS' },
];
