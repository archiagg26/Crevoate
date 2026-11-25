import { expect, test } from "@playwright/test";

test("the local demo opens with sample data while the real dashboard stays protected", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/workspace$/);
  await expect(
    page.getByRole("heading", { name: "Hello, Archi." }),
  ).toBeVisible();
  await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/login"]')).toHaveCount(0);
  const campaigns = page.getByRole("region", {
    name: "Campaigns",
    exact: true,
  });
  const task = page.getByRole("checkbox", { name: "Review the launch reel" });
  await task.check();
  await expect(page.getByText("1 of 3 tasks done")).toBeVisible();
  await page.reload();
  await expect(task).toBeChecked();
  await page.getByLabel("Search campaigns").fill("Morrow");
  await expect(
    campaigns.getByRole("heading", { name: "A Softer Launch" }),
  ).toBeVisible();
  await expect(
    campaigns.getByRole("heading", { name: "Summer in Full Colour" }),
  ).toHaveCount(0);
  await page.getByLabel("Search campaigns").clear();
  await expect(
    campaigns.getByRole("heading", { name: "Summer in Full Colour" }),
  ).toBeVisible();
  await page.getByLabel("Filter campaigns").selectOption("Complete");
  await expect(
    page.getByRole("heading", { name: "Made to Move" }),
  ).toBeVisible();
  await expect(
    campaigns.getByRole("heading", { name: "Summer in Full Colour" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Work", exact: true })
    .click();
  await expect(page).toHaveURL(/\/work$/);
  const account = page.getByRole("link", { name: "Archi Signed in" });
  await expect(account).toBeVisible();
  await page.reload();
  await expect(account).toBeVisible();
  await expect(page.locator('a[href="/login"]')).toHaveCount(0);
  await account.click();
  await expect(page).toHaveURL(/\/preview\/workspace$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});
