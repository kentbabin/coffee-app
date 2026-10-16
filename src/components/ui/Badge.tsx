import type { ReactNode } from "react";
import type { ShopType } from "@/lib/labels";
import { TYPE_LABEL } from "@/lib/labels";
import { cx } from "./cx";

/** A small outlined label for a shop's type. All kinds share one look: the word carries the meaning. */
export function Badge({ kind, children, className }: { kind?: ShopType; children?: ReactNode; className?: string }) {
  return <span className={cx("ca-badge", className)}>{kind ? TYPE_LABEL[kind] : children}</span>;
}
