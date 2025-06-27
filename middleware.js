import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Init Supabase for edge
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Bypass for routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/' ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/analytics')
  ) {
    return NextResponse.next();
  }

  const shortCode = pathname.slice(1).toLowerCase(); // remove leading slash

  const { data, error } = await supabase
    .from('qr_utm_generator_logs')
    .select('full_url')
    .eq('short_code', shortCode)
    .single();

  if (error || !data?.full_url) {
    console.warn('❌ No match for short code:', shortCode);
    return NextResponse.next(); // Let React 404 or fallback handle it
  }

  const redirectUrl = data.full_url;

  // Optional: Log from Edge
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const agent = req.headers.get('user-agent') || 'unknown';

  await supabase.from('qr_redirect_logs').insert([
    {
      short_code: shortCode,
      ip_address: ip,
      user_agent: agent,
    },
  ]);

  console.log(`🚀 Edge redirect for /${shortCode} → ${redirectUrl}`);
  return NextResponse.redirect(redirectUrl, 302);
}
