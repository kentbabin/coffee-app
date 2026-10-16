// P5: thumbs up or down, one vote per shop per device.
// POST { shop_id, voter_token, value: 1 | -1 | 0 } -> { up, down, value }
import { z } from "npm:zod@4.6.7";
import { dbError, ipHash, json, preflight, serviceClient } from "../_shared/http.ts";

const Body = z.object({
  shop_id: z.uuid(),
  voter_token: z.uuid(),
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Send shop_id, voter_token and a value of 1, -1 or 0." }, 400);
  const { shop_id, voter_token, value } = parsed.data;

  const { data, error } = await serviceClient()
    .rpc("cast_vote", { p_shop_id: shop_id, p_voter_token: voter_token, p_ip_hash: await ipHash(req), p_value: value })
    .single<{ upvotes: number; downvotes: number; value: number }>();
  if (error) return dbError(error);

  return json({ up: data.upvotes, down: data.downvotes, value: data.value });
});
