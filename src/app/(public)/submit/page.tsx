import type { Metadata } from "next";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = {
  title: "Submit a shop",
  description: "Know a specialty coffee shop or roaster that's missing? Send it in for review.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <div className="narrow">
      <h1 className="t-display-lg">Submit a shop</h1>
      <p className="t-body t-muted">Know a shop or roaster that&apos;s missing? Send its name and where it is. Every submission is reviewed before it appears.</p>
      <SubmitForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
    </div>
  );
}
