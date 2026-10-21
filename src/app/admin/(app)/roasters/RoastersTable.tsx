"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";

export type RoasterRow = { id: string; name: string; city: string; ownShops: { id: string; name: string }[]; served: number };

export function RoastersTable({ rows }: { rows: RoasterRow[] }) {
  const router = useRouter();
  const columns: DataTableColumn<RoasterRow>[] = [
    { key: "name", label: "Name", render: (r) => <Link href={`/admin/roasters/${r.id}`}>{r.name}</Link> },
    { key: "city", label: "City" },
    {
      key: "own",
      label: "Roastery for",
      render: (r) =>
        r.ownShops.length
          ? r.ownShops.map((s, i) => (
              <span key={s.id}>
                {i ? ", " : null}
                <Link href={`/admin/shops/${s.id}`}>{s.name}</Link>
              </span>
            ))
          : "None",
    },
    { key: "served", label: "Shops serving", align: "right", numeric: true, render: (r) => r.served },
  ];
  return (
    <DataTable
      caption="Roasters"
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/admin/roasters/${r.id}`)}
      empty="No roasters yet. Add the first one."
    />
  );
}
