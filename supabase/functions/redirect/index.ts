// supabase/functions/redirect/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const shortCode = new URL(req.url).pathname.slice(1); // remove the leading /

  if (!shortCode) {
    return new Response("Short code missing", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data, error } = await supabase
    .from("qr_redirects")
    .select("*")
    .eq("short_code", shortCode)
    .single();

  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  await supabase
    .from("qr_redirects")
    .update({
      scan_count: (data.scan_count || 0) + 1,
      last_scanned: new Date().toISOString(),
    })
    .eq("id", data.id);

  return Response.redirect(data.full_url, 302);
});
