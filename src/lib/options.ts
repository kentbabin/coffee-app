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

/** Values to offer in forms and filters: everything not retired. */
export function active(options: Option[]) {
  return options.filter((o) => !o.is_retired);
}

/** Slug to label, including retired values so existing shops still display them. */
export function labeller(options: Option[]) {
  const map = new Map(options.map((o) => [o.slug, o.label]));
  return (slug: string) => map.get(slug) ?? slug;
}
