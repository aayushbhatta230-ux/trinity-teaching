// Exact arithmetic check for AI-written worked solutions.
//
// The free AI models sometimes slip on arithmetic ("5 × 10 / 0.2 = 50"). This recomputes every
// "expression = value" step in a solution and checks that the keyed option matches the final
// result, so a question with a slip can be dropped before it reaches the board.

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
const FRACTIONS = { '½': '(1/2)', '⅓': '(1/3)', '⅔': '(2/3)', '¼': '(1/4)', '¾': '(3/4)', '⅕': '(1/5)', '⅖': '(2/5)' };

/** Plain-text maths → a form the evaluator understands (or null-ish garbage it will reject). */
export function normalise(s) {
  let t = String(s);
  t = t.replace(/[½⅓⅔¼¾⅕⅖]/g, (c) => FRACTIONS[c]);
  t = t.replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^(${[...m].map((c) => SUP[c]).join('')})`);
  t = t.replace(/[×·∙]/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
  t = t.replace(/(\d)\s*x\s*(?=[\d(])/g, '$1*');            // "3 x 10"
  t = t.replace(/(\d|\))\s*(?=pi|sqrt|\()/g, '$1*');         // 2π, 2(…), )(
  t = t.replace(/pi\s*(?=[\d(])/g, 'pi*');
  return t;
}

/** Evaluates + − × ÷ ^, parentheses, pi and sqrt. Returns a number, or null if it is not pure arithmetic. */
export function evaluate(src) {
  const s = normalise(src).replace(/\s+/g, '');
  if (!s || /[^0-9.+\-*/^()pisqrte]/.test(s.replace(/sqrt|pi/g, ''))) return null;
  if (!/[\d]/.test(s)) return null;
  let i = 0;
  const peek = () => s[i];
  const num = () => {
    const m = s.slice(i).match(/^\d+(\.\d+)?(e[+-]?\d+)?|^\.\d+/);
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  function factor() {
    if (peek() === '-') { i++; const v = factor(); return v == null ? null : -v; }
    if (peek() === '+') { i++; return factor(); }
    let v;
    if (s.startsWith('sqrt', i)) { i += 4; const a = factor(); v = a == null || a < 0 ? null : Math.sqrt(a); }
    else if (s.startsWith('pi', i)) { i += 2; v = Math.PI; }
    else if (peek() === '(') { i++; v = expr(); if (peek() !== ')') return null; i++; }
    else v = num();
    if (v == null) return null;
    if (peek() === '^') { i++; const e = factor(); if (e == null) return null; v = v ** e; }
    return v;
  }
  function term() {
    let v = factor();
    while (v != null && (peek() === '*' || peek() === '/')) {
      const op = s[i++];
      const r = factor();
      if (r == null) return null;
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function expr() {
    let v = term();
    while (v != null && (peek() === '+' || peek() === '-')) {
      const op = s[i++];
      const r = term();
      if (r == null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  const v = expr();
  return v != null && i === s.length && Number.isFinite(v) ? v : null;
}

const UNIT = /\s[a-zA-ZΩμ°%][a-zA-Z0-9Ωμ°/²³⁻·\s]*$/; // trailing units: "V", "rad/s", "m s⁻¹", "J"
const LABEL = /^\s*[a-zA-ZΩμεωΦτηλθρσα-ω_ₛₚ₀-₉'’()]+\s*$/;   // a variable name on its own: "e", "I_p", "ε₀"

// Units written right after a number inside working: "0.2 T × 0.5 m × 4 m/s".
const INLINE_UNIT = /(\d|[²³])\s*(?:m\/s²?|rad\/s|m²|cm²|mm²|m|cm|T|s|ms|V|kV|A|mA|Ω|ohms?|H|mH|Wb|J|Hz|N|kg|W|turns)(?![A-Za-z0-9²³⁻])/g;

/** The number a side of an equation stands for, if it is pure arithmetic (units allowed at the end). */
function valueOf(side) {
  const t = String(side).replace(/approximately|approx\.?|about/gi, '').replace(INLINE_UNIT, '$1').trim();
  if (!t || LABEL.test(t)) return null;
  const bare = t.replace(UNIT, '');
  // "½ L I²" is a formula, not "½" in units of "L I²": units only follow a finished number.
  if (bare !== t && !/[\d)⁰¹²³⁴⁵⁶⁷⁸⁹]\s*$/.test(bare)) return null;
  return evaluate(bare) ?? evaluate(t);
}

const IDENT = /[A-Za-zΑ-Ωα-ωμ][A-Za-z0-9_₀-₉'’]*/g;
const key = (name) => name.replace(/[_’']/g, '').toLowerCase();

/** "500 × B × 0.02 × 100" → { name: 'B', at: v => 500·v·0.02·100 }, if B is its only unknown. */
function oneUnknown(side) {
  const t = String(side).replace(INLINE_UNIT, '$1');
  const names = [...new Set((t.match(IDENT) || []).filter((n) => !/^(pi|sqrt)$/.test(n)))];
  if (names.length !== 1 || !/\d/.test(t)) return null;
  const name = names[0];
  const at = (v) => evaluate(t.replace(new RegExp(`(?<![A-Za-z0-9_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_₀-₉'’])`, 'g'), `(${v})`));
  return at(1) == null ? null : { name: key(name), at };
}

const hasOperator =(side) => /[*/+^]|(\d)\s*-\s*\d|sqrt|\(/.test(normalise(String(side)).replace(/^\s*-/, ''));
const close = (a, b) => Math.abs(a - b) <= Math.max(1e-9, 0.03 * Math.max(Math.abs(a), Math.abs(b)));

/**
 * Checks a worked solution. Returns { ok: true } or { ok: false, reason }.
 *  - every "arithmetic = value" step must be right (within 3 %, for rounding);
 *  - if the keyed option is a number, it must match the solution's final result.
 */
export function checkWorking(explanation, options, answer) {
  const lines = String(explanation || '').split(/\n|;/).map((l) => l.trim()).filter(Boolean);
  let last = null;
  let pending = null; // { label, value, text }: a variable just computed, which the next line may restate
  const equations = []; // equations in one unknown, checked when the unknown's value is stated
  if (/\bwait\b|let'?s (re)?check|let me|i made|recalculat|correction:/i.test(explanation)) {
    return { ok: false, reason: 'the solution corrects itself mid-way' };
  }
  for (const line of lines) {
    const sides = line.split(/=|≈/);
    const values = sides.map(valueOf);
    for (let k = 0; k < sides.length - 1; k++) {
      const a = values[k];
      const b = values[k + 1];
      if (a != null && b != null && hasOperator(sides[k]) && !close(a, b)) {
        return { ok: false, reason: `arithmetic: ${sides[k].trim()} is ${+a.toPrecision(4)}, not ${sides[k + 1].trim()}` };
      }
    }
    // "e = 5 × 10 / 0.2" on one line, then "e = 50 V" on the next.
    const label = sides.length > 1 && LABEL.test(sides[0]) ? sides[0].trim() : null;
    const first = values.slice(1).find((v) => v != null);
    if (label && pending && pending.label === label && first != null && !close(first, pending.value)) {
      return { ok: false, reason: `arithmetic: ${pending.text} is ${+pending.value.toPrecision(4)}, not ${+first.toPrecision(4)}` };
    }
    // "220 = 500 × B × 0.02 × 100", later "B = 0.44 T": put 0.44 back in and check it balances.
    if (label && first != null) {
      for (const eq of equations.filter((e) => e.name === key(label))) {
        const got = eq.at(first);
        if (got != null && !close(got, eq.value)) {
          return { ok: false, reason: `${label} = ${+first.toPrecision(4)} does not satisfy ${eq.text}` };
        }
      }
    }
    for (let a = 0; a < sides.length; a++) {
      for (let b = 0; b < sides.length; b++) {
        if (a === b || values[a] == null || values[b] != null) continue;
        const u = oneUnknown(sides[b]);
        if (u && !(label && a > 0 && b === 0)) equations.push({ ...u, value: values[a], text: line });
      }
    }
    const k = values.map((v, j) => (v != null && j > 0 && hasOperator(sides[j]) ? j : -1)).filter((j) => j >= 0).pop();
    if (label && k != null) pending = { label, value: values[k], text: sides[k].trim() };
    else if (label && first != null) pending = null;
    for (const v of values) if (v != null) last = v;
  }
  const keyed = options?.['ABCD'.indexOf(answer)];
  const keyedValue = keyed != null ? valueOf(String(keyed)) : null;
  if (keyedValue != null && last != null && !close(keyedValue, last)) {
    const other = options.findIndex((o, i) => i !== 'ABCD'.indexOf(answer) && valueOf(String(o)) != null && close(valueOf(String(o)), last));
    return { ok: false, reason: `keyed ${keyed} but the working gives ${+last.toPrecision(4)}${other >= 0 ? ` (option ${'ABCD'[other]})` : ' (no option)'}` };
  }
  return { ok: true };
}
