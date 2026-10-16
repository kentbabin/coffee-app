import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { getOptionLists } from "@/lib/options-data";
import { RoasterForm } from "../RoasterForm";

export const metadata: Metadata = { title: "Add a roaster" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function NewRoasterPage() {
  await requireAdmin();
  const options = await getOptionLists();
  return (
    <div>
      <Link href="/admin/roasters" className="adm-back">
        <Icon name="arrowLeft" size={14} /> Roasters
      </Link>
      <div className="adm-page-head">
        <h1 className="t-heading">Add a roaster</h1>
      </div>
      <p className="t-body t-muted adm-count">For a roaster without a shop of its own. A shop that roasts is added as a shop, as Roaster and brewer.</p>
      <RoasterForm initial={{ name: "", city: "", processing: [], website: "" }} processing={options.processing_methods} />
    </div>
  );
}
