"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";
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
  const servesRoasters = v.type !== "roaster";

  const { data, error } = await supabase.rpc("save_shop", {
    p_shop: {
      id: input.id ?? null,
      name: v.name,
      address: v.address,
      area_id: v.area_id,
      maps_url: v.maps_url,
      lat: v.lat === "" ? null : Number(v.lat),
      lng: v.lng === "" ? null : Number(v.lng),
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
    p_roaster_ids: servesRoasters ? v.roaster_ids : [],
    p_new_roasters: servesRoasters ? v.new_roasters : [],
    p_expected_updated_at: input.expectedUpdatedAt,
    p_submission_id: input.submissionId,
  });

  if (error) {
    if (error.code === "CA409") return { ok: false, error: error.message };
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
