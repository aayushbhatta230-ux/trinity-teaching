/** Brand decorations taken from the college's cover artwork: sweeping gold and crimson arcs. */

export function Arcs({ className = '' }) {
  return (
    <svg className={`arcs ${className}`} viewBox="0 0 1600 600" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
      <path d="M-80 520 C 260 120, 900 -40, 1700 60" fill="none" stroke="var(--gold)" strokeWidth="34" opacity="0.9" />
      <path d="M-80 600 C 320 210, 960 40, 1700 150" fill="none" stroke="var(--brand)" strokeWidth="26" opacity="0.85" />
      <path d="M-80 470 C 220 90, 860 -90, 1700 -10" fill="none" stroke="var(--cream)" strokeWidth="60" opacity="0.7" />
    </svg>
  );
}

/** Thin gold + crimson ribbon used along the bottom of screens. */
export function Ribbon({ className = '' }) {
  return (
    <svg className={`ribbon ${className}`} viewBox="0 0 1920 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 90 C 600 20, 1200 120, 1920 40 L1920 120 L0 120 Z" fill="var(--gold)" />
      <path d="M0 104 C 620 50, 1220 130, 1920 64 L1920 120 L0 120 Z" fill="var(--brand)" />
    </svg>
  );
}
