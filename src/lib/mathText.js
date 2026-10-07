/**
 * Makes AI text read like a textbook on the board: keyboard-style maths ("1/2 MR^2",
 * "mu0 N^2 A / l", "sqrt(2gh)", "theta") becomes proper notation ("½MR²", "μ₀N²A/l",
 * "√(2gh)", "θ"), and multi-step solutions are split into bullet points.
 */

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺', n: 'ⁿ' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const sup = (s) => [...s].map((c) => SUP[c] ?? c).join('');
const sub = (s) => [...s].map((c) => SUB[c] ?? c).join('');

// Greek letters written as words (only as whole words, so "photon" or "alphabet" are untouched).
const GREEK = [
  ['epsilon0', 'ε₀'], ['epsilon_0', 'ε₀'], ['mu0', 'μ₀'], ['mu_0', 'μ₀'],
  ['alpha', 'α'], ['beta', 'β'], ['gamma', 'γ'], ['Delta', 'Δ'], ['delta', 'δ'], ['epsilon', 'ε'],
  ['theta', 'θ'], ['lambda', 'λ'], ['mu', 'μ'], ['pi', 'π'], ['rho', 'ρ'], ['sigma', 'σ'],
  ['tau', 'τ'], ['Phi', 'Φ'], ['phi', 'φ'], ['Omega', 'Ω'], ['omega', 'ω'],
];

const FRACTIONS = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾' };

/** Keyboard-style maths → readable notation. Plain prose is left as it is. */
export function prettyMath(text = '') {
  let s = String(text);
  // (No look-behind in these patterns: older board browsers cannot parse it.)
  s = s.replace(/(^|[^A-Za-z])d(Phi|phi|theta|omega|lambda)(?![A-Za-z])/g, '$1d$2'.replace('$2', '\u0000$2'))
    .replace(/\u0000(Phi|phi|theta|omega|lambda)/g, (_, w) => GREEK.find(([g]) => g === w)[1]);
  for (const [word, sym] of GREEK) {
    s = s.replace(new RegExp(`(^|[^A-Za-z])${word}(?![A-Za-z])`, 'g'), `$1${sym}`);
  }
  s = s
    .replace(/sqrt\s*\(/g, '√(')
    .replace(/(^|[^A-Za-z])sqrt(?![A-Za-z])/g, '$1√')
    .replace(/\^\(([-+]?[0-9n]+)\)/g, (_, e) => sup(e))      // x^(-1) → x⁻¹
    .replace(/\^\{([-+]?[0-9n]+)\}/g, (_, e) => sup(e))      // x^{2}  → x²
    .replace(/\^([-+]?[0-9]+|n(?![a-z]))/g, (_, e) => sup(e)) // x^2, 10^-7 → x², 10⁻⁷
    .replace(/_\{?([0-9]+)\}?/g, (_, d) => sub(d))           // v_0 → v₀
    .replace(/(^|[^\d.])(1\/2|1\/3|2\/3|1\/4|3\/4)(?![\d])/g, (_, pre, f) => pre + FRACTIONS[f])
    .replace(/(\d)\s*[x*]\s*10(?=[⁻⁰¹²³⁴⁵⁶⁷⁸⁹])/g, '$1 × 10') // 3 x 10⁸ → 3 × 10⁸
    .replace(/([\d⁰¹²³⁴⁵⁶⁷⁸⁹)½⅓⅔¼¾])\s+x\s+(?=[\d(√½])/g, '$1 × ')  // 1000² x 10 → 1000² × 10
    .replace(/\s\*\s/g, ' × ')
    .replace(/([\w)²³⁰¹⁴⁵⁶⁷⁸⁹Ͱ-Ͽ])\*(?=[\w(√Ͱ-Ͽ])/g, '$1×')
    // chemical formulas and numbered symbols: H2SO4 → H₂SO₄, NH3 → NH₃, R1 → R₁
    .replace(/([A-Z][a-z]?|\))(\d{1,2})(?=[A-Z(+\-\s)⁺⁻,.;:]|$)/g, (_, el, d) => el + sub(d))
    .replace(/([ΔΣ])\s+(?=[A-Za-z])/g, '$1')
    .replace(/<=>/g, '⇌')
    .replace(/->|=>/g, '→')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+\/-|\+-/g, '±')
    .replace(/(\d)\s*deg\b/g, '$1°')
    // "½ MR²" reads better as "½MR²"
    .replace(/([½⅓⅔¼¾])\s+(?=[A-Za-zα-ωΑ-Ω(√])/g, '$1');
  return s;
}

const BULLET = /^\s*(?:[-•*·]|\d+[.)])\s+/;

/**
 * Splits text into lines for display: [{ bullet: bool, text }].
 * Several lines (or a run of "a. b. c." steps) become bullet points.
 */
export function toLines(text = '') {
  const raw = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (raw.length > 1) {
    return raw.map((l) => ({ bullet: true, text: prettyMath(l.replace(BULLET, '')) }));
  }
  return [{ bullet: BULLET.test(raw[0] || ''), text: prettyMath((raw[0] || '').replace(BULLET, '')) }];
}
