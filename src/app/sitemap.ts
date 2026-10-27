import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";
import { getSitemapEntries } from "@/lib/shops";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { shops, roasters } = await getSitemapEntries();
  const url = (path: string) => `${brand.siteUrl}${path}`;
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/roasters"), changeFrequency: "weekly", priority: 0.7 },
    { url: url("/submit"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/about"), changeFrequency: "yearly", priority: 0.3 },
    ...shops.map((s) => ({ url: url(`/shops/${s.slug}`), lastModified: s.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...roasters.map((r) => ({ url: url(`/roasters/${r.slug}`), lastModified: r.updated_at, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
