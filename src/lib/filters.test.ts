import { describe, expect, it } from "vitest";
import { appliedCount, clearFilters, emptyFilters, filtersToQuery, parseFilters, toggleFilter } from "./filters";

describe("parseFilters", () => {
  it("reads lists, single choices, search and page", () => {
    const f = parseFilters({ q: " kopi ", roast: "light,medium", origin: "local", type: "brewer", area: ["canggu", "ubud"], page: "3" });
    expect(f).toEqual({ ...emptyFilters, q: "kopi", roast: ["light", "medium"], origin: "local", type: "brewer", area: ["canggu", "ubud"], page: 3 });
  });

  it("drops values that aren't slugs, duplicates and unknown types", () => {
    const f = parseFilters({ roast: "light,light,<script>,", type: "bakery", page: "-2", origin: "Lo cal" });
    expect(f.roast).toEqual(["light"]);
    expect(f.type).toBe("");
    expect(f.page).toBe(1);
    expect(f.origin).toBe("");
  });
});

describe("filtersToQuery", () => {
  it("round-trips through parseFilters, in a stable order with readable commas", () => {
    const f = { ...emptyFilters, area: ["ubud"], roast: ["light", "dark"], q: "slow bar" };
    const q = filtersToQuery(f);
    expect(q).toBe("q=slow+bar&roast=light,dark&area=ubud");
    expect(parseFilters(Object.fromEntries(new URLSearchParams(q)))).toEqual(f);
  });

  it("is empty with no filters", () => {
    expect(filtersToQuery(emptyFilters)).toBe("");
  });
});

describe("toggleFilter", () => {
  it("adds and removes values in multi-select filters and resets the page", () => {
    const on = toggleFilter({ ...emptyFilters, page: 4 }, "roast", "light");
    expect(on.roast).toEqual(["light"]);
    expect(on.page).toBe(1);
    expect(toggleFilter(on, "roast", "light").roast).toEqual([]);
  });

  it("replaces single-choice filters, and clears them when picked again", () => {
    const local = toggleFilter(emptyFilters, "origin", "local");
    expect(toggleFilter(local, "origin", "foreign").origin).toBe("foreign");
    expect(toggleFilter(local, "origin", "local").origin).toBe("");
  });

  it("turns Geisha on and off, in the URL as geisha=1", () => {
    const on = toggleFilter(emptyFilters, "geisha", "1");
    expect(on.geisha).toBe(true);
    expect(appliedCount(on)).toBe(1);
    expect(filtersToQuery(on)).toBe("geisha=1");
    expect(parseFilters({ geisha: "1" }).geisha).toBe(true);
    expect(parseFilters({ geisha: "yes" }).geisha).toBe(false);
    expect(toggleFilter(on, "geisha", "1").geisha).toBe(false);
  });

  it("clearing keeps the search text", () => {
    const f = { ...emptyFilters, q: "kopi", roast: ["dark"], type: "brewer" as const };
    expect(clearFilters(f)).toEqual({ ...emptyFilters, q: "kopi" });
    expect(appliedCount(f)).toBe(2);
  });
});

describe("slugify", async () => {
  const { slugify } = await import("./shop-schema");
  it("matches the database's slugs", () => {
    expect(slugify("Kopi Café & Roastery!")).toBe("kopi-cafe-roastery");
    expect(slugify("  --Sample  Bar-- ")).toBe("sample-bar");
  });
});
