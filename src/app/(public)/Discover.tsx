"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ShopVote } from "@/components/ShopVote";
import { Button, Chip, EmptyState, FilterDrawer, FilterGroup, SearchField, ShopCard } from "@/components/ui";
import { appliedCount, clearFilters, filtersToQuery, toggleFilter, type FilterKey, type Filters } from "@/lib/filters";
import { plural } from "@/lib/labels";
import { active, type OptionLists } from "@/lib/options";
import type { ShopSummary } from "@/lib/shops";

type Group = { key: FilterKey; label: string; choices: { value: string; label: string }[] };

function groupsFor(options: OptionLists): Group[] {
  const toChoices = (list: { slug: string; label: string }[]) => list.map((o) => ({ value: o.slug, label: o.label }));
  return [
    { key: "roast", label: "Roast", choices: toChoices(active(options.roast_levels)) },
    { key: "prep", label: "Preparation", choices: toChoices(active(options.preparation_methods)) },
    // "Both" shops match either choice, so it isn't a choice of its own.
    { key: "origin", label: "Bean origin", choices: toChoices(active(options.bean_origins).filter((o) => o.slug !== "both")) },
    { key: "processing", label: "Processing", choices: toChoices(active(options.processing_methods)) },
    { key: "area", label: "Area", choices: toChoices(active(options.areas)) },
    {
      key: "type",
      label: "Roaster or maker",
      choices: [
        { value: "roaster", label: "Roaster" },
        { value: "maker", label: "Maker" },
      ],
    },
  ];
}

function isOn(f: Filters, key: FilterKey, value: string) {
  const v = f[key];
  return Array.isArray(v) ? v.includes(value) : v === value;
}

export function Discover({ filters: fromServer, options, results }: { filters: Filters; options: OptionLists; results: { shops: ShopSummary[]; total: number } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Chips change at once; the URL change brings the matching results.
  const [filters, setOptimistic] = useOptimistic(fromServer);
  const [query, setQuery] = useState(fromServer.q);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const latest = useRef(filters);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);

  // Back and forward change the URL under us: show its search text. A URL
  // change that came from typing here is skipped, so it can't undo newer keys.
  const [seenQ, setSeenQ] = useState(fromServer.q);
  const [sentQ, setSentQ] = useState(fromServer.q);
  if (fromServer.q !== seenQ) {
    setSeenQ(fromServer.q);
    if (fromServer.q !== sentQ) {
      setQuery(fromServer.q);
      setSentQ(fromServer.q);
    }
  }

  const groups = groupsFor(options);
  const applied = appliedCount(filters);
  const total = results.total;

  function go(next: Filters, mode: "push" | "replace" = "push") {
    startTransition(() => {
      setOptimistic(next);
      const qs = filtersToQuery(next);
      router[mode](qs ? `/?${qs}` : "/", { scroll: false });
    });
  }

  // P3: results follow the search box, 250 ms after typing stops. Typing
  // replaces the history entry so Back doesn't step through every letter.
  function onSearch(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const q = value.trim();
      if (q === latest.current.q) return;
      setSentQ(q);
      go({ ...latest.current, q, page: 1 }, "replace");
    }, 250);
  }
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const toggle = (key: FilterKey, value: string) => go(toggleFilter(filters, key, value));
  const clear = () => go(clearFilters(filters));
  const clearEverything = () => {
    clearTimeout(searchTimer.current);
    setQuery("");
    setSentQ("");
    go({ ...clearFilters(filters), q: "" });
  };

  const groupElements = groups.map((g) => (
    <FilterGroup key={g.key} label={g.label}>
      {g.key === "type" ? (
        <Chip selected={!filters.type} onToggle={() => filters.type && toggle("type", filters.type)}>
          All
        </Chip>
      ) : null}
      {g.choices.map((c) => (
        <Chip key={c.value} selected={isOn(filters, g.key, c.value)} onToggle={() => toggle(g.key, c.value)}>
          {c.label}
        </Chip>
      ))}
    </FilterGroup>
  ));

  const appliedChips = groups.flatMap((g) =>
    g.choices
      .filter((c) => isOn(filters, g.key, c.value))
      .map((c) => (
        <Chip key={`${g.key}-${c.value}`} onRemove={() => toggle(g.key, c.value)} removeLabel={`${c.label} (${g.label.toLowerCase()})`}>
          {c.label}
        </Chip>
      )),
  );

  const moreQuery = filtersToQuery({ ...fromServer, page: fromServer.page + 1 });

  return (
    <>
      <SearchField id="home-q" value={query} onChange={(e) => onSearch(e.target.value)} />

      <div className="filters-open">
        <Button variant="secondary" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
          {applied ? `Filters (${applied})` : "Filters"}
        </Button>
        {/* P1: one-tap area filter above the list on a phone. */}
        {groups
          .find((g) => g.key === "area")!
          .choices.map((c) => (
            <Chip key={c.value} selected={filters.area.includes(c.value)} onToggle={() => toggle("area", c.value)}>
              {c.label}
            </Chip>
          ))}
      </div>
      <div className="filters-panel">{groupElements}</div>

      <div className="status">
        <div className="applied">
          <p className="count" aria-live="polite">
            {plural(total, "shop", "shops")}
          </p>
          {appliedChips}
        </div>
        {applied ? (
          <Button variant="quiet" onClick={clear}>
            Clear all
          </Button>
        ) : null}
      </div>

      <div className="results" aria-busy={pending}>
        {results.shops.length ? (
          <>
            <div className="grid">
              {results.shops.map((s) => (
                <ShopCard key={s.id} shop={s.card} href={`/shops/${s.slug}`} vote={<ShopVote shopId={s.id} up={s.up} down={s.down} name={s.card.name} />} />
              ))}
            </div>
            {results.shops.length < total ? (
              <div className="more">
                <Link className="ca-btn ca-btn--secondary ca-btn--md" href={`/?${moreQuery}`} scroll={false} replace>
                  Load more
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            title={filters.q ? `No shops match “${filters.q}”` : "No shops match these filters"}
            actions={
              <>
                {applied || filters.q ? (
                  <Button variant="secondary" onClick={clearEverything}>
                    Clear all filters
                  </Button>
                ) : null}
                <Button href="/submit">Submit a shop</Button>
              </>
            }
          >
            Remove a filter, or submit a shop that is missing.
          </EmptyState>
        )}
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onClear={clear} resultCount={total}>
        {groupElements}
      </FilterDrawer>
    </>
  );
}
