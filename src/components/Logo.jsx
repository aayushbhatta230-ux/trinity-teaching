import { INSTITUTION } from '../data/institution.js';

/**
 * Trinity International College mark: a gold trinity knot (teardrop loop with
 * sweeping feet) crossed by a crimson arch. Drawn as SVG so it stays sharp at any size.
 */
export function Mark({ size = 64, mono = false, className = '' }) {
  const gold = mono ? 'currentColor' : 'var(--gold, #FEAD17)';
  const red = mono ? 'currentColor' : 'var(--brand, #B3161C)';
  return (
    <svg className={`mark ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* gold knot: left foot → up the right side → tip → down the left side → right foot */}
        <path
          d="M5 88 C 30 87, 65 80, 66 58 C 67 40, 56 20, 50 5 C 44 20, 33 40, 34 58 C 35 80, 70 87, 95 88"
          stroke={gold}
          strokeWidth="6.5"
        />
        {/* crimson arch */}
        <path d="M11 92 C 20 44, 80 44, 89 92" stroke={red} strokeWidth="7.5" />
      </g>
    </svg>
  );
}

export default function Logo({ size = 'md', tagline = false, stacked = false }) {
  return (
    <div className={`logo logo-${size} ${stacked ? 'logo-stacked' : ''}`}>
      <Mark className="logo-mark" />
      <div className="logo-text">
        <div className="logo-name">{INSTITUTION.name.toUpperCase()}</div>
        <div className="logo-sub">{INSTITUTION.subtitle.toUpperCase()}</div>
        {tagline && <div className="logo-tag">{INSTITUTION.tagline}</div>}
      </div>
    </div>
  );
}
