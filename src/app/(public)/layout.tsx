import Link from "next/link";
import { Button } from "@/components/ui";
import { brand } from "@/lib/brand";
import "./site.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site">
        <div className="wrap site__in">
          <Link className="brand" href="/">
            {brand.name}
          </Link>
          <nav className="nav" aria-label="Main">
            <Link className="nav__link" href="/roasters">
              Roasters
            </Link>
            <Button variant="secondary" href="/submit">
              Submit a shop
            </Button>
          </nav>
        </div>
      </header>
      <main className="wrap page-main">{children}</main>
      <footer className="foot">
        <div className="wrap foot__in">
          <p>{brand.footer}</p>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </>
  );
}
