export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function buildQrFilename({
  shortCode,
  utmCampaign,
  utmSource,
  extension = 'png',
}) {
  const date = new Date().toISOString().slice(0, 10);

  const safeShort = slugify(shortCode);
  const safeCampaign = slugify(utmCampaign);
  const safeSource = slugify(utmSource);

  let base = '';

  if (safeShort) {
    base = safeShort;
  } else if (safeCampaign && safeSource) {
    base = `${safeCampaign}-${safeSource}`;
  } else if (safeCampaign) {
    base = safeCampaign;
  } else {
    base = 'qr-code';
  }

  return `qr-${base}-${date}.${extension}`;
}
