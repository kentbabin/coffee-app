import type { Database } from "@/lib/supabase/database.types";

export type ShopType = Database["public"]["Enums"]["shop_type"];

// Shop type is a fixed enum (roaster logic depends on it), so its labels live
// in code. Every other option list is admin-editable and labelled from the DB.
export const TYPE_LABEL: Record<ShopType, string> = {
  roaster: "Roaster",
  maker: "Maker",
  both: "Roaster and maker",
};

// The roast scale has exactly three segments, each with its own colour token.
export const ROAST_SCALE = ["light", "medium", "dark"] as const;
export const ROAST_LABEL: Record<(typeof ROAST_SCALE)[number], string> = {
  light: "Light",
  medium: "Medium",
  dark: "Dark",
};

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
