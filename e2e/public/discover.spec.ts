import { expect, test, type Page } from "@playwright/test";
import { serviceClient } from "../helpers";

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

const count = (page: Page) => page.locator(".count");

test("P1: shops are ranked by score, with a one-tap area filter", async ({ page }) => {
  await open(page, "/");
  await expect(page.getByRole("heading", { name: "For Serious Coffee People" })).toBeVisible();
  const first = page.getByRole("article").first();
  await expect(first).toContainText("Sample Roastery");

  await page.locator(".filters-open").getByRole("button", { name: "Ubud" }).click();
  await expect(page).toHaveURL(/area=ubud/);
  for (const card of await page.getByRole("article").all()) await expect(card).toContainText("Ubud");
});

test("P2: filters combine, live in the URL, and the back button undoes them", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("button", { name: "Filters" }).click();
  const drawer = page.getByRole("dialog", { name: "Filters" });
  await drawer.getByRole("group", { name: "Roast" }).getByRole("button", { name: "Light" }).click();
  await expect(page).toHaveURL(/roast=light/);
  await drawer.getByRole("group", { name: "Bean origin" }).getByRole("button", { name: "Local beans" }).click();
  await expect(page).toHaveURL(/roast=light&origin=local/);
  await drawer.getByRole("button", { name: /^Show \d+ shops?$/ }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByRole("button", { name: "Filters (2)" })).toBeFocused();

  // Light roast AND (local or both).
  for (const card of await page.getByRole("article").all()) {
    await expect(card.getByRole("img", { name: /Roast: .*light/ })).toBeVisible();
    await expect(card).toContainText(/Local beans|Local and imported beans/);
  }
  await expect(page.getByRole("button", { name: "Remove filter Light (roast)" })).toBeVisible();

  // A shared link opens the same view.
  const shared = page.url();
  await open(page, shared);
  await expect(page.getByRole("button", { name: "Filters (2)" })).toBeVisible();

  await page.getByRole("button", { name: "Remove filter Local beans (bean origin)" }).click();
  await expect(page).not.toHaveURL(/origin=/);
  await page.goBack();
  await expect(page).toHaveURL(/origin=local/);
  await expect(page.getByRole("button", { name: "Filters (2)" })).toBeVisible();
});

test("P3: search tolerates typos and shows an empty state with next steps", async ({ page }) => {
  await open(page, "/");
  await page.getByRole("searchbox", { name: "Search" }).fill("sampel slow");
  await expect(page).toHaveURL(/q=sampel\+slow/);
  await expect(page.getByRole("article").first()).toContainText("Sample Slow Bar");

  await page.getByRole("searchbox", { name: "Search" }).fill("zzzzzz");
  await expect(page.getByRole("heading", { name: "No shops match “zzzzzz”" })).toBeVisible();
  await expect(count(page)).toHaveText("0 shops");
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  await expect(page.getByRole("article").first()).toBeVisible();
});

test("P4/P5: the shop page shows its details, and a vote counts once per device", async ({ page }) => {
  await open(page, "/shops/sample-espresso-corner");
  await expect(page).toHaveTitle(/Sample Espresso Corner, Sanur/);
  await expect(page.getByRole("heading", { name: "Sample Espresso Corner", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sample Dark Room" })).toHaveAttribute("href", "/roasters/sample-dark-room");
  await expect(page.getByRole("link", { name: /Open in Google Maps/ })).toBeVisible();
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld["@type"]).toBe("CafeOrCoffeeShop");

  const up = page.getByRole("button", { name: /^Thumbs up, \d+$/ });
  const before = Number((await up.getAttribute("aria-label"))!.match(/\d+$/)![0]);
  await up.click();
  await expect(page.getByRole("button", { name: `Thumbs up, ${before + 1}` })).toHaveAttribute("aria-pressed", "true");
  // Buttons are disabled while the vote is in flight.
  await expect(page.getByRole("button", { name: `Thumbs up, ${before + 1}` })).toBeEnabled();

  // Remembered on this device after a reload, and counted from the server.
  await open(page, "/shops/sample-espresso-corner");
  const voted = page.getByRole("button", { name: `Thumbs up, ${before + 1}` });
  await expect(voted).toHaveAttribute("aria-pressed", "true");

  // Tapping again removes it.
  await voted.click();
  await expect(page.getByRole("button", { name: `Thumbs up, ${before}` })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: `Thumbs up, ${before}` })).toBeEnabled();
});

test("P4: a hidden shop shows the not-found page", async ({ page }) => {
  await open(page, "/shops/sample-closed-cafe");
  await expect(page.getByRole("heading", { name: "This page isn't here" })).toBeVisible();
  await expect(page.getByText("Sample Closed Cafe")).toHaveCount(0);
});

test("P7: roasters list and detail", async ({ page }) => {
  await open(page, "/roasters");
  const row = page.getByRole("listitem").filter({ hasText: "Highland Sample Roasters" });
  await expect(row).toContainText("Kintamani");
  await row.getByRole("link", { name: "Highland Sample Roasters" }).click();
  await expect(page.getByRole("heading", { name: "Highland Sample Roasters", level: 1 })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Sample Coffee Bar" })).toBeVisible();
});

test("P6: a submission is checked, sent and lands in the queue", async ({ page }) => {
  const name = `E2E Visitor Cafe ${Date.now().toString(36)}`;
  // The bot-check widget keeps the network busy, so wait for load only.
  await page.goto("/submit");
  await page.waitForLoadState("load");
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Enter the shop's name.")).toBeVisible();

  await page.getByRole("textbox", { name: /^Shop name/ }).fill(name);
  await page.getByRole("textbox", { name: /^Google Maps link/ }).fill("https://example.com/cafe");
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("This isn't a Google Maps link.")).toBeVisible();
  await page.getByRole("textbox", { name: /^Google Maps link/ }).fill("https://maps.app.goo.gl/AbCdEf123");
  await page.getByRole("textbox", { name: /^Why it's good/ }).fill("Light roast pour over.");
  // Cloudflare's test key passes on its own; wait for its token.
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15_000 });
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByRole("heading", { name: "Thanks. We review every submission." })).toBeVisible();

  const db = serviceClient();
  const { data } = await db.from("shop_submissions").select("id, status").eq("name", name).single();
  expect(data?.status).toBe("pending");
  await db.from("shop_submissions").delete().eq("name", name);
  await db.from("rate_limit_events").delete().eq("bucket", "submit");
});

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

  test("filters sit behind a Filters button, with the areas beside it", async ({ page }) => {
    await open(page, "/");
    const button = page.getByRole("button", { name: /^Filters/ });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("group", { name: "Roast" })).toBeHidden();
    await expect(page.locator(".filters-open").getByRole("button", { name: "Canggu" })).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const panel = page.locator("#filters-panel");
    await panel.getByRole("group", { name: "Roaster or brewer" }).getByRole("button", { name: "Roaster and brewer" }).click();
    await expect(page).toHaveURL(/type=both/);
    for (const card of await page.getByRole("article").all()) await expect(card).toContainText("Roaster and brewer");
    // Area is in the row, not repeated in the panel.
    await expect(panel.getByRole("group", { name: "Area" })).toHaveCount(0);

    await button.click();
    await expect(panel).toBeHidden();
  });
});
