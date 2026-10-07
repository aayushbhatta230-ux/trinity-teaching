import { prettyMath, toLines } from '../lib/mathText.js';

/** AI text with proper maths notation; several lines show as bullet points. */
export default function RichText({ text, className = '', inline = false }) {
  if (inline) return <span className={className}>{prettyMath(text)}</span>;
  const lines = toLines(text);
  if (lines.length === 1 && !lines[0].bullet) return <p className={className}>{lines[0].text}</p>;
  return (
    <ul className={`rich-list ${className}`}>
      {lines.map((l, i) => <li key={i}>{l.text}</li>)}
    </ul>
  );
}
