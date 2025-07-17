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

  const fullUrl = data.full_url;

  // ✅ Extract UTM from the stored full_url
  const parsedUrl = new URL(fullUrl);
  const utm_source = parsedUrl.searchParams.get('utm_source') || null;
  const utm_medium = parsedUrl.searchParams.get('utm_medium') || null;
  const utm_campaign = parsedUrl.searchParams.get('utm_campaign') || null;
  const utm_term = parsedUrl.searchParams.get('utm_term') || null;
  const utm_content = parsedUrl.searchParams.get('utm_content') || null;

  // Headers
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || null;

  // ✅ Extract IP from x-forwarded-for with fallback
  let clientIp = req.headers.get('x-forwarded-for') || '';
  clientIp = clientIp.split(',')[0].trim();
  if (!clientIp || clientIp === '::1' || clientIp.startsWith('127.') || clientIp.startsWith('::ffff:127.')) {
    clientIp = '8.8.8.8'; // fallback for dev/local/masked IPs
  }

  console.log('Using clientIp:', clientIp);

  // 🌍 Geo-IP Lookup
  let city = null, region = null, country = null, postal = null;
  let latitude = null, longitude = null;

  try {
    const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
    const geoData = await geoRes.json();
    console.log('[geoData]', geoData);

    if (!geoData.error) {
      city = geoData.city || null;
      region = geoData.region || null;
      country = geoData.country || null;
      postal = geoData.postal || null;
      latitude = geoData.latitude ? parseFloat(geoData.latitude) : null;
      longitude = geoData.longitude ? parseFloat(geoData.longitude) : null;
    }
  } catch (err) {
    console.error('Geo IP lookup failed:', err);
  }

  // 🧠 Infer from Referer
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

  const payload = {
    short_code: shortCode,
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
    utm_content
  };

  console.log('[Insert Payload]', payload);

  const { error: insertError } = await supabase
    .from('qr_redirect_logs')
    .insert([payload]);

  if (insertError) {
    console.error('Insert failed:', insertError);
  }

  await supabase.rpc('increment_scan_count', {
    shortcode_input: shortCode
  });

  return Response.redirect(fullUrl, 302);
}
