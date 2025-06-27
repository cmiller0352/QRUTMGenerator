// /api/redirect/[shortcode].js
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge', // 👈 necessary
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

  // Log redirect
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  await supabase.from('qr_redirect_logs').insert([
    {
      short_code: shortCode,
      ip_address: ip,
      user_agent: userAgent
    }
  ]);

  return Response.redirect(data.full_url, 302);
}
