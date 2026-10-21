import { expect, test, type Page } from "@playwright/test";
import { clearMailbox, messagesTo } from "../helpers";

const unique = () => `E2E Cafe ${Date.now().toString(36)}`;
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const MAPS = "https://www.google.com/maps/place/X/@-8.65,115.13,17z/data=!3d-8.6512!4d115.1301";

/** Opens a page and waits for React to hydrate, so typing reaches the form's state. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

async function fillNewShop(page: Page, name: string) {
  await open(page, "/admin/shops/new");
  await page.getByRole("textbox", { name: /^Name/ }).fill(name);
  // The slug follows the name on a new shop.
  await expect(page.getByRole("textbox", { name: "Slug" })).toHaveValue(slugOf(name));
  await page.getByRole("textbox", { name: "Address" }).fill("Jl. Pantai Batu Bolong 1");
  await page.getByRole("combobox", { name: "Area" }).selectOption({ label: "Canggu" });
  await page.getByRole("textbox", { name: "Google Maps link" }).fill(MAPS);
  await expect(page.getByRole("link", { name: "Check the link" })).toHaveAttribute("href", MAPS);

  await page.getByRole("group", { name: /^Type/ }).getByRole("button", { name: "Brewer", exact: true }).click();
  await page.getByRole("group", { name: /Roasters whose beans/ }).getByRole("button", { name: /Highland Sample Roasters/ }).click();
  await page.getByRole("group", { name: /^Roast levels/ }).getByRole("button", { name: "Light" }).click();
  await page.getByRole("group", { name: /^Preparation/ }).getByRole("button", { name: "Espresso" }).click();
  await page.getByRole("group", { name: /^Bean origin/ }).getByRole("button", { name: "Local beans", exact: true }).click();
  await page.getByRole("group", { name: /^Processing/ }).getByRole("button", { name: "Washed" }).click();
}

test("required fields are checked before saving", async ({ page }) => {
  await open(page, "/admin/shops/new");
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Some fields need attention" })).toBeVisible();
  await expect(page.getByText("Enter the shop's name.")).toBeVisible();
  await expect(page.getByText("Choose an area.")).toBeVisible();
  await expect(page.getByText("Choose at least one roast level.")).toBeVisible();
  await expect(page.getByText("Choose at least one preparation.")).toBeVisible();
  await expect(page.getByText("Choose where the beans come from.")).toBeVisible();
  await expect(page.getByText("Choose at least one processing method.")).toBeVisible();
});

test("a shop is a brewer, or a roaster and brewer; there are no pin fields", async ({ page }) => {
  await open(page, "/admin/shops/new");
  const types = page.getByRole("group", { name: /^Type/ }).getByRole("button");
  await expect(types).toHaveText(["Brewer", "Roaster and brewer"]);
  await expect(page.getByLabel(/Latitude|Longitude/)).toHaveCount(0);
  await page.getByRole("textbox", { name: "Google Maps link" }).fill("https://example.com/somewhere");
  await expect(page.getByText("This doesn't look like a Google Maps link.")).toBeVisible();
});

test("the pin comes from the Maps link, and a changed slug keeps old links working", async ({ page }) => {
  const name = unique();
  await fillNewShop(page, name);
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  // The map pin was read from the link on save.
  await open(page, `/shops/${slugOf(name)}`);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: -8.6512, longitude: 115.1301 });

  // Change the slug.
  await open(page, "/admin");
  await page.getByRole("searchbox", { name: "Search shops by name" }).fill(name);
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "Slug" }).fill(`${slugOf(name)}-canggu`);
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  // The old link redirects to the new one.
  await page.goto(`/shops/${slugOf(name)}`);
  await expect(page).toHaveURL(new RegExp(`/shops/${slugOf(name)}-canggu$`));
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
});

test("a shop that roasts can name its roastery, and no roaster is made from the shop", async ({ page }) => {
  const name = unique();
  await fillNewShop(page, name);
  await page.getByRole("group", { name: /^Type/ }).getByRole("button", { name: "Roaster and brewer" }).click();
  await page.getByRole("group", { name: /^Their own roastery/ }).getByRole("button", { name: /Sample Island Roasters/ }).click();
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  // The shop page names the roastery, before the other roasters it serves.
  await open(page, `/shops/${slugOf(name)}`);
  const beans = page.getByRole("region", { name: "Beans from" }).getByRole("listitem");
  await expect(beans.first()).toHaveText("Sample Island Roasters, their own roastery");
  await expect(beans.nth(1)).toContainText("Highland Sample Roasters");

  // The roastery lists the shop as one of its own; no roaster carries the shop's name.
  await open(page, "/roasters/sample-island-roasters");
  await expect(page.getByRole("region", { name: "Their shops" }).getByRole("article").filter({ hasText: name })).toBeVisible();
  await open(page, "/admin/roasters");
  await expect(page.getByRole("row", { name: new RegExp(`^${name}`) })).toHaveCount(0);
});

test("a slug another shop uses is refused", async ({ page }) => {
  await fillNewShop(page, unique());
  await page.getByRole("textbox", { name: "Slug" }).fill("sample-roastery");
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByText("Another shop already uses this slug.")).toBeVisible();
});

test("add, edit with history, hide and unhide a shop", async ({ page }) => {
  const name = unique();
  await fillNewShop(page, name);

  // An inline roaster, added without leaving the form.
  await page.getByRole("button", { name: "Add roaster" }).click();
  await page.getByRole("textbox", { name: "Roaster name" }).fill(`${name} Roasters`);
  await page.getByRole("textbox", { name: "City" }).fill("Bangli");
  await page.getByRole("button", { name: "Add to this shop" }).click();
  await expect(page.getByRole("button", { name: `Remove filter new roaster ${name} Roasters` })).toBeVisible();

  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page).toHaveURL(/\/admin\?saved=/);
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  // A3: the list finds it.
  await page.getByRole("searchbox", { name: "Search shops by name" }).fill(name);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Canggu");
  await expect(row).toContainText("Visible");
  await row.getByRole("link", { name }).click();

  // A4: edit, then see the change in History.
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByRole("textbox", { name: "Address" }).fill("Jl. Pantai Batu Bolong 2");
  await page.getByRole("group", { name: /^Roast levels/ }).getByRole("button", { name: "Medium" }).click();
  await page.getByRole("checkbox", { name: "Geisha beans on offer" }).check();
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  await page.getByRole("status").getByRole("link", { name }).click();
  await expect(page.getByRole("checkbox", { name: "Geisha beans on offer" })).toBeChecked();
  await page.getByRole("link", { name: "History" }).click();
  const latest = page.getByRole("listitem").first();
  await expect(latest).toContainText("Edited");
  await expect(latest).toContainText("e2e-admin@example.com");
  await expect(latest).toContainText("Jl. Pantai Batu Bolong 1");
  await expect(latest).toContainText("Jl. Pantai Batu Bolong 2");
  await expect(latest).toContainText("Light, Medium");
  await expect(latest).toContainText("Geisha beans");
  await expect(latest).toContainText("On offer");
  await expect(page.getByRole("listitem").last()).toContainText("Created");

  // A5: hide, which is recorded too, then unhide.
  await page.getByRole("button", { name: `Hide ${name}` }).click();
  await expect(page.getByText("Hidden", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("listitem").first()).toContainText("Hidden");
  await page.getByRole("button", { name: `Unhide ${name}` }).click();
  await expect(page.getByRole("listitem").first()).toContainText("Unhidden");
});

test("a second admin's save is not overwritten by a stale form", async ({ page, context }) => {
  const name = unique();
  await fillNewShop(page, name);
  await page.getByRole("button", { name: "Save shop" }).click();
  await page.getByRole("status").getByRole("link", { name }).click();
  await expect(page).toHaveURL(/\/admin\/shops\/[0-9a-f-]{36}$/);

  const other = await context.newPage();
  await open(other, page.url());

  await page.getByRole("textbox", { name: "Address" }).fill("Saved first");
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page).toHaveURL(/saved=/);

  await other.getByRole("textbox", { name: "Address" }).fill("Saved second, from an old form");
  await other.getByRole("button", { name: "Save shop" }).click();
  await expect(other.getByRole("alert").filter({ hasText: "Someone else saved" })).toContainText("Someone else saved this shop after you opened it");
});

test("a similar name in the same area is flagged before saving", async ({ page }) => {
  await open(page, "/admin/shops/new");
  await page.getByRole("combobox", { name: "Area" }).selectOption({ label: "Canggu" });
  await page.getByRole("textbox", { name: /^Name/ }).fill("Sample Roastry");
  await expect(page.getByText("Possible duplicate.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sample Roastery" })).toBeVisible();
});

test("unknown emails get the same answer and no code", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await clearMailbox();
  await page.goto("/admin/sign-in");
  await page.getByRole("textbox", { name: "Email" }).fill("stranger@example.com");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("status")).toContainText("If stranger@example.com belongs to an admin");
  await page.waitForTimeout(1000);
  expect(await messagesTo("stranger@example.com")).toHaveLength(0);
  await context.close();
});
