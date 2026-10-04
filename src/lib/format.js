export const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** "Unit_3-Projectile Motion (final).pdf" → "Unit 3 Projectile Motion (final)" */
export const titleFromFileName = (name) =>
  name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s*-\s*/g, ' – ').replace(/\s+/g, ' ').trim();
