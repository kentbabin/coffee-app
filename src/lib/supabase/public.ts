import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

// A visitor's view of the database: no session, no cookies, so its reads can
// be cached with "use cache" and shared across visitors. RLS hides hidden shops.
export const publicDb = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
