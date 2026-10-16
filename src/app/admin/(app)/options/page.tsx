import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { getOptionLists } from "@/lib/options-data";
import { OPTION_LISTS } from "@/lib/options";
import { OptionsEditor } from "./OptionsEditor";

export const metadata: Metadata = { title: "Option lists" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function OptionsPage({ searchParams }: PageProps<"/admin/options">) {
  await requireAdmin();
  const [{ list: requested }, lists] = await Promise.all([searchParams, getOptionLists()]);
  const current = OPTION_LISTS.find((l) => l.key === requested) ?? OPTION_LISTS[0];

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="t-heading">Option lists</h1>
      </div>
      <p className="t-body t-muted adm-count">
        The values shops can have, and visitors can filter by. Changes show on the site at once. A value that shops use can&apos;t be deleted; retire it to hide it from forms and filters
        while existing shops keep it.
      </p>
      <nav className="adm-tabs" aria-label="Option lists">
        {OPTION_LISTS.map((l) => (
          <Link key={l.key} href={`/admin/options?list=${l.key}`} className="adm-tabs__link" aria-current={l.key === current.key ? "page" : undefined}>
            {l.title}
          </Link>
        ))}
      </nav>
      <OptionsEditor key={current.key} list={current.key} singular={current.singular} options={lists[current.key]} />
    </div>
  );
}
