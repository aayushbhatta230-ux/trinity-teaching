export const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** "Unit_3-Projectile Motion (final).pdf" → "Unit 3 Projectile Motion (final)" */
export const titleFromFileName = (name) =>
  name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s*-\s*/g, ' – ').replace(/\s+/g, ' ').trim();

/** "12 slides", "3 pages", or just "PowerPoint" when the slide count is unknown (old .ppt files). */
export function countLabel(kind, pages) {
  if (!pages) return kind === 'pptx' ? 'PowerPoint' : '';
  if (kind === 'txt') return `${pages} ${pages === 1 ? 'page' : 'pages'}`;
  return `${pages} ${pages === 1 ? 'slide' : 'slides'}`;
}
