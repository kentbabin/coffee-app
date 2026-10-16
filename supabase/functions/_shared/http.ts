import { createClient } from "npm:@supabase/supabase-js@2.118.0";

// Votes and submissions come from the public site with no credentials, so any
// origin may call these functions; abuse is limited by IP hash, not origin.
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

export function preflight(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  return null;
}

/** The service-role client. It never leaves this function. */
export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function callerIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** A salted SHA-256 of the caller's IP. The raw IP is never stored. */
export async function ipHash(req: Request) {
  const salt = Deno.env.get("IP_HASH_SALT");
  if (!salt) throw new Error("IP_HASH_SALT is not set");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${callerIp(req)}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Maps the database's CA404/CA429 errors to HTTP responses. */
export function dbError(error: { code?: string; message: string }) {
  if (error.code === "CA404") return json({ error: error.message }, 404);
  if (error.code === "CA429") return json({ error: error.message }, 429);
  console.error(error);
  return json({ error: "Something went wrong. Try again in a moment." }, 500);
}
