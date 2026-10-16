import { expect, test, type Page } from "@playwright/test";
import { clearMailbox, messagesTo } from "../helpers";

const unique = () => `E2E Cafe ${Date.now().toString(36)}`;

/** Opens a page and waits for React to hydrate, so typing reaches the form's state. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

async function fillNewShop(page: Page, name: string) {
  await open(page, "/admin/shops/new");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Address").fill("Jl. Pantai Batu Bolong 1");
  await page.getByLabel("Area").selectOption({ label: "Canggu" });
  await page.getByLabel("Google Maps link").fill("https://www.google.com/maps/place/X/@-8.65,115.13,17z/data=!3d-8.6512!4d115.1301");
  await expect(page.getByLabel("Latitude")).toHaveValue("-8.6512");
  await expect(page.getByLabel("Longitude")).toHaveValue("115.1301");
  await expect(page.getByRole("link", { name: "Preview on map" })).toHaveAttribute("href", /query=-8\.6512,115\.1301/);

  await page.getByRole("group", { name: /^Type/ }).getByRole("button", { name: "Maker", exact: true }).click();
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

test("short Google Maps links fall back to typing the pin", async ({ page }) => {
  await open(page, "/admin/shops/new");
  await page.getByLabel("Google Maps link").fill("https://maps.app.goo.gl/AbCdEf123");
  await expect(page.getByText("Short links can't be read here.")).toBeVisible();
});

test("add, edit with history, hide and unhide a shop", async ({ page }) => {
  const name = unique();
  await fillNewShop(page, name);

  // An inline roaster, added without leaving the form.
  await page.getByRole("button", { name: "Add roaster" }).click();
  await page.getByLabel("Roaster name").fill(`${name} Roasters`);
  await page.getByLabel("City").fill("Bangli");
  await page.getByRole("button", { name: "Add to this shop" }).click();
  await expect(page.getByRole("button", { name: `Remove filter new roaster ${name} Roasters` })).toBeVisible();

  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page).toHaveURL(/\/admin\?saved=/);
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  // A3: the list finds it.
  await page.getByLabel("Search shops by name").fill(name);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Canggu");
  await expect(row).toContainText("Visible");
  await row.getByRole("link", { name }).click();

  // A4: edit, then see the change in History.
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByLabel("Address").fill("Jl. Pantai Batu Bolong 2");
  await page.getByRole("group", { name: /^Roast levels/ }).getByRole("button", { name: "Medium" }).click();
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  await page.getByRole("status").getByRole("link", { name }).click();
  await page.getByRole("link", { name: "History" }).click();
  const latest = page.getByRole("listitem").first();
  await expect(latest).toContainText("Edited");
  await expect(latest).toContainText("e2e-admin@example.com");
  await expect(latest).toContainText("Jl. Pantai Batu Bolong 1");
  await expect(latest).toContainText("Jl. Pantai Batu Bolong 2");
  await expect(latest).toContainText("Light, Medium");
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

  await page.getByLabel("Address").fill("Saved first");
  await page.getByRole("button", { name: "Save shop" }).click();
  await expect(page).toHaveURL(/saved=/);

  await other.getByLabel("Address").fill("Saved second, from an old form");
  await other.getByRole("button", { name: "Save shop" }).click();
  await expect(other.getByRole("alert").filter({ hasText: "Someone else saved" })).toContainText("Someone else saved this shop after you opened it");
});

test("a similar name in the same area is flagged before saving", async ({ page }) => {
  await open(page, "/admin/shops/new");
  await page.getByLabel("Area").selectOption({ label: "Canggu" });
  await page.getByLabel("Name").fill("Sample Roastry");
  await expect(page.getByText("Possible duplicate.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sample Roastery" })).toBeVisible();
});

test("unknown emails get the same answer and no code", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await clearMailbox();
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email").fill("stranger@example.com");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("status")).toContainText("If stranger@example.com belongs to an admin");
  await page.waitForTimeout(1000);
  expect(await messagesTo("stranger@example.com")).toHaveLength(0);
  await context.close();
});
