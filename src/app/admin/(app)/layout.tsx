import Link from "next/link";
import { brand } from "@/lib/brand";
import { requireAdmin } from "@/lib/admin/session";
import { signOut } from "../sign-in/actions";
import { AdminNav } from "./AdminNav";

export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { supabase, email } = await requireAdmin();
  const { count } = await supabase.from("shop_submissions").select("id", { count: "exact", head: true }).eq("status", "pending");

  return (
    <div className="adm">
      <header className="adm-head">
        <div className="wrap adm-head__in">
          <Link href="/admin" className="adm-brand">
            {brand.name} <span className="adm-brand__tag">Admin</span>
          </Link>
          <AdminNav pending={count ?? 0} />
          <div className="adm-account">
            <span className="t-body-sm t-muted">{email}</span>
            <form action={signOut}>
              <button type="submit" className="ca-btn ca-btn--quiet ca-btn--md">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="wrap adm-main">{children}</main>
    </div>
  );
}
