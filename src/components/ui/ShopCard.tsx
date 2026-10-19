import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

export type ShopCardData = {
  name: string;
  area: string;
  /** Roasts its own beans too. Every shop brews, so only roasters are marked. */
  roaster: boolean;
  /** One sentence on why the shop matters, when the admin has written one. */
  description: string | null;
  /** Opens the shop in Google Maps (see shopMapsUrl). */
  mapsUrl: string;
};

/** One shop in the ranked list. The whole card links to the shop page; the Maps link and vote buttons stay separately tappable. */
export function ShopCard({ shop, href, vote, className }: { shop: ShopCardData; href: string; vote: ReactNode; className?: string }) {
  return (
    <article className={cx("ca-card", className)}>
      <div className="ca-card__head">
        {shop.roaster ? <span className="ca-tag">Roaster</span> : null}
        <h3 className="ca-card__name">
          <Link className="ca-card__link" href={href}>
            {shop.name}
          </Link>
        </h3>
        <p className="ca-card__area">{shop.area}</p>
      </div>
      {shop.description ? <p className="ca-card__desc">{shop.description}</p> : null}
      <div className="ca-card__foot">
        <a className="ca-card__map" href={shop.mapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${shop.name} in Google Maps`}>
          <Icon name="mapPin" />
        </a>
        <div className="ca-card__vote">{vote}</div>
      </div>
    </article>
  );
}
