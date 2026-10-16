import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { plural } from "@/lib/labels";
import { getRoasters } from "@/lib/shops";

export const metadata: Metadata = {
  title: "Roasters",
  description: "Specialty coffee roasters in Bali, and the shops that serve their beans.",
  alternates: { canonical: "/roasters" },
};

export default function RoastersPage() {
  return (
    <div className="narrow" style={{ maxWidth: "var(--content-max)" }}>
      <h1 className="t-display-lg">Roasters</h1>
      <p className="t-body t-muted">Who roasts the beans, and where you can drink them.</p>
      <Suspense fallback={<div className="skeleton skeleton--card" style={{ marginTop: "var(--space-5)" }} />}>
        <RoasterList />
      </Suspense>
    </div>
  );
}

async function RoasterList() {
  const roasters = await getRoasters();
  return (
    <ul className="roaster-list">
      {roasters.map((r) => (
        <li key={r.id}>
          <div>
            <Link href={`/roasters/${r.slug}`}>{r.name}</Link>
            <p className="t-body-sm t-muted">{[r.city, r.processingLabels.join(", ")].filter(Boolean).join(" · ")}</p>
          </div>
          <span className="t-data t-muted">{plural(r.shop_count ?? 0, "shop serves their beans", "shops serve their beans")}</span>
        </li>
      ))}
    </ul>
  );
}
