import type { Metadata } from "next";
import Link from "next/link";
import { Button, EmptyState, StatusTag } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { RejectButton } from "./RejectButton";

export const metadata: Metadata = { title: "Submissions" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" });

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function SubmissionsPage() {
  const { supabase } = await requireAdmin();
  const [pending, reviewed] = await Promise.all([
    supabase.from("shop_submissions").select("*").eq("status", "pending").order("created_at"),
    supabase.from("shop_submissions").select("id, name, status, rejection_reason, reviewed_at, shop_id").neq("status", "pending").order("reviewed_at", { ascending: false }).limit(20),
  ]);
  if (pending.error) throw pending.error;

  return (
    <div className="adm-stack">
      <div className="adm-page-head">
        <h1 className="t-heading">Submissions</h1>
      </div>
      <p className="t-body t-muted">Shops visitors sent in. Nothing here is public until you approve it.</p>

      {pending.data.length ? (
        <ul className="adm-cards" aria-label="Waiting for review, oldest first">
          {pending.data.map((s) => (
            <li key={s.id} className="adm-card">
              <div className="adm-page-head__title">
                <h2 className="t-card-title">{s.name}</h2>
                <StatusTag kind="pending" />
              </div>
              <dl className="adm-meta">
                <dt>Address or area</dt>
                <dd>{s.address ?? s.area_text}</dd>
                <dt>Maps link</dt>
                <dd>
                  {s.maps_url ? (
                    <a href={s.maps_url} target="_blank" rel="noreferrer">
                      {s.maps_url}
                    </a>
                  ) : (
                    "None"
                  )}
                </dd>
                <dt>Notes</dt>
                <dd>{s.notes ?? "None"}</dd>
                <dt>Email</dt>
                <dd>{s.submitter_email ?? "None"}</dd>
                <dt>Sent</dt>
                <dd>{when.format(new Date(s.created_at))}</dd>
              </dl>
              <div className="adm-actions">
                <Button href={`/admin/shops/new?submission=${s.id}`} aria-label={`Approve ${s.name}`}>
                  Approve
                </Button>
                <RejectButton id={s.id} name={s.name} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No submissions waiting">New submissions from visitors will appear here.</EmptyState>
      )}

      {reviewed.data?.length ? (
        <section className="adm-stack" aria-labelledby="reviewed">
          <h2 id="reviewed" className="t-title">
            Recently reviewed
          </h2>
          <ul className="adm-cards">
            {reviewed.data.map((s) => (
              <li key={s.id} className="adm-card">
                <p>
                  <strong>{s.name}</strong> · {s.status === "approved" ? "Approved" : "Rejected"}
                  {s.reviewed_at ? ` ${when.format(new Date(s.reviewed_at))}` : ""}
                </p>
                {s.status === "approved" && s.shop_id ? <Link href={`/admin/shops/${s.shop_id}`}>Open the shop</Link> : null}
                {s.rejection_reason ? <p className="t-body-sm t-muted">Reason: {s.rejection_reason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
