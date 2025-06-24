import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { shortCode } = req.query;

  if (!shortCode) {
    return res.status(400).send('Short code is missing');
  }

  const { data, error } = await supabase
    .from('qr_redirects')
    .select('*')
    .eq('short_code', shortCode)
    .single();

  if (error || !data) {
    return res.status(404).send('Short link not found');
  }

  await supabase
    .from('qr_redirects')
    .update({
      scan_count: (data.scan_count || 0) + 1,
      last_scanned: new Date().toISOString()
    })
    .eq('id', data.id);

  return res.redirect(302, data.full_url);
}
