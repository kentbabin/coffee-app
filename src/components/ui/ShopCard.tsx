import Link from "next/link";
import type { ReactNode } from "react";
import type { ShopType } from "@/lib/labels";
import { Badge } from "./Badge";
import { Chip } from "./Chip";
import { cx } from "./cx";
import { RoastScale } from "./RoastScale";

export type ShopCardData = {
  name: string;
  area: string;
  type: ShopType;
  roastLevels: string[];
  /** Labels, in display order. */
  preparations: string[];
  /** e.g. "Local beans". */
  beanOrigin: string;
  /** Labels. */
  processing: string[];
};

/** One shop in the ranked list. The whole card links to the shop page; the vote buttons stay separately tappable. */
export function ShopCard({ shop, href, vote, className }: { shop: ShopCardData; href: string; vote: ReactNode; className?: string }) {
  const shown = shop.preparations.slice(0, 3);
  const more = shop.preparations.length - shown.length;
  const meta = [shop.beanOrigin, shop.processing.join(", ")].filter(Boolean).join(" · ");
  return (
    <article className={cx("ca-card", className)}>
      <div className="ca-card__head">
        <h3 className="ca-card__name">
          <Link className="ca-card__link" href={href}>
            {shop.name}
          </Link>
        </h3>
        <Badge kind={shop.type} />
      </div>
      <p className="ca-card__area">{shop.area}</p>
      <RoastScale levels={shop.roastLevels} />
      <div className="ca-card__chips">
        {shown.map((p) => (
          <Chip key={p} static>
            {p}
          </Chip>
        ))}
        {more > 0 ? <Chip static>+{more}</Chip> : null}
      </div>
      <div className="ca-card__foot">
        <p className="ca-card__meta">{meta}</p>
        {vote}
      </div>
    </article>
  );
}
