import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAdmin } from "@/lib/admin/session";

/** The shop being edited, shared by the layout and its pages within one request. */
export const getAdminShop = cache(async (id: string) => {
  const { supabase } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await supabase.from("shops").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
});
