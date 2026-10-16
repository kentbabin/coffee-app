"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";
import { pinFromMapsUrl } from "@/lib/maps-pin";
import { instagramHandle, shopFormSchema, type ShopFormValues } from "@/lib/shop-schema";

export type SaveShopResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ShopFormValues, string>> };

export async function saveShop(input: {
  values: ShopFormValues;
  /** Set when editing. */
  id?: string;
  /** The updated_at the form loaded, to catch someone else's save in between. */
  expectedUpdatedAt?: string;
  /** Set when approving a submission. */
  submissionId?: string;
}): Promise<SaveShopResult> {
  const { supabase } = await requireAdmin();

  const parsed = shopFormSchema.safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ShopFormValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ShopFormValues;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Some fields need attention. Check the messages below each one.", fieldErrors };
  }
  const v = parsed.data;

  // The pin comes from the Maps link. If it can't be read this time, an
  // unchanged link keeps the pin it already had.
  let pin = v.maps_url ? await pinFromMapsUrl(v.maps_url) : null;
  if (!pin && input.id && v.maps_url) {
    const { data: current } = await supabase.from("shops").select("maps_url, lat, lng").eq("id", input.id).maybeSingle();
    if (current?.maps_url === v.maps_url && current.lat !== null && current.lng !== null) pin = { lat: current.lat, lng: current.lng };
  }

  const { data, error } = await supabase.rpc("save_shop", {
    p_shop: {
      id: input.id ?? null,
      name: v.name,
      slug: v.slug,
      address: v.address,
      area_id: v.area_id,
      maps_url: v.maps_url,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
      type: v.type,
      roast_levels: v.roast_levels,
      bean_origin: v.bean_origin,
      processing: v.processing,
      description: v.description,
      website: v.website,
      instagram: instagramHandle(v.instagram),
      // Edits leave visibility alone; the Hide button changes it.
      ...(input.id ? {} : { is_hidden: v.is_hidden }),
    },
    p_preparation_ids: v.preparation_ids,
    p_roaster_ids: v.roaster_ids,
    p_new_roasters: v.new_roasters,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_submission_id: input.submissionId,
  });

  if (error) {
    if (error.code === "CA409") return { ok: false, error: error.message };
    if (error.code === "23505" && error.message.includes("shops_slug_key")) {
      const slug = { slug: "Another shop already uses this slug. Change it a little, for example by adding the area." };
      return { ok: false, error: "Some fields need attention. Check the messages below each one.", fieldErrors: slug };
    }
    return { ok: false, error: `The shop couldn't be saved: ${error.message}` };
  }

  updateTag("shops");
  updateTag("roasters");
  return { ok: true, id: data.id };
}

export async function setShopHidden(id: string, hidden: boolean) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("shops").update({ is_hidden: hidden }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  updateTag("shops");
  updateTag("roasters");
  return { ok: true as const };
}

export async function findSimilarShops(name: string, areaId: string, excludeId?: string) {
  const { supabase } = await requireAdmin();
  if (name.trim().length < 3 || !areaId) return [];
  const { data } = await supabase.rpc("find_similar_shops", { p_name: name, p_area_id: areaId, p_exclude_id: excludeId });
  return data ?? [];
}
