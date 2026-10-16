import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

// Admin pages render per request for the signed-in admin.
export const instant = false;

export default async function SignInPage({ searchParams }: PageProps<"/admin/sign-in">) {
  const { reason } = await searchParams;
  return (
    <main className="adm-signin">
      <div className="adm-signin__card">
        <p className="t-heading">{brand.name}</p>
        <h1 className="t-title">Admin sign in</h1>
        <SignInForm notice={reason === "no-access" ? "This account doesn't have admin access. Ask the owner to invite you." : undefined} />
      </div>
    </main>
  );
}
