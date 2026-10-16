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
  const [{ data: roaster }, options] = await Promise.all([supabase.from("roasters").select("*").eq("id", id).maybeSingle(), getOptionLists()]);
  if (!roaster) notFound();
  const { data: shop } = roaster.shop_id ? await supabase.from("shops").select("id, name").eq("id", roaster.shop_id).maybeSingle() : { data: null };

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
      <RoasterForm
        id={roaster.id}
        linkedShop={shop}
        processing={options.processing_methods}
        initial={{ name: roaster.name, city: roaster.city ?? "", processing: roaster.processing, website: roaster.website ?? "" }}
      />
    </div>
  );
}
