// Filter state for the discover page, kept in the URL so a filtered view can
// be shared and the back button works: ?q=kopi&roast=light,medium&area=canggu

export const PAGE_SIZE = 24;

export type Filters = {
  q: string;
  roast: string[];
  prep: string[];
  /** Single choice: "local" or "foreign" ("both" shops match either). */
  origin: string;
  processing: string[];
  /** Single choice: "roaster" or "maker" ("both" shops match either). */
  type: "" | "roaster" | "maker";
  area: string[];
  /** How many pages of 24 are shown ("Load more"). */
  page: number;
};

export const emptyFilters: Filters = { q: "", roast: [], prep: [], origin: "", processing: [], type: "", area: [], page: 1 };

export type FilterKey = "roast" | "prep" | "origin" | "processing" | "type" | "area";

type Params = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function list(v: string | string[] | undefined) {
  const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
  return Array.from(new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => SLUG.test(s)))).slice(0, 20);
}

export function parseFilters(params: Params): Filters {
  const type = first(params.type);
  const origin = first(params.origin).toLowerCase();
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    roast: list(params.roast),
    prep: list(params.prep),
    origin: SLUG.test(origin) ? origin : "",
    processing: list(params.processing),
    type: type === "roaster" || type === "maker" ? type : "",
    area: list(params.area),
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 50) : 1,
  };
}

/** The query string for a set of filters, in a fixed order, without empty values. */
export function filtersToQuery(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.roast.length) p.set("roast", f.roast.join(","));
  if (f.prep.length) p.set("prep", f.prep.join(","));
  if (f.origin) p.set("origin", f.origin);
  if (f.processing.length) p.set("processing", f.processing.join(","));
  if (f.type) p.set("type", f.type);
  if (f.area.length) p.set("area", f.area.join(","));
  if (f.page > 1) p.set("page", String(f.page));
  // Commas read better than %2C in a shared link.
  return p.toString().replaceAll("%2C", ",");
}

/** Toggles one value. Single-choice filters replace their value; picking it again clears it. */
export function toggleFilter(f: Filters, key: FilterKey, value: string): Filters {
  const next = { ...f, page: 1 };
  if (key === "origin") next.origin = f.origin === value ? "" : value;
  else if (key === "type") next.type = f.type === value ? "" : (value as Filters["type"]);
  else next[key] = f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value];
  return next;
}

export function clearFilters(f: Filters): Filters {
  return { ...emptyFilters, q: f.q };
}

export function appliedCount(f: Filters) {
  return f.roast.length + f.prep.length + (f.origin ? 1 : 0) + f.processing.length + (f.type ? 1 : 0) + f.area.length;
}
