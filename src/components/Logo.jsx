/**
 * Official Trinity International College logo artwork (src/assets/brand/).
 * trinity-logo-original.png is the file supplied by the college; the other
 * files are transparent cuts of it: the knot mark, the wordmark, and the full logo.
 */
import markSrc from '../assets/brand/trinity-mark.png';
import wordmarkSrc from '../assets/brand/trinity-wordmark.png';
import fullSrc from '../assets/brand/trinity-logo.png';
import { INSTITUTION } from '../data/institution.js';

const NAME = 'Trinity International College';

/** The gold and crimson knot on its own. */
export function Mark({ className = '' }) {
  return <img className={`mark ${className}`} src={markSrc} alt="" draggable="false" />;
}

/** The "TRINITY / INTERNATIONAL / COLLEGE" lettering on its own. */
export function Wordmark({ className = '' }) {
  return <img className={`wordmark ${className}`} src={wordmarkSrc} alt="" draggable="false" />;
}

/**
 * size="sm": mark and wordmark side by side (headers).
 * size="lg": the full stacked logo exactly as supplied (home screen).
 */
export default function Logo({ size = 'sm', tagline = false }) {
  if (size === 'lg') {
    return (
      <div className="logo logo-lg">
        <img className="logo-full" src={fullSrc} alt={NAME} draggable="false" />
        {tagline && <div className="logo-tag">{INSTITUTION.tagline}</div>}
      </div>
    );
  }
  return (
    <div className="logo logo-sm" role="img" aria-label={NAME}>
      <Mark className="logo-mark" />
      <Wordmark className="logo-wordmark" />
    </div>
  );
}
