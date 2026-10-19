import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ShopVote } from "@/components/ShopVote";
import { Badge, Button, Chip, Icon, RoastScale } from "@/components/ui";
import { brand } from "@/lib/brand";
import { TYPE_LABEL } from "@/lib/labels";
import { shopMapsUrl } from "@/lib/maps";
import { getShop, getShopRedirect } from "@/lib/shops";

export async function generateMetadata({ params }: PageProps<"/shops/[slug]">): Promise<Metadata> {
  const shop = await getShop((await params).slug);
  if (!shop) return { title: "Shop not found" };
  const what = [TYPE_LABEL[shop.type], shop.coffee.roastLevels.join(", ") + " roast", shop.coffee.preparations.join(", ")].join(" · ");
  const description = shop.description ?? `${shop.name} in ${shop.areaLabel}, ${shop.region}: ${what}.`;
  return {
    title: `${shop.name}, ${shop.areaLabel}`,
    description,
    alternates: { canonical: `/shops/${shop.slug}` },
    openGraph: { title: `${shop.name} · ${brand.name}`, description, type: "website", url: `/shops/${shop.slug}` },
  };
}

export default function ShopPage({ params }: PageProps<"/shops/[slug]">) {
  return (
    <>
      <Link href="/" className="crumb">
        <Icon name="arrowLeft" size={14} /> All shops
      </Link>
      <Suspense fallback={<div className="skeleton skeleton--card" style={{ marginTop: "var(--space-5)" }} />}>
        <ShopDetail params={params} />
      </Suspense>
    </>
  );
}

async function ShopDetail({ params }: Pick<PageProps<"/shops/[slug]">, "params">) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) {
    // The shop may have been renamed: old links follow it to its new slug.
    const moved = await getShopRedirect(slug);
    if (moved) permanentRedirect(`/shops/${moved}`);
    notFound();
  }

  // Ids include the slug: Next.js keeps visited pages in the document, hidden.
  const pin = shop.lat !== null && shop.lng !== null ? { lat: Number(shop.lat), lng: Number(shop.lng) } : null;
  const mapsHref = shopMapsUrl(shop);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: shop.name,
    description: shop.description ?? undefined,
    url: `${brand.siteUrl}/shops/${shop.slug}`,
    address: { "@type": "PostalAddress", streetAddress: shop.address, addressLocality: shop.areaLabel, addressRegion: shop.region, addressCountry: "ID" },
    geo: pin ? { "@type": "GeoCoordinates", latitude: pin.lat, longitude: pin.lng } : undefined,
    sameAs: [shop.website, shop.instagram ? `https://instagram.com/${shop.instagram}` : null].filter(Boolean),
  };

  return (
    <div className="detail">
      <div>
        <div className="detail__head">
          <div className="detail__title">
            <h1>{shop.name}</h1>
            <Badge kind={shop.type} />
          </div>
          <p className="t-body t-muted">
            {shop.areaLabel} · {shop.address}
          </p>
          {shop.description ? <p className="detail__lead">{shop.description}</p> : null}
        </div>

        <section className="section" aria-labelledby={`coffee-${shop.slug}`}>
          <h2 id={`coffee-${shop.slug}`} className="t-title">
            The coffee
          </h2>
          <dl className="panel attrs">
            <div>
              <dt>Roast</dt>
              <dd>
                <RoastScale levels={shop.coffee.roastLevels} />
              </dd>
            </div>
            <div>
              <dt>Preparation</dt>
              <dd>
                {shop.coffee.preparations.map((p) => (
                  <Chip key={p} static>
                    {p}
                  </Chip>
                ))}
              </dd>
            </div>
            <div>
              <dt>Bean origin</dt>
              <dd>{shop.coffee.beanOrigin}</dd>
            </div>
            <div>
              <dt>Processing</dt>
              <dd>{shop.coffee.processing.join(", ")}</dd>
            </div>
          </dl>
        </section>

        {shop.roasters.length || shop.ownRoasterSlug ? (
          <section className="section" aria-labelledby={`roasters-${shop.slug}`}>
            <h2 id={`roasters-${shop.slug}`} className="t-title">
              Beans from
            </h2>
            <ul className="links">
              {shop.ownRoasterSlug ? (
                <li>
                  <Link href={`/roasters/${shop.ownRoasterSlug}`}>{shop.name}</Link> <span className="t-body-sm t-muted">roasts its own beans</span>
                </li>
              ) : null}
              {shop.roasters.map((r) => (
                <li key={r.id}>
                  <Link href={`/roasters/${r.slug}`}>{r.name}</Link>
                  {r.city ? <span className="t-body-sm t-muted">, {r.city}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="panel" aria-label="Visit and vote">
        <div className="score">
          <span className="t-label t-muted">Thumbs up and down</span>
        </div>
        <ShopVote shopId={shop.id} up={shop.upvotes} down={shop.downvotes} name={shop.name} alwaysFresh />
        <p className="t-body-sm t-muted">Counts cover the last 90 days. Rank comes from votes.</p>
        <Button href={mapsHref}>
          Open in Google Maps <Icon name="externalLink" size={16} />
        </Button>
        <iframe
          className="map"
          title={`Map showing ${shop.name}`}
          // Without a pin, the map finds the shop by name and address.
          src={`https://www.google.com/maps?q=${encodeURIComponent(pin ? `${pin.lat},${pin.lng}` : `${shop.name}, ${shop.address}`)}&z=16&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {shop.website || shop.instagram ? (
          <ul className="links">
            {shop.website ? (
              <li>
                <a href={shop.website} rel="noopener nofollow" target="_blank">
                  Website <Icon name="externalLink" size={14} />
                </a>
              </li>
            ) : null}
            {shop.instagram ? (
              <li>
                <a href={`https://instagram.com/${shop.instagram}`} rel="noopener nofollow" target="_blank">
                  Instagram @{shop.instagram} <Icon name="externalLink" size={14} />
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}
      </aside>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
