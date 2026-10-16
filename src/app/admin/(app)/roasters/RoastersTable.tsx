"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui";

export type RoasterRow = { id: string; name: string; city: string; ownShop: { id: string; name: string } | null; served: number };

export function RoastersTable({ rows }: { rows: RoasterRow[] }) {
  const router = useRouter();
  const columns: DataTableColumn<RoasterRow>[] = [
    { key: "name", label: "Name", render: (r) => <Link href={`/admin/roasters/${r.id}`}>{r.name}</Link> },
    { key: "city", label: "City" },
    { key: "own", label: "Own shop", render: (r) => (r.ownShop ? <Link href={`/admin/shops/${r.ownShop.id}`}>{r.ownShop.name}</Link> : "None") },
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
