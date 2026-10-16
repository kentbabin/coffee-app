"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ pending }: { pending: number }) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Shops", current: path === "/admin" || path.startsWith("/admin/shops") },
    { href: "/admin/submissions", label: pending ? `Submissions (${pending})` : "Submissions", current: path.startsWith("/admin/submissions") },
    { href: "/admin/options", label: "Option lists", current: path.startsWith("/admin/options") },
  ];
  return (
    <nav className="adm-nav" aria-label="Admin">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="adm-nav__link" aria-current={l.current ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      <Link href="/" className="adm-nav__link">
        View site
      </Link>
    </nav>
  );
}
