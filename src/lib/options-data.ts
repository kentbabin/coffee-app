import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { OPTION_LISTS, type Option, type OptionLists } from "@/lib/options";
import { publicDb } from "@/lib/supabase/public";

/** All five admin-editable option lists, retired values included, in display order. */
export async function getOptionLists(): Promise<OptionLists> {
  "use cache";
  cacheTag("options");
  cacheLife("hours");

  const results = await Promise.all(
    OPTION_LISTS.map(({ key }) =>
      publicDb
        .from(key)
        .select(key === "areas" ? "id, slug, label, sort_order, is_retired, region" : "id, slug, label, sort_order, is_retired")
        .order("sort_order")
        .order("label"),
    ),
  );
  const lists = {} as OptionLists;
  OPTION_LISTS.forEach(({ key }, i) => {
    const { data, error } = results[i];
    if (error) throw error;
    lists[key] = data as unknown as Option[];
  });
  return lists;
}
