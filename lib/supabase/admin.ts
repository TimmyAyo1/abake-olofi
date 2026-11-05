import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Server only. Bypasses row-level security, so it is used
 * only by the client tracking page, which looks an order up by its secret token
 * and returns just the fields a client may see.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
