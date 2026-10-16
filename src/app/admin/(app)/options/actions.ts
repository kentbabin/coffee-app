"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";
import { OPTION_LISTS, type OptionListKey } from "@/lib/options";

type Result = { ok: true } | { ok: false; error: string };

// All five lists share a shape (areas add a region), so address them through one table type.
function table(list: OptionListKey) {
  if (!OPTION_LISTS.some((l) => l.key === list)) throw new Error(`Unknown option list ${list}`);
  return list as "areas";
}

function done(): Result {
  // Labels appear on shop cards and in filters, so both caches go.
  updateTag("options");
  updateTag("shops");
  return { ok: true };
}

export async function addOption(list: OptionListKey, label: string, region?: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const name = label.trim();
  if (!name) return { ok: false, error: "Enter a name for the new value." };
  const { data: last } = await supabase.from(table(list)).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const row: { label: string; sort_order: number; region?: string } = { label: name, sort_order: (last?.sort_order ?? 0) + 1 };
  if (list === "areas") row.region = region?.trim() || "Bali";
  const { error } = await supabase.from(table(list)).insert(row as never);
  if (error) {
    if (error.code === "23505") return { ok: false, error: `"${name}" is already in the list.` };
    return { ok: false, error: error.message };
  }
  return done();
}

export async function updateOption(list: OptionListKey, id: string, changes: { label?: string; region?: string; is_retired?: boolean }): Promise<Result> {
  const { supabase } = await requireAdmin();
  const patch: { label?: string; region?: string; is_retired?: boolean } = {};
  if (changes.label !== undefined) {
    if (!changes.label.trim()) return { ok: false, error: "Enter a name, or retire the value instead." };
    patch.label = changes.label.trim();
  }
  if (changes.region !== undefined && list === "areas") patch.region = changes.region.trim() || "Bali";
  if (changes.is_retired !== undefined) patch.is_retired = changes.is_retired;
  const { error } = await supabase.from(table(list)).update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return done();
}

export async function moveOption(list: OptionListKey, id: string, direction: -1 | 1): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from(table(list)).select("id").order("sort_order").order("label");
  if (error) return { ok: false, error: error.message };
  const ids = data.map((r) => r.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return { ok: true };
  [ids[from], ids[to]] = [ids[to], ids[from]];
  // Renumber 1..n so gaps and ties from earlier edits disappear.
  const results = await Promise.all(ids.map((rowId, i) => supabase.from(table(list)).update({ sort_order: i + 1 }).eq("id", rowId)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };
  return done();
}

export async function deleteOption(list: OptionListKey, id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from(table(list)).delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "Shops use this value, so it can't be deleted. Retire it instead: it stays on those shops but leaves forms and filters." };
    return { ok: false, error: error.message };
  }
  return done();
}
