import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { getOptionLists } from "@/lib/options-data";
import { RoasterForm } from "../RoasterForm";

export const metadata: Metadata = { title: "Edit roaster" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function EditRoasterPage({ params }: PageProps<"/admin/roasters/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: roaster }, options, own] = await Promise.all([
    supabase.from("roasters").select("*").eq("id", id).maybeSingle(),
    getOptionLists(),
    supabase.from("shop_roasters").select("shop:shops(id, name)").eq("roaster_id", id).eq("is_own", true),
  ]);
  if (!roaster) notFound();
  const ownShops = (own.data ?? []).flatMap((l) => (l.shop ? [l.shop] : [])).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <Link href="/admin/roasters" className="adm-back">
        <Icon name="arrowLeft" size={14} /> Roasters
      </Link>
      <div className="adm-page-head">
        <h1 className="t-heading">{roaster.name}</h1>
        <Link href={`/roasters/${roaster.slug}`} className="adm-inline-link" target="_blank">
          View public page <Icon name="externalLink" size={14} />
        </Link>
      </div>
      {ownShops.length ? (
        <p className="adm-notice">
          Own roastery of{" "}
          {ownShops.map((s, i) => (
            <span key={s.id}>
              {i ? ", " : null}
              <Link href={`/admin/shops/${s.id}`}>{s.name}</Link>
            </span>
          ))}
          . Change that from each shop&apos;s form.
        </p>
      ) : null}
      <RoasterForm
        id={roaster.id}
        processing={options.processing_methods}
        initial={{ name: roaster.name, city: roaster.city ?? "", processing: roaster.processing, website: roaster.website ?? "" }}
      />
    </div>
  );
}
