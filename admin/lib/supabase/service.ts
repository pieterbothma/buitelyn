import { createClient } from "@supabase/supabase-js";

/* Service-role client for cron/webhook routes — bypasses RLS. Server only. */
export function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
