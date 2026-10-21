import { cacheLife, cacheTag } from "next/cache";
import type { ShopCardData } from "@/components/ui";
import { PAGE_SIZE, type Filters } from "@/lib/filters";
import type { ShopType } from "@/lib/labels";
import { shopMapsUrl } from "@/lib/maps";
import { getOptionLists } from "@/lib/options-data";
import { labeller, type OptionLists } from "@/lib/options";
import { publicDb } from "@/lib/supabase/public";

// Public reads, as an anonymous visitor (RLS hides hidden shops), cached and
// shared across visitors. Admin saves call updateTag("shops") / ("roasters").
// Vote counts move constantly, so lists refresh every minute; the vote
// buttons reconcile the visitor's own votes in the browser (ShopVote).

export type ShopSummary = { id: string; slug: string; up: number; down: number; card: ShopCardData };

function card(
  row: {
    name: string;
    type: ShopType;
    serves_geisha: boolean;
    description: string | null;
    address: string;
    maps_url: string | null;
    lat?: number | null;
    lng?: number | null;
  },
  area: string,
): ShopCardData {
  return {
    name: row.name,
    area,
    roaster: row.type === "both",
    geisha: row.serves_geisha,
    description: row.description ?? null,
    mapsUrl: shopMapsUrl(row),
  };
}

/** A shop's coffee attributes as display labels, for the shop page. */
function coffee(row: { roast_levels: string[]; preparations: string[]; bean_origin: string; processing: string[] }, options: OptionLists) {
  return {
    roastLevels: row.roast_levels,
    preparations: row.preparations.map(labeller(options.preparation_methods)),
    beanOrigin: labeller(options.bean_origins)(row.bean_origin),
    processing: row.processing.map(labeller(options.processing_methods)),
  };
}

/** P1-P3: the ranked, filtered, searched list. */
export async function searchShops(f: Filters): Promise<{ shops: ShopSummary[]; total: number }> {
  "use cache";
  cacheTag("shops");
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });

  const { data, error } = await publicDb.rpc("search_shops", {
    p_query: f.q || undefined,
    p_roast: f.roast,
    p_preparations: f.prep,
    p_bean_origin: f.origin || undefined,
    p_processing: f.processing,
    p_type: f.type || undefined,
    p_areas: f.area,
    p_geisha: f.geisha || undefined,
    p_limit: PAGE_SIZE * f.page,
    p_offset: 0,
  });
  if (error) throw error;
  return {
    total: data[0]?.total_count ?? 0,
    shops: data.map((r) => ({ id: r.id, slug: r.slug, up: r.upvotes, down: r.downvotes, card: card(r, r.area_label) })),
  };
}

/** P4: one visible shop, with its area and the roasters it serves. Null when hidden or unknown. */
export async function getShop(slug: string) {
  "use cache";
  cacheTag("shops", `shop:${slug}`);
  cacheLife({ stale: 60, revalidate: 60, expire: 86400 });

  const { data: shop, error } = await publicDb.from("shops").select("*, area:areas(label, region)").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!shop) return null;

  const [options, roasters, ownRoaster] = await Promise.all([
    getOptionLists(),
    shop.roaster_ids.length ? publicDb.from("roasters").select("id, slug, name, city").in("id", shop.roaster_ids).order("name") : Promise.resolve({ data: [] }),
    publicDb.from("roasters").select("slug").eq("shop_id", shop.id).maybeSingle(),
  ]);
  return {
    ...shop,
    areaLabel: shop.area?.label ?? "",
    region: shop.area?.region ?? "Bali",
    coffee: coffee(shop, options),
    roasters: roasters.data ?? [],
    ownRoasterSlug: ownRoaster.data?.slug ?? null,
  };
}

/** The current slug of a shop that used to be at this one, if it's visible. */
export async function getShopRedirect(oldSlug: string) {
  "use cache";
  cacheTag("shops");
  cacheLife("hours");
  const { data } = await publicDb.from("shop_slug_redirects").select("shop:shops(slug)").eq("slug", oldSlug).maybeSingle();
  // RLS leaves hidden shops out of the join, so they don't redirect.
  return data?.shop?.slug ?? null;
}

/** P7: every roaster, alphabetical, with the number of visible shops serving them. */
export async function getRoasters() {
  "use cache";
  cacheTag("roasters");
  cacheLife("hours");
  const [options, { data, error }] = await Promise.all([getOptionLists(), publicDb.from("roaster_directory").select("*").order("name")]);
  if (error) throw error;
  const processing = labeller(options.processing_methods);
  return data.map((r) => ({ ...r, processingLabels: (r.processing ?? []).map(processing) }));
}

/** P7: one roaster, the visible shops serving its beans, and its own shop if it has one. */
export async function getRoaster(slug: string) {
  "use cache";
  cacheTag("roasters", "shops");
  cacheLife("hours");

  const { data: roaster, error } = await publicDb.from("roaster_directory").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!roaster?.id) return null;

  const [options, links, own] = await Promise.all([
    getOptionLists(),
    publicDb.from("shop_roasters").select("shop_id").eq("roaster_id", roaster.id),
    roaster.shop_id ? publicDb.from("shops").select("slug, name").eq("id", roaster.shop_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ids = (links.data ?? []).map((l) => l.shop_id);
  const { data: shops } = ids.length
    ? await publicDb
        .from("shops")
        .select("id, slug, name, type, serves_geisha, description, address, maps_url, lat, lng, upvotes, downvotes, area:areas(label)")
        .in("id", ids)
        .order("score", { ascending: false })
    : { data: [] };

  const processing = labeller(options.processing_methods);
  return {
    ...roaster,
    processingLabels: (roaster.processing ?? []).map(processing),
    // RLS leaves hidden shops out, so a hidden own shop reads as none.
    ownShop: own.data,
    shops: (shops ?? []).map((s) => ({ id: s.id, slug: s.slug, up: s.upvotes, down: s.downvotes, card: card(s, s.area?.label ?? "") })),
  };
}

/** For sitemap.xml. */
export async function getSitemapEntries() {
  "use cache";
  cacheTag("shops", "roasters");
  cacheLife("hours");
  const [shops, roasters] = await Promise.all([
    publicDb.from("shops").select("slug, updated_at"),
    publicDb.from("roasters").select("slug, updated_at"),
  ]);
  return { shops: shops.data ?? [], roasters: roasters.data ?? [] };
}
