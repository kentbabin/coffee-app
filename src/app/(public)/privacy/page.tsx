import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy", description: `What ${brand.name} stores about visitors, and why.` };

export default function PrivacyPage() {
  return (
    <div className="narrow">
      <h1 className="t-display-lg">Privacy</h1>
      <div className="prose t-body">
        <p>You don&apos;t need an account to use {brand.name}, and there isn&apos;t one to make.</p>
        <h2 className="t-title">When you vote</h2>
        <p>
          Your browser keeps a random code so you can vote once per shop and see your own votes highlighted. The server stores that code with your vote, plus a scrambled
          (salted and hashed) version of your IP address to limit repeat voting. Your actual IP address is never stored.
        </p>
        <h2 className="t-title">When you submit a shop</h2>
        <p>
          The details you send are stored for review. If you give an email address, only the admins who review submissions can see it, and it is used only to ask about the
          shop you sent.
        </p>
      </div>
    </div>
  );
}
