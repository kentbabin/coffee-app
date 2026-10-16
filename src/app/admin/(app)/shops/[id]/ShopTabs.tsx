"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ShopTabs({ id }: { id: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/admin/shops/${id}`, label: "Details" },
    { href: `/admin/shops/${id}/history`, label: "History" },
  ];
  return (
    <nav className="adm-tabs" aria-label="Shop">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className="adm-tabs__link" aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
