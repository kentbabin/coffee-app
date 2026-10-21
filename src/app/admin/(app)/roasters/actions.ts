"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";
import { roasterFormSchema, type RoasterFormValues } from "@/lib/shop-schema";

export type SaveRoasterResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof RoasterFormValues, string>> };

export async function saveRoaster(input: { values: RoasterFormValues; id?: string }): Promise<SaveRoasterResult> {
  const { supabase } = await requireAdmin();
  const parsed = roasterFormSchema.safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof RoasterFormValues, string>> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as keyof RoasterFormValues] ??= issue.message;
    return { ok: false, error: "Some fields need attention. Check the messages below each one.", fieldErrors };
  }
  const v = parsed.data;
  const row = { name: v.name, city: v.city || null, processing: v.processing, website: v.website || null };

  let id = input.id;
  if (id) {
    const { data, error } = await supabase.from("roasters").update(row).eq("id", id).select("id");
    if (error) return { ok: false, error: `The roaster couldn't be saved: ${error.message}` };
    if (!data.length) return { ok: false, error: "This roaster no longer exists." };
  } else {
    // An empty slug is generated from the name by the database.
    const { data, error } = await supabase
      .from("roasters")
      .insert({ ...row, slug: "" })
      .select("id")
      .single();
    if (error) return { ok: false, error: `The roaster couldn't be saved: ${error.message}` };
    id = data.id;
  }

  // Roaster names appear on shop pages and in shop search.
  updateTag("roasters");
  updateTag("shops");
  return { ok: true, id };
}
