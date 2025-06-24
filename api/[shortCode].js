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

  const { data, error } = await supabase
    .from('qr_utm_generator_logs') // ← corrected table
    .select('full_url')
    .eq('short_code', shortCode)
    .single();

  if (error || !data) {
    console.error('Short code lookup failed:', error);
    return res.status(404).send('Short link not found');
  }

  return res.redirect(302, data.full_url);
}
