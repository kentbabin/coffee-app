import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/session";
import { getOptionLists } from "@/lib/options-data";
import type { ShopFormValues } from "@/lib/shop-schema";
import { ShopForm } from "../ShopForm";
import { getAdminShop } from "./shop";

// Admin pages render per request for the signed-in admin.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/shops/[id]">): Promise<Metadata> {
  const shop = await getAdminShop((await params).id);
  return { title: `Edit ${shop.name}` };
}

export default async function EditShopPage({ params }: PageProps<"/admin/shops/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [shop, options, roasters] = await Promise.all([
    getAdminShop(id),
    getOptionLists(),
    // The shop's own linked roaster record is not something it "serves".
    supabase.from("roasters").select("id, name, city, shop_id").order("name"),
  ]);
  if (roasters.error) throw roasters.error;

  const prepId = new Map(options.preparation_methods.map((p) => [p.slug, p.id]));
  const initial: ShopFormValues = {
    name: shop.name,
    address: shop.address,
    area_id: shop.area_id,
    maps_url: shop.maps_url ?? "",
    lat: shop.lat === null ? "" : String(shop.lat),
    lng: shop.lng === null ? "" : String(shop.lng),
    type: shop.type,
    roaster_ids: shop.roaster_ids,
    new_roasters: [],
    roast_levels: shop.roast_levels,
    preparation_ids: shop.preparations.map((slug) => prepId.get(slug)).filter((v): v is string => Boolean(v)),
    bean_origin: shop.bean_origin,
    processing: shop.processing,
    description: shop.description ?? "",
    website: shop.website ?? "",
    instagram: shop.instagram ? `@${shop.instagram}` : "",
    is_hidden: shop.is_hidden,
  };

  return (
    <ShopForm
      // Remount after each save so the form holds the saved values and timestamp.
      key={shop.updated_at}
      options={options}
      roasters={roasters.data.filter((r) => r.shop_id !== shop.id)}
      initial={initial}
      mode={{ kind: "edit", id: shop.id, updatedAt: shop.updated_at }}
    />
  );
}
