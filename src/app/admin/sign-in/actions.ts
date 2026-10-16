"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";

export type SignInState = { step: "email" | "code"; email: string; error?: string };

/** One action for both steps; the submit button's "intent" says which. */
export async function signInStep(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const intent = formData.get("intent");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (intent === "restart") return { step: "email", email };

  if (intent === "verify") {
    const token = String(formData.get("code") ?? "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(token)) {
      return { step: "code", email, error: "Enter the 6-digit code from your email." };
    }
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      return { step: "code", email, error: "That code is wrong or has expired. Check the latest email, or send a new code." };
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      return { step: "email", email: "", error: "This account doesn't have admin access. Ask the owner to invite you." };
    }
    redirect("/admin");
  }

  if (!z.email().safeParse(email).success) {
    return { step: "email", email, error: "Enter your email address, like name@example.com." };
  }
  const supabase = await createSessionClient();
  // shouldCreateUser: false, and sign-up is off in Supabase, so only invited
  // admins receive a code. The result is ignored on purpose: the next screen
  // reads the same for every address, so nobody can probe which are admins.
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return { step: "code", email };
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/sign-in");
}
