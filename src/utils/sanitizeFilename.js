const sanitizeFilename = (filename) => {
  const raw = String(filename || '').trim();
  const normalized = raw.normalize('NFKD').replace(/[^\u0020-\u007E]/g, '');
  const cleaned = normalized
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'document.pdf';
};

export default sanitizeFilename;
