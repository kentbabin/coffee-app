import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { getOptionLists } from "@/lib/options-data";
import { emptyShopForm, type ShopFormValues } from "@/lib/shop-schema";
import { ShopForm } from "../ShopForm";

export const metadata: Metadata = { title: "Add a shop" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function NewShopPage({ searchParams }: PageProps<"/admin/shops/new">) {
  const { supabase } = await requireAdmin();
  const { submission: submissionId } = await searchParams;
  const [options, roasters, submission] = await Promise.all([
    getOptionLists(),
    supabase.from("roasters").select("id, name, city").order("name"),
    typeof submissionId === "string"
      ? supabase.from("shop_submissions").select("*").eq("id", submissionId).eq("status", "pending").maybeSingle()
      : Promise.resolve(null),
  ]);
  if (roasters.error) throw roasters.error;

  const sub = submission?.data ?? null;
  let initial: ShopFormValues = emptyShopForm;
  if (sub) {
    initial = { ...emptyShopForm, name: sub.name, address: sub.address ?? "", maps_url: sub.maps_url };
  }

  return (
    <div>
      <Link href={sub ? "/admin/submissions" : "/admin"} className="adm-back">
        <Icon name="arrowLeft" size={14} /> {sub ? "Submissions" : "Shops"}
      </Link>
      <div className="adm-page-head">
        <h1 className="t-heading">{sub ? "Approve a submission" : "Add a shop"}</h1>
      </div>
      {sub ? (
        <div className="adm-section adm-submission-context">
          <h2 className="t-title">What the visitor sent</h2>
          <dl className="adm-meta">
            <dt>Name</dt>
            <dd>{sub.name}</dd>
            <dt>Maps link</dt>
            <dd>
              <a href={sub.maps_url} target="_blank" rel="noreferrer">
                {sub.maps_url}
              </a>
            </dd>
            {sub.notes ? (
              <>
                <dt>Notes</dt>
                <dd>{sub.notes}</dd>
              </>
            ) : null}
          </dl>
          <p className="t-body-sm t-muted">Open the Maps link for the address and area, fill in the rest, and save to publish it. Saving marks the submission approved.</p>
        </div>
      ) : typeof submissionId === "string" ? (
        <p className="adm-error">That submission was already reviewed, or no longer exists. You can still add the shop by hand.</p>
      ) : null}
      <ShopForm options={options} roasters={roasters.data} initial={initial} mode={{ kind: "new", submissionId: sub?.id }} />
    </div>
  );
}
