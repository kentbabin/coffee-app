import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { TYPE_LABEL, type ShopType } from "@/lib/labels";
import { getOptionLists } from "@/lib/options-data";
import { labeller } from "@/lib/options";
import type { Json } from "@/lib/supabase/database.types";
import { getAdminShop } from "../shop";

// Admin pages render per request for the signed-in admin.
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/shops/[id]/history">): Promise<Metadata> {
  const shop = await getAdminShop((await params).id);
  return { title: `History of ${shop.name}` };
}

const ACTION_LABEL = { create: "Created", update: "Edited", hide: "Hidden", unhide: "Unhidden" } as const;

// Field order and names as the form shows them. Anything else is not shown.
const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  slug: "Slug",
  address: "Address",
  area_id: "Area",
  maps_url: "Google Maps link",
  lat: "Map pin latitude",
  lng: "Map pin longitude",
  type: "Type",
  roaster_ids: "Roasters served",
  roast_levels: "Roast levels",
  preparations: "Preparation",
  bean_origin: "Bean origin",
  processing: "Processing",
  serves_geisha: "Geisha beans",
  description: "Description",
  website: "Website",
  instagram: "Instagram",
  is_hidden: "Visibility",
  cover_image_url: "Cover image",
};

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" });

export default async function ShopHistoryPage({ params }: PageProps<"/admin/shops/[id]/history">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [shop, options, revisions, admins, roasters] = await Promise.all([
    getAdminShop(id),
    getOptionLists(),
    supabase.from("shop_revisions").select("id, action, changed_by, changed_at, changes").eq("shop_id", id).order("changed_at", { ascending: false }).order("id", { ascending: false }),
    supabase.from("admins").select("user_id, email"),
    supabase.from("roasters").select("id, name"),
  ]);
  if (revisions.error) throw revisions.error;

  const who = new Map((admins.data ?? []).map((a) => [a.user_id, a.email]));
  const roasterName = new Map((roasters.data ?? []).map((r) => [r.id, r.name]));
  const area = new Map(options.areas.map((a) => [a.id, a.label]));
  const labels = {
    roast_levels: labeller(options.roast_levels),
    preparations: labeller(options.preparation_methods),
    processing: labeller(options.processing_methods),
    bean_origin: labeller(options.bean_origins),
  };

  function show(field: string, value: Json | undefined): string {
    if (value === null || value === undefined || value === "") return "None";
    if (field === "area_id") return area.get(String(value)) ?? "Unknown area";
    if (field === "type") return TYPE_LABEL[value as ShopType] ?? String(value);
    if (field === "is_hidden") return value ? "Hidden" : "Visible";
    if (field === "serves_geisha") return value ? "On offer" : "Not on offer";
    if (field === "bean_origin") return labels.bean_origin(String(value));
    if (field === "roaster_ids" && Array.isArray(value)) return value.map((v) => roasterName.get(String(v)) ?? "Removed roaster").join(", ") || "None";
    if ((field === "roast_levels" || field === "preparations" || field === "processing") && Array.isArray(value)) {
      return value.map((v) => labels[field](String(v))).join(", ") || "None";
    }
    return Array.isArray(value) ? value.join(", ") : String(value);
  }

  if (!revisions.data.length) {
    return <EmptyState title="No history yet">Changes to {shop.name} will be listed here.</EmptyState>;
  }

  return (
    <ol className="adm-history" aria-label={`Changes to ${shop.name}, newest first`}>
      {revisions.data.map((rev) => {
        const changes = (rev.changes ?? {}) as Record<string, { from: Json; to: Json }>;
        const fields = Object.keys(FIELD_LABEL).filter((f) => f in changes);
        return (
          <li key={rev.id} className="adm-rev">
            <div className="adm-rev__head">
              <strong>{ACTION_LABEL[rev.action]}</strong>
              <span className="t-body-sm t-muted">
                {when.format(new Date(rev.changed_at))} · {rev.changed_by ? (who.get(rev.changed_by) ?? "A former admin") : "Seed data"}
              </span>
            </div>
            {fields.length ? (
              <dl className="adm-diff">
                {fields.map((f) => (
                  <div key={f} style={{ display: "contents" }}>
                    <dt>{FIELD_LABEL[f]}</dt>
                    <dd>
                      <span className="visually-hidden">From </span>
                      <del>{show(f, changes[f].from)}</del>
                      <span aria-hidden="true"> → </span>
                      <span className="visually-hidden"> to </span>
                      <ins>{show(f, changes[f].to)}</ins>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : rev.action === "create" ? (
              <p className="t-body-sm t-muted">Added with the details at the time.</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
