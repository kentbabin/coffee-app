import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShopVote } from "@/components/ShopVote";
import { Icon, ShopCard } from "@/components/ui";
import { getRoaster } from "@/lib/shops";

export async function generateMetadata({ params }: PageProps<"/roasters/[slug]">): Promise<Metadata> {
  const roaster = await getRoaster((await params).slug);
  if (!roaster) return { title: "Roaster not found" };
  return {
    title: `${roaster.name}, roaster${roaster.city ? ` in ${roaster.city}` : ""}`,
    description: `Where to drink coffee roasted by ${roaster.name}${roaster.city ? ` of ${roaster.city}` : ""}.`,
    alternates: { canonical: `/roasters/${roaster.slug}` },
  };
}

export default function RoasterPage({ params }: PageProps<"/roasters/[slug]">) {
  return (
    <>
      <Link href="/roasters" className="crumb">
        <Icon name="arrowLeft" size={14} /> All roasters
      </Link>
      <Suspense fallback={<div className="skeleton skeleton--card" style={{ marginTop: "var(--space-5)" }} />}>
        <RoasterDetail params={params} />
      </Suspense>
    </>
  );
}

async function RoasterDetail({ params }: Pick<PageProps<"/roasters/[slug]">, "params">) {
  const roaster = await getRoaster((await params).slug);
  if (!roaster) notFound();

  return (
    <div className="detail" style={{ gridTemplateColumns: "1fr" }}>
      <div className="detail__head">
        <h1 className="t-display-lg">{roaster.name}</h1>
        <p className="t-body t-muted">{[roaster.city, roaster.processingLabels.join(", ")].filter(Boolean).join(" · ")}</p>
        {roaster.website ? (
          <p>
            <a href={roaster.website} rel="noopener nofollow" target="_blank">
              Website <Icon name="externalLink" size={14} />
            </a>
          </p>
        ) : null}
      </div>
      {/* Shops this roaster roasts for: a group's own shops. */}
      {roaster.ownShops.length ? (
        <section className="section" aria-labelledby={`own-${roaster.slug}`}>
          <h2 id={`own-${roaster.slug}`} className="t-title">
            Their shops
          </h2>
          <div className="grid">
            {roaster.ownShops.map((s) => (
              <ShopCard key={s.id} shop={s.card} href={`/shops/${s.slug}`} vote={<ShopVote shopId={s.id} up={s.up} down={s.down} name={s.card.name} />} />
            ))}
          </div>
        </section>
      ) : null}
      {roaster.shops.length || !roaster.ownShops.length ? (
        <section className="section" aria-labelledby={`served-${roaster.slug}`}>
          <h2 id={`served-${roaster.slug}`} className="t-title">
            {roaster.ownShops.length ? "Also served at" : "Shops serving their beans"}
          </h2>
          {roaster.shops.length ? (
            <div className="grid">
              {roaster.shops.map((s) => (
                <ShopCard key={s.id} shop={s.card} href={`/shops/${s.slug}`} vote={<ShopVote shopId={s.id} up={s.up} down={s.down} name={s.card.name} />} />
              ))}
            </div>
          ) : (
            <p className="t-body t-muted">No shops list these beans yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
