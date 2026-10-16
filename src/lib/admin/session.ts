import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * The signed-in admin and a database client acting as them. Redirects to
 * sign-in otherwise. Every admin page and Server Action calls this; row level
 * security in the database enforces the same rule again.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/sign-in");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    redirect("/admin/sign-in?reason=no-access");
  }
  return { supabase, userId, email: typeof data.claims.email === "string" ? data.claims.email : "" };
});
