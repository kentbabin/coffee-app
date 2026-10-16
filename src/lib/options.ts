import { cacheLife, cacheTag } from "next/cache";
import { publicDb } from "@/lib/supabase/public";

export type Option = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_retired: boolean;
  region?: string;
};

export const OPTION_LISTS = [
  { key: "roast_levels", title: "Roast", singular: "roast level" },
  { key: "preparation_methods", title: "Preparation", singular: "preparation" },
  { key: "bean_origins", title: "Bean origin", singular: "bean origin" },
  { key: "processing_methods", title: "Processing", singular: "processing method" },
  { key: "areas", title: "Area", singular: "area" },
] as const;

export type OptionListKey = (typeof OPTION_LISTS)[number]["key"];
export type OptionLists = Record<OptionListKey, Option[]>;

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

/** Values to offer in forms and filters: everything not retired. */
export function active(options: Option[]) {
  return options.filter((o) => !o.is_retired);
}

/** Slug to label, including retired values so existing shops still display them. */
export function labeller(options: Option[]) {
  const map = new Map(options.map((o) => [o.slug, o.label]));
  return (slug: string) => map.get(slug) ?? slug;
}
