import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOpenHouseFeedback } from "../_shared/open-house-feedback.ts";

serve(handleOpenHouseFeedback);
