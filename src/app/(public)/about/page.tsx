import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "About", description: `What ${brand.name} is, and how its shops are chosen.` };

export default function AboutPage() {
  return (
    <div className="narrow">
      <h1 className="t-display-lg">About</h1>
      <div className="prose t-body">
        <p>{brand.name} is a curated list of the best specialty coffee shops in southern Bali. We started it because there isn&apos;t an authoritative list online. Serious coffee people are stuck with stagnant &ldquo;Top X coffee shops in Bali&rdquo; lists that prioritize popularity over quality.</p>
        <p>To make the list, a coffee shop needs to meet the following criteria:</p>
        <ul>
          <li>Feature a selection of light, omni, or medium roasts</li>
          <li>Offer manual brewing options</li>
          <li>Roast its own coffee beans or source from top roasters</li>
          <li>Have an owner and/or barista team with strong knowledge of coffee</li>
        </ul>
        <p>What {brand.name} is not is a comprehensive list of coffee shops in Bali or a place to find coffee shops making lattes or flat whites.</p>
        <p>
          Know a shop that belongs here? <Link href="/submit">Submit a shop</Link>.
        </p>
      </div>
    </div>
  );
}
