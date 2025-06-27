// /api/redirect/[shortcode].js
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const shortCode = url.pathname.split('/').pop();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  if (!shortCode) {
    return new Response('Missing short code', { status: 400 });
  }

  const { data, error } = await supabase
    .from('qr_utm_generator_logs')
    .select('full_url')
    .eq('short_code', shortCode.toLowerCase())
    .single();

  if (error || !data) {
    return new Response('Short link not found', { status: 404 });
  }

  // Headers
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const referer = req.headers.get('referer') || null;
  const clientIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0];

  // Geo-IP Lookup
  let city = null, region = null, country = null, postal = null;
  if (clientIp && !clientIp.startsWith('127.') && clientIp !== '::1') {
    try {
      const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
      const geoData = await geoRes.json();
      if (!geoData.error) {
        city = geoData.city || null;
        region = geoData.region || null;
        country = geoData.country || null;
        postal = geoData.postal || null;
      }
    } catch (err) {
      console.error('Geo API failed:', err);
    }
  }

  // Infer UTM Source/Medium
  let inferred_source = null;
  let inferred_medium = null;

  if (referer) {
    if (referer.includes('facebook.com')) {
      inferred_source = 'facebook';
      inferred_medium = 'social';
    } else if (referer.includes('instagram.com')) {
      inferred_source = 'instagram';
      inferred_medium = 'social';
    } else if (referer.includes('linkedin.com')) {
      inferred_source = 'linkedin';
      inferred_medium = 'social';
    } else if (referer.includes('t.co') || referer.includes('twitter.com')) {
      inferred_source = 'twitter';
      inferred_medium = 'social';
    } else if (referer.includes('mail.google.com')) {
      inferred_source = 'email';
      inferred_medium = 'gmail';
    } else if (referer.includes('outlook.live.com')) {
      inferred_source = 'email';
      inferred_medium = 'outlook';
    } else {
      inferred_source = 'unknown';
      inferred_medium = 'web';
    }
  }

  // Log scan
  await supabase.from('qr_redirect_logs').insert([
    {
      short_code: shortCode,
      ip_address: clientIp,
      user_agent: userAgent,
      referer,
      inferred_source,
      inferred_medium,
      city,
      region,
      country,
      postal_code: postal
    }
  ]);

  // Increment scan count
  await supabase.rpc('increment_scan_count', {
    shortcode_input: shortCode
  });

  return Response.redirect(data.full_url, 302);
}
