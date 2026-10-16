import Link from "next/link";
import { Button, EmptyState } from "@/components/ui";
import { brand } from "@/lib/brand";
import "./(public)/site.css";

// For URLs outside every route. Shop and roaster pages use (public)/not-found.tsx.
export default function NotFound() {
  return (
    <>
      <header className="site">
        <div className="wrap site__in">
          <Link className="brand" href="/">
            {brand.name}
          </Link>
        </div>
      </header>
      <main className="wrap narrow">
        <EmptyState title="This page isn't here" actions={<Button href="/">See all shops</Button>}>
          Check the link, or start from the list of shops.
        </EmptyState>
      </main>
    </>
  );
}
