import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { RoastersTable, type RoasterRow } from "./RoastersTable";

export const metadata: Metadata = { title: "Roasters" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function AdminRoastersPage({ searchParams }: PageProps<"/admin/roasters">) {
  const { supabase } = await requireAdmin();
  const [{ saved }, roasters, links, shops] = await Promise.all([
    searchParams,
    supabase.from("roasters").select("id, slug, name, city").order("name"),
    supabase.from("shop_roasters").select("roaster_id, shop_id, is_own"),
    supabase.from("shops").select("id, name").order("name"),
  ]);
  if (roasters.error) throw roasters.error;

  const served = new Map<string, number>();
  const own = new Map<string, Set<string>>();
  for (const l of links.data ?? []) {
    served.set(l.roaster_id, (served.get(l.roaster_id) ?? 0) + 1);
    if (l.is_own) own.set(l.roaster_id, (own.get(l.roaster_id) ?? new Set()).add(l.shop_id));
  }
  const rows: RoasterRow[] = roasters.data.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city ?? "",
    ownShops: (shops.data ?? []).filter((s) => own.get(r.id)?.has(s.id)),
    served: served.get(r.id) ?? 0,
  }));
  const savedRow = typeof saved === "string" ? rows.find((r) => r.id === saved) : undefined;

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <h1 className="t-heading">Roasters</h1>
        <Button href="/admin/roasters/new">Add a roaster</Button>
      </div>
      <p className="t-body t-muted">
        Every roaster on the site. Shops link to the roasters whose beans they serve, and a shop that roasts can name one as its own roastery.
      </p>
      {savedRow ? (
        <p className="adm-notice" role="status">
          Saved <Link href={`/admin/roasters/${savedRow.id}`}>{savedRow.name}</Link>.
        </p>
      ) : null}
      <RoastersTable rows={rows} />
    </div>
  );
}
