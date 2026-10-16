import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { plural } from "@/lib/labels";
import { getOptionLists } from "@/lib/options";
import { ShopsTable } from "./ShopsTable";

export const metadata: Metadata = { title: "Shops" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function AdminShopsPage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const [{ saved }, options, shops, pending] = await Promise.all([
    searchParams,
    getOptionLists(),
    supabase.from("shops").select("id, slug, name, type, is_hidden, score, area_id, updated_at").order("name"),
    supabase.from("shop_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (shops.error) throw shops.error;

  const pendingCount = pending.count ?? 0;
  const savedShop = typeof saved === "string" ? shops.data.find((s) => s.id === saved) : undefined;

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <h1 className="t-heading">Shops</h1>
        <Button href="/admin/shops/new">Add a shop</Button>
      </div>
      {savedShop ? (
        <p className="adm-notice" role="status">
          Saved <Link href={`/admin/shops/${savedShop.id}`}>{savedShop.name}</Link>.{" "}
          {savedShop.is_hidden ? "It is hidden from the public." : <Link href={`/shops/${savedShop.slug}`}>View its public page</Link>}
        </p>
      ) : null}
      {pendingCount ? (
        <p className="adm-notice">
          {plural(pendingCount, "submission is", "submissions are")} waiting for review. <Link href="/admin/submissions">Review submissions</Link>
        </p>
      ) : null}
      <ShopsTable shops={shops.data} areas={options.areas} />
    </div>
  );
}
