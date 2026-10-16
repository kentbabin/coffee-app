import Link from "next/link";
import { Icon, StatusTag } from "@/components/ui";
import { getAdminShop } from "./shop";
import { HideToggle } from "./HideToggle";
import { ShopTabs } from "./ShopTabs";

export const instant = false;

export default async function AdminShopLayout({ children, params }: LayoutProps<"/admin/shops/[id]">) {
  const { id } = await params;
  const shop = await getAdminShop(id);
  return (
    <div>
      <Link href="/admin" className="adm-back">
        <Icon name="arrowLeft" size={14} /> Shops
      </Link>
      <div className="adm-page-head">
        <div className="adm-page-head__title">
          <h1 className="t-heading">{shop.name}</h1>
          <StatusTag kind={shop.is_hidden ? "hidden" : "visible"} />
        </div>
        <div className="adm-actions">
          {shop.is_hidden ? null : (
            <Link href={`/shops/${shop.slug}`} className="adm-inline-link" target="_blank">
              View public page <Icon name="externalLink" size={14} />
            </Link>
          )}
          <HideToggle id={shop.id} hidden={shop.is_hidden} name={shop.name} />
        </div>
      </div>
      <ShopTabs id={shop.id} />
      {children}
    </div>
  );
}
