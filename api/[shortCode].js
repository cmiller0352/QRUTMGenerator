// pages/api/[shortCode].js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { shortCode } = req.query;

  if (!shortCode) {
    return res.status(400).send('Missing short code');
  }

  const normalizedCode = shortCode.toLowerCase();

  const { data, error } = await supabase
    .from('qr_utm_generator_logs')
    .select('full_url')
    .eq('short_code', normalizedCode)
    .single();

  if (error || !data) {
    console.error('Short code lookup failed:', error);
    return res.status(404).send('Short link not found');
  }

  // Log redirect event
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await supabase.from('qr_redirect_logs').insert([
    {
      short_code: normalizedCode,
      ip_address: Array.isArray(ip) ? ip[0] : ip,
      user_agent: userAgent
    }
  ]);

  console.log('✅ Redirecting:', normalizedCode);
  console.log('📍 IP:', ip, '| 🧠 Agent:', userAgent);

  return res.redirect(302, data.full_url);
}
