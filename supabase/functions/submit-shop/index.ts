// P6: submit a shop for review. Lands in the moderation queue as pending.
// POST { name, maps_url, notes?, email?, website (honeypot), turnstile_token }
import { z } from "npm:zod@4.6.7";
import { callerIp, dbError, ipHash, json, preflight, serviceClient } from "../_shared/http.ts";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  // Full links and share links (maps.app.goo.gl) both count; the database checks the same rule.
  maps_url: z
    .string()
    .trim()
    .max(500)
    .regex(/^https?:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i),
  notes: z.string().trim().max(1000).default(""),
  email: z.union([z.literal(""), z.email().max(254)]).default(""),
  // Hidden from people; bots fill it in.
  website: z.string().default(""),
  turnstile_token: z.string().min(1),
});

async function passesTurnstile(token: string, ip: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("TURNSTILE_SECRET_KEY is not set");
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const outcome = (await res.json()) as { success: boolean };
  return outcome.success;
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check the form: a shop name and its Google Maps link are required." }, 400);
  const body = parsed.data;

  // A filled honeypot gets the normal success reply, so bots learn nothing.
  if (body.website) return json({ ok: true });

  if (!(await passesTurnstile(body.turnstile_token, callerIp(req)))) {
    return json({ error: "The check that you're not a bot didn't pass. Reload the page and try again." }, 403);
  }

  const { error } = await serviceClient().rpc("submit_shop", {
    p_name: body.name,
    p_maps_url: body.maps_url,
    p_notes: body.notes,
    p_submitter_email: body.email,
    p_ip_hash: await ipHash(req),
  });
  if (error) return dbError(error);

  return json({ ok: true });
});
