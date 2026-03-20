const DEFAULT_QR_LOGO_STORAGE_PATH = 'builtin/shield.png';

const makeAbsoluteUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === 'undefined') return value;
  return new URL(value, window.location.origin).toString();
};

export function getDefaultQrLogoMetadata(defaultLogoUrl) {
  return {
    logo_url: makeAbsoluteUrl(defaultLogoUrl),
    logo_scale: 0.2,
    logo_storage_path: DEFAULT_QR_LOGO_STORAGE_PATH,
    logo_mime_type: 'image/png',
    logo_filename: 'shield.png',
  };
}

export async function resolveQrLogoMetadata({
  supabase,
  bucket,
  shortCode,
  logoFile,
  defaultLogoUrl,
  logoScale,
}) {
  if (!logoFile) {
    return {
      ...getDefaultQrLogoMetadata(defaultLogoUrl),
      logo_scale: logoScale,
      uploaded: false,
    };
  }

  const safeName = String(logoFile.name || 'logo')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const fileName = safeName || 'logo';
  const filePath = `${shortCode}/${Date.now()}-${fileName}`;
  const contentType = logoFile.type || 'application/octet-stream';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, logoFile, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    logo_url: publicData?.publicUrl || '',
    logo_scale: logoScale,
    logo_storage_path: filePath,
    logo_mime_type: contentType,
    logo_filename: logoFile.name || fileName,
    uploaded: true,
  };
}
