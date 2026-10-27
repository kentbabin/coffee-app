import Link from "next/link";
import { brand } from "@/lib/brand";
import { SiteHeader } from "./SiteHeader";
import "./site.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="wrap page-main">{children}</main>
      <footer className="foot">
        <div className="wrap foot__in">
          <p>{brand.footer}</p>
          <div className="foot__links">
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
