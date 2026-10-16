import { Suspense } from "react";
import { brand } from "@/lib/brand";
import { parseFilters } from "@/lib/filters";
import { getOptionLists } from "@/lib/options-data";
import { searchShops } from "@/lib/shops";
import { Discover } from "./Discover";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <section className="hero">
      <h1>{brand.tagline}</h1>
      <p>{brand.description}</p>
      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverResults searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function DiscoverResults({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const [options, results] = await Promise.all([getOptionLists(), searchShops(filters)]);
  return <Discover filters={filters} options={options} results={results} />;
}

function DiscoverSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton skeleton--bar" />
      <div className="grid" style={{ marginTop: "var(--space-7)" }}>
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    </div>
  );
}
