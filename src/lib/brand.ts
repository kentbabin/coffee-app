// Every brand string in one place (scope, open question 8). "Coffee App" is a
// working name; change it here when the real name and domain are settled.
export const brand = {
  name: "Coffee App",
  tagline: "For Serious Coffee People",
  description: "Find the best specialty coffee in Bali, filtered by roast, preparation and bean origin.",
  footer: "Shops are curated by an admin and ranked by visitors’ thumbs up and down.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
