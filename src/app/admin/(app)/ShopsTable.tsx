"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { DataTable, Field, SearchField, StatusTag, type DataTableColumn } from "@/components/ui";
import { plural, TYPE_LABEL, type ShopType } from "@/lib/labels";
import type { Option } from "@/lib/options";
import { setShopHidden } from "./shops/actions";

type Row = {
  id: string;
  slug: string;
  name: string;
  type: ShopType;
  is_hidden: boolean;
  score: number;
  area_id: string;
  updated_at: string;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function ShopsTable({ shops, areas }: { shops: Row[]; areas: Option[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [type, setType] = useState("");
  const [visibility, setVisibility] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const q = useDeferredValue(query.trim().toLowerCase());

  const areaLabel = useMemo(() => new Map(areas.map((a) => [a.id, a.label])), [areas]);

  const rows = useMemo(() => {
    const filtered = shops.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q)) &&
        (!area || s.area_id === area) &&
        (!type || s.type === type) &&
        (!visibility || (visibility === "hidden") === s.is_hidden),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sort.key === "score") return (a.score - b.score) * dir || a.name.localeCompare(b.name);
      if (sort.key === "updated_at") return a.updated_at.localeCompare(b.updated_at) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
  }, [shops, q, area, type, visibility, sort]);

  function onSort(key: string) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  }

  function toggleHidden(row: Row) {
    setPendingId(row.id);
    startTransition(async () => {
      await setShopHidden(row.id, !row.is_hidden);
      setPendingId(null);
      router.refresh();
    });
  }

  const columns: DataTableColumn<Row>[] = [
    { key: "name", label: "Name", sortable: true, render: (r) => <Link href={`/admin/shops/${r.id}`}>{r.name}</Link> },
    { key: "area", label: "Area", render: (r) => areaLabel.get(r.area_id) ?? "" },
    { key: "type", label: "Type", render: (r) => TYPE_LABEL[r.type] },
    { key: "status", label: "Status", render: (r) => <StatusTag kind={r.is_hidden ? "hidden" : "visible"} /> },
    { key: "score", label: "Score", sortable: true, align: "right", numeric: true, render: (r) => r.score },
    { key: "updated_at", label: "Updated", sortable: true, render: (r) => dateFormat.format(new Date(r.updated_at)) },
    {
      key: "action",
      label: "Visibility",
      render: (r) => (
        <button
          type="button"
          className="ca-btn ca-btn--secondary ca-btn--md adm-row-action"
          disabled={pendingId === r.id}
          onClick={() => toggleHidden(r)}
          aria-label={`${r.is_hidden ? "Unhide" : "Hide"} ${r.name}`}
        >
          {r.is_hidden ? "Unhide" : "Hide"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="adm-toolbar">
        <SearchField label="Search shops by name" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Field
          as="select"
          id="filter-area"
          label="Area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          options={[{ value: "", label: "All areas" }, ...areas.map((a) => ({ value: a.id, label: a.label }))]}
        />
        <Field
          as="select"
          id="filter-type"
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[{ value: "", label: "All types" }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))]}
        />
        <Field
          as="select"
          id="filter-visibility"
          label="Visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          options={[
            { value: "", label: "Visible and hidden" },
            { value: "visible", label: "Visible" },
            { value: "hidden", label: "Hidden" },
          ]}
        />
      </div>
      <p className="adm-count t-body-sm t-muted" aria-live="polite">
        {rows.length === shops.length ? plural(shops.length, "shop", "shops") : `${rows.length} of ${plural(shops.length, "shop", "shops")}`}
      </p>
      <DataTable
        caption="Shops"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sortKey={sort.key}
        sortDir={sort.dir}
        onSort={onSort}
        onRowClick={(r) => router.push(`/admin/shops/${r.id}`)}
        empty={shops.length ? "No shops match. Clear the search or a filter." : "No shops yet. Add the first one."}
      />
    </div>
  );
}
