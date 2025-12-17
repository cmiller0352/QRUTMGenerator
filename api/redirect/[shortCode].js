// /api/redirect/[shortcode].js
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

// Normalize a path fragment into our shortcode format
function normalizeShortcode(input) {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')    // keep [a-z0-9-]
    .replace(/-+/g, '-')            // collapse dashes
    .replace(/^-|-$/g, '');         // trim leading/trailing dash
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const rawSegment = url.pathname.split('/').filter(Boolean).pop() || '';
    const shortNorm = normalizeShortcode(rawSegment);

    if (!shortNorm) {
      return new Response('Missing short code', { status: 400 });
    }

    // Use service role for server-side redirect + signed PDF URLs
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // -------------------------
    // 0) Shared request metadata (logging)
    // -------------------------
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || null;

    let clientIp = req.headers.get('x-forwarded-for') || '';
    clientIp = clientIp.split(',')[0].trim();
    if (!clientIp || clientIp === '::1' || clientIp.startsWith('127.') || clientIp.startsWith('::ffff:127.')) {
      clientIp = '8.8.8.8';
    }

    let city = null, region = null, country = null, postal = null;
    let latitude = null, longitude = null;

    try {
      const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
      const geoData = await geoRes.json();
      if (!geoData.error) {
        city = geoData.city || null;
        region = geoData.region || null;
        country = geoData.country || null;
        postal = geoData.postal || null;
        latitude = geoData.latitude ? parseFloat(geoData.latitude) : null;
        longitude = geoData.longitude ? parseFloat(geoData.longitude) : null;
      }
    } catch {}

    let inferred_source = null;
    let inferred_medium = null;

    if (referer) {
      if (referer.includes('facebook.com')) {
        inferred_source = 'facebook'; inferred_medium = 'social';
      } else if (referer.includes('instagram.com')) {
        inferred_source = 'instagram'; inferred_medium = 'social';
      } else if (referer.includes('linkedin.com')) {
        inferred_source = 'linkedin'; inferred_medium = 'social';
      } else if (referer.includes('t.co') || referer.includes('twitter.com') || referer.includes('x.com')) {
        inferred_source = 'twitter'; inferred_medium = 'social';
      } else if (referer.includes('mail.google.com')) {
        inferred_source = 'email'; inferred_medium = 'gmail';
      } else if (referer.includes('outlook.live.com') || referer.includes('outlook.office.com')) {
        inferred_source = 'email'; inferred_medium = 'outlook';
      } else {
        inferred_source = 'unknown'; inferred_medium = 'web';
      }
    }

    // -------------------------
    // 1) NEW primary lookup: qr_redirects (supports PDF targets)
    // -------------------------
    let resolvedShortCode = shortNorm;
    let fullUrl = null;

    const { data: qrRow, error: qrErr } = await supabase
      .from('qr_redirects')
      .select('short_code, full_url, target_type, pdf_bucket, pdf_path, pdf_filename, pdf_cache_bust')
      .eq('short_code', shortNorm)
      .maybeSingle();

    if (!qrErr && qrRow) {
      resolvedShortCode = qrRow.short_code || shortNorm;

      if ((qrRow.target_type || 'url') === 'pdf') {
        const bucket = qrRow.pdf_bucket;
        const path = qrRow.pdf_path;

        if (!bucket || !path) {
          return new Response('PDF target misconfigured', { status: 500 });
        }

        const { data: signed, error: signErr } = await supabase
          .storage
          .from(bucket)
          .createSignedUrl(path, 60 * 10); // 10 minutes

        if (signErr || !signed?.signedUrl) {
          return new Response(`Failed to sign PDF: ${signErr?.message || 'unknown'}`, { status: 500 });
        }

        const v = typeof qrRow.pdf_cache_bust === 'number' ? qrRow.pdf_cache_bust : 0;
        const signedUrl = new URL(signed.signedUrl);
        signedUrl.searchParams.set('v', String(v));

        fullUrl = signedUrl.toString();
      } else {
        fullUrl = (qrRow.full_url || '').trim();
      }
    }

    // -------------------------
    // 2) Existing fallback lookup: qr_utm_generator_logs
    // -------------------------
    if (!fullUrl) {
      let record = null;
      const { data, error } = await supabase
        .from('qr_utm_generator_logs')
        .select('full_url, short_code')
        .eq('short_code', shortNorm)
        .maybeSingle();

      if (!error && data) {
        record = data;
      }

      if (!record) {
        const attempts = [
          { column: 'utm_campaign', value: rawSegment },
          { column: 'utm_campaign', value: shortNorm },
          { column: 'utm_campaign', value: rawSegment, op: 'ilike' },
        ];

        for (const attempt of attempts) {
          let q = supabase
            .from('qr_utm_generator_logs')
            .select('full_url, short_code, created_at')
            .order('created_at', { ascending: false })
            .limit(1);

          if (attempt.op === 'ilike') {
            q = q.ilike(attempt.column, attempt.value);
          } else {
            q = q.eq(attempt.column, attempt.value);
          }

          const { data: fallbackData, error: fallbackError } = await q.maybeSingle();
          if (!fallbackError && fallbackData) {
            record = fallbackData;
            break;
          }
        }
      }

      if (!record || !record.full_url) {
        return new Response('Short link not found', { status: 404 });
      }

      fullUrl = record.full_url;
      resolvedShortCode = record.short_code || shortNorm;
    }

    // -------------------------
    // 3) Log scan (same table as before)
    // -------------------------
    let utm_source = null, utm_medium = null, utm_campaign = null, utm_term = null, utm_content = null;
    try {
      const parsedUrl = new URL(fullUrl);
      utm_source = parsedUrl.searchParams.get('utm_source') || null;
      utm_medium = parsedUrl.searchParams.get('utm_medium') || null;
      utm_campaign = parsedUrl.searchParams.get('utm_campaign') || null;
      utm_term = parsedUrl.searchParams.get('utm_term') || null;
      utm_content = parsedUrl.searchParams.get('utm_content') || null;
    } catch {}

    const payload = {
      short_code: resolvedShortCode,
      ip_address: clientIp,
      user_agent: userAgent,
      referer,
      inferred_source,
      inferred_medium,
      city,
      region,
      country,
      postal_code: postal,
      latitude,
      longitude,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    };

    try {
      await supabase.from('qr_redirect_logs').insert([payload]);
    } catch (err) {
      console.error('Failed to insert redirect log:', err);
    }

    try {
      await supabase.rpc('increment_scan_count', { shortcode_input: resolvedShortCode });
    } catch (err) {
      console.error('Failed to increment scan count:', err);
    }

    return Response.redirect(fullUrl, 302);

  } catch (err) {
    console.error('🔥 Edge Function crash:', err);
    return new Response('Server error', { status: 500 });
  }
}
