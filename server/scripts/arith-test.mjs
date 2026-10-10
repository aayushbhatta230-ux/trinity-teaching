// Tests the arithmetic checker on real quiz items from the live server (5 known-wrong, the rest right).
import assert from 'node:assert/strict';
import { checkWorking, evaluate } from '../src/arith.js';

assert.equal(evaluate('5 × (10 - 0) / 0.2'), 250);
assert.ok(Math.abs(evaluate('(4π × 10⁻⁷) × (1000)² × (10 × 10⁻⁴) / 0.5') - 2.513e-3) < 1e-6);
assert.ok(Math.abs(evaluate('½ × 0.4 × 20 × 0.5²') - 1) < 1e-9);
assert.ok(Math.abs(evaluate('(100 × 0.04 × 0.2 × 2π × 50) / √2') - 177.7) < 0.1);
assert.equal(evaluate('e'), null);

const cases = [
  // wrong keys found by hand
  { bad: true, name: 'Q4 solenoid', exp: 'L = μ₀ N² A / l\nL = (4π × 10⁻⁷) × (1000)² × (10 × 10⁻⁴) / 0.5\nL = 1.26 × 10⁻³ H', opts: ['2.51 × 10⁻³ H', '5.02 × 10⁻³ H', '3.14 × 10⁻³ H', '1.26 × 10⁻³ H'], ans: 'D' },
  { bad: true, name: 'Q18 emf', exp: 'e = L (ΔI / Δt)\ne = 5 × (10 - 0) / 0.2\ne = 50 V', opts: ['50 V', '500 V', '250 V', '100 V'], ans: 'A' },
  { bad: true, name: 'Q20 current', exp: 'I = e / R = (B v l) / R\nI = (0.5 × 2 × 0.4) / 2\nI = 0.1 A', opts: ['0.1 A', '0.8 A', '0.4 A', '0.2 A'], ans: 'A' },
  { bad: true, name: 'Q24 rms', exp: 'ε_rms = N A B ω / √2 = (100 × 0.04 × 0.2 × 2π × 50) / √2\nε_rms = 40π / √2 ≈ 25.13 V', opts: ['25.13 V', '50.26 V', '35.55 V', '17.77 V'], ans: 'A' },
  { bad: true, name: 'Q1 efficiency', exp: 'Ip = (11 × 2) / (220 × 0.8) = 22 / 176 = 0.125 A', opts: ['0.22 A', '0.14 A', '0.18 A', '0.11 A'], ans: 'B' },
  { bad: true, name: 'r5 Q23 units', exp: 'e = B l v\ne = 0.2 T × 0.5 m × 4 m/s\ne = 0.1 V', opts: ['4.0 V', '0.4 V', '0.1 V', '0.8 V'], ans: 'C' },
  { bad: true, name: 'r5 Q25 solve', exp: 'Peak emf: e0 = N B A ω\n220 = 500 × B × 0.02 × 100\nB = 0.44 T', opts: ['0.44 T', '2.20 T', '1.10 T', '0.22 T'], ans: 'A' },
  { bad: true, name: 'r5 Q3 wait', exp: "e0 = N B A ω\nFor e0' = e0, A' must be 0.4 A, wait, N'ω' = 4, so A' = A / 4", opts: ['0.25', '0.5', '2', '4'], ans: 'B' },
  // correct ones
  { bad: false, name: 'r5 Q19 solve', exp: 'Energy in inductor: U = ½ L I²\n0.8 = ½ × 0.4 × I²\nI = 2.0 A', opts: ['1.41 A', '1.0 A', '2.0 A', '4.0 A'], ans: 'C' },
  { bad: false, name: 'r5 Q20 solve', exp: 'Efficiency: η = (Vs Is / Vp Ip) × 100\n0.80 = (220 × 40) / (2200 × Ip)\nIp = 5.0 A', opts: ['4.0 A', '5.0 A', '6.25 A', '50.0 A'], ans: 'B' },
  { bad: false, name: 'r5 Q8 turns', exp: 'Transformer ratio: Vs / Vp = Ns / Np\n2200 / 220 = Ns / 200\nNs = 10 × 200 = 2000 turns', opts: ['2000', '440000', '22000', '20'], ans: 'A' },
  { bad: false, name: 'r5 Q4 rod', exp: 'Rotating rod emf: e = ½ B ω l²\ne = 0.5 × 0.5 × 50 × (0.4)²\ne = 2.0 V', opts: ['1.0 V', '2.0 V', '4.0 V', '5.0 V'], ans: 'B' },
  { bad: false, name: 'r5 Q24', exp: 'Faraday law magnitude: e = ΔΦ / Δt\ne = (10 - 2) / 0.2\ne = 40 V', opts: ['40 V', '60 V', '24 V', '16 V'], ans: 'A' },
  { bad: false, name: 'Q2', exp: 'V_s = (N_s / N_p) V_p = (50 / 500) × 220 = 22 V\nI_s = V_s / R = 22 / 22 = 1 A\nI_p = (N_s / N_p) I_s = (1 / 10) × 1 = 0.1 A', opts: ['1.0 A', '0.1 A', '2.0 A', '0.5 A'], ans: 'B' },
  { bad: false, name: 'Q6', exp: 'e0 = N B A ω\n100 = 200 × B × 0.05 × 50\n100 = 500 B\nB = 100 / 500 = 0.2 T', opts: ['1.0 T', '0.5 T', '0.2 T', '0.1 T'], ans: 'C' },
  { bad: false, name: 'Q8', exp: 'Angular speed ω = 2 × π × f = 2 × 3.14 × 50 = 314 rad/s\ne0 = N B A ω\ne0 = 100 × 0.5 × 0.02 × 314 = 314 V', opts: ['157 V', '314 V', '1000 V', '628 V'], ans: 'B' },
  { bad: false, name: 'Q17', exp: "Faraday's law: e = -N ΔΦ / Δt\nΔΦ = B × A = 0.2 × 0.1 = 0.02 Wb\ne = 50 × 0.02 / 0.1 = 10 V", opts: ['2 V', '5 V', '10 V', '1 V'], ans: 'C' },
  { bad: false, name: 'Q19', exp: 'Efficiency η = (Vs Is / Vp Ip) × 100\n0.90 = (110 × Is) / (220 × 5)\nIs = 0.90 × 1100 / 110 = 9 A', opts: ['10 A', '9 A', '8 A', '4.5 A'], ans: 'B' },
  { bad: false, name: 'Q21', exp: 'L = τ × R = 0.05 × 20 = 1 H; E = ½ L I²\nE = ½ × 1 × (2)²\nE = 2 J', opts: ['2 J', '1 J', '4 J', '0.5 J'], ans: 'A' },
  { bad: false, name: 'Q23', exp: 'e₂ = -M dI₁ / dt\ne₂ = 0.4 × (5 - 1) / 0.02\ne₂ = 0.4 × 4 / 0.02 = 80 V', opts: ['40 V', '10 V', '20 V', '80 V'], ans: 'D' },
  { bad: false, name: 'Q22', exp: 'e = dΦ / dt = 6t + 4\nAt t = 2 s, e = 6(2) + 4 = 16 V', opts: ['16 V', '10 V', '8 V', '25 V'], ans: 'A' },
  { bad: false, name: 'conceptual', exp: 'Laminations break up the path of eddy currents.\nThis reduces eddy current loss.', opts: ['hysteresis losses', 'eddy current losses', 'flux leakage', 'copper losses'], ans: 'B' },
];
let failed = 0;
for (const c of cases) {
  const r = checkWorking(c.exp, c.opts, c.ans);
  const pass = r.ok === !c.bad;
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${c.name.padEnd(14)} → ${r.ok ? 'accepted' : `rejected: ${r.reason}`}`);
}
process.exit(failed ? 1 : 0);
