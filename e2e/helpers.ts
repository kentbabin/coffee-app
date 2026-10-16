import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "e2e-admin@example.com";

const MAILPIT = "http://127.0.0.1:54324/api/v1";

/** Local Supabase defaults; the same for every machine running `supabase start`. */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function clearMailbox() {
  await fetch(`${MAILPIT}/messages`, { method: "DELETE" });
}

export async function messagesTo(email: string): Promise<{ ID: string }[]> {
  const res = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}`);
  const body = (await res.json()) as { messages?: { ID: string }[] };
  return body.messages ?? [];
}

/** Waits for the sign-in email and returns the 6-digit code in it. */
export async function signInCode(email: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [latest] = await messagesTo(email);
    if (latest) {
      const res = await fetch(`${MAILPIT}/message/${latest.ID}`);
      const message = (await res.json()) as { Text?: string; HTML?: string };
      const code = `${message.Text ?? ""} ${message.HTML ?? ""}`.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No sign-in code arrived for ${email}`);
}
