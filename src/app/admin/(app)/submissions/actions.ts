"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";

export async function rejectSubmission(id: string, reason: string) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase
    .from("shop_submissions")
    .update({
      status: "rejected",
      rejection_reason: reason.trim().slice(0, 500) || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}
