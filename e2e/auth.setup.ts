import { expect, test as setup } from "@playwright/test";
import { ADMIN_EMAIL, clearMailbox, signInCode } from "./helpers";

// A1: sign in with an emailed code, then save the session for the admin tests.
setup("admin signs in with a 6-digit code", async ({ page }) => {
  await clearMailbox();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("status")).toContainText(`If ${ADMIN_EMAIL} belongs to an admin`);

  await page.getByLabel("Code").fill(await signInCode(ADMIN_EMAIL));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Shops", level: 1 })).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
