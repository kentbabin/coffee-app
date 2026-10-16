import { expect, test, type Page } from "@playwright/test";
import { serviceClient } from "../helpers";

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

async function addSubmission(name: string) {
  const { data, error } = await serviceClient()
    .from("shop_submissions")
    .insert({ name, maps_url: "https://www.google.com/maps/@-8.5069,115.2625,15z", notes: "Great natural process filter." })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

test("A6: approving a submission opens a pre-filled form and publishes the shop", async ({ page }) => {
  const name = `E2E Submitted ${Date.now().toString(36)}`;
  await addSubmission(name);

  await open(page, "/admin/submissions");
  const card = page.getByRole("listitem").filter({ hasText: name });
  await expect(card).toContainText("Great natural process filter.");
  await card.getByRole("link", { name: `Approve ${name}` }).click();

  await expect(page.getByRole("heading", { name: "Approve a submission" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("textbox", { name: /^Name/ })).toHaveValue(name);
  await expect(page.getByRole("textbox", { name: "Google Maps link" })).toHaveValue("https://www.google.com/maps/@-8.5069,115.2625,15z");
  await page.getByRole("textbox", { name: "Address" }).fill("Jl. Raya Ubud 9");

  await page.getByRole("combobox", { name: "Area" }).selectOption({ label: "Ubud" });
  await page.getByRole("group", { name: /^Roast levels/ }).getByRole("button", { name: "Light" }).click();
  await page.getByRole("group", { name: /^Preparation/ }).getByRole("button", { name: "Manual brew" }).click();
  await page.getByRole("group", { name: /^Bean origin/ }).getByRole("button", { name: "Local beans", exact: true }).click();
  await page.getByRole("group", { name: /^Processing/ }).getByRole("button", { name: "Natural" }).click();
  await page.getByRole("button", { name: "Approve and save shop" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);

  await open(page, "/admin/submissions");
  await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText("Approved");
});

test("A6: rejecting a submission keeps it off the site", async ({ page }) => {
  const name = `E2E Rejected ${Date.now().toString(36)}`;
  await addSubmission(name);

  await open(page, "/admin/submissions");
  await page.getByRole("button", { name: `Reject ${name}` }).click();
  await page.getByRole("textbox", { name: "Reason" }).fill("Closed permanently.");
  await page.getByRole("button", { name: "Reject submission" }).click();

  const reviewed = page.getByRole("region", { name: "Recently reviewed" }).getByRole("listitem").filter({ hasText: name });
  await expect(reviewed).toContainText("Rejected");
  await expect(reviewed).toContainText("Reason: Closed permanently.");
});

test("A7: add, rename, retire and restore an option; values in use can't be deleted", async ({ page }) => {
  const label = `Siphon ${Date.now().toString(36)}`;
  await open(page, "/admin/options?list=preparation_methods");
  await expect(page.getByRole("link", { name: "Preparation" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("form", { name: "Add a preparation" }).getByRole("textbox", { name: /^Name/ }).fill(label);
  await page.getByRole("button", { name: "Add preparation" }).click();
  const input = page.getByLabel(`Name of ${label}`);
  await expect(input).toBeVisible();

  await input.fill(`${label} bar`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel(`Name of ${label} bar`)).toBeVisible();

  const row = page.getByRole("listitem").filter({ has: page.getByLabel(`Name of ${label} bar`) });
  await row.getByRole("button", { name: "Retire" }).click();
  await expect(row).toContainText("Retired");
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(row).not.toContainText("Retired");

  // Unused, so it can go.
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: `Delete ${label} bar` }).click();
  await expect(page.getByLabel(`Name of ${label} bar`)).toHaveCount(0);

  // Espresso is on many shops.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Espresso" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Retire it instead" })).toBeVisible();
});

test("roasters without a shop are added and edited under Roasters", async ({ page }) => {
  const name = `E2E Roasters ${Date.now().toString(36)}`;
  await open(page, "/admin/roasters");
  await page.getByRole("link", { name: "Add a roaster" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: /^Name/ }).fill(name);
  await page.getByRole("textbox", { name: "City" }).fill("Bangli");
  await page.getByRole("group", { name: "Processing" }).getByRole("button", { name: "Natural" }).click();
  await page.getByRole("button", { name: "Save roaster" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved ${name}`);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("Bangli");

  await page.getByRole("status").getByRole("link", { name }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "City" }).fill("Kintamani");
  await page.getByRole("button", { name: "Save roaster" }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("Kintamani");

  // A roaster that is also a shop is renamed from its shop.
  await page.getByRole("row", { name: /^Sample Roastery/ }).getByRole("link", { name: "Sample Roastery" }).first().click();
  await expect(page.getByText("This roaster is also a shop")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Name/ })).toHaveAttribute("readonly", "");
});
