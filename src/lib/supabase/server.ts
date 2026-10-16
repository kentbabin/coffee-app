import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** A client acting as the signed-in admin, from the session cookie. Server Components, Server Actions and Route Handlers only. */
export async function createSessionClient() {
  // The auth client reads the clock to check token expiry; tell Next.js this
  // is request-time work so it never tries to prerender it.
  await connection();
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session on every admin request instead.
        }
      },
    },
  });
}
