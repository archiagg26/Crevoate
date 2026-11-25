import { expect, test, type Page } from "@playwright/test";

const {
  CREOVATE_E2E_CLIENT_EMAIL: clientEmail,
  CREOVATE_E2E_CLIENT_PASSWORD: clientPassword,
  CREOVATE_E2E_ADMIN_EMAIL: adminEmail,
  CREOVATE_E2E_ADMIN_PASSWORD: adminPassword,
  CREOVATE_E2E_STRANGER_EMAIL: strangerEmail,
  CREOVATE_E2E_STRANGER_PASSWORD: strangerPassword,
} = process.env;

test.skip(
  ![
    clientEmail,
    clientPassword,
    adminEmail,
    adminPassword,
    strangerEmail,
    strangerPassword,
  ].every(Boolean),
  "Requires three verified Supabase test accounts.",
);

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Account for / }),
  ).toBeVisible();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: /^Account for / }).click();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
}
test("service selection through admin review and client status tracking", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const brand = "Paper Orbit " + Date.now();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good Ideas Deserve Great Creative." }),
  ).toBeVisible();
  await login(page, clientEmail!, clientPassword!);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Services", exact: true })
    .click();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "UI/UX Design", exact: true }),
    })
    .getByRole("link", { name: "View service" })
    .click();
  await page.getByRole("link", { name: "Plan a campaign" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Brand details" }),
  ).toBeVisible();
  await page.getByLabel("Brand name").fill(brand);
  await page.getByLabel("Industry").fill("Lifestyle");
  await page.getByLabel("Product or service").fill("Modular desk objects");
  await page
    .getByLabel("Brand description")
    .fill("Design a campaign to launch our modular desk objects.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Primary objective").selectOption("Product launch");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Location").fill("Pune");
  await page.getByLabel("Interests").fill("Design and productivity");
  await page.getByLabel("Target customer profile").fill("Independent makers");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Instagram", { exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Influencer marketing percentage").fill("45");
  await expect(
    page.getByLabel("Budget allocation").getByText("100%"),
  ).toBeVisible();
  await page.getByLabel("Campaign start date").fill("2030-12-02");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("heading", { name: brand + " in everyday life" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add content" }).click();
  await page
    .getByRole("combobox", { name: "Content format", exact: true })
    .selectOption("Reel");
  await page
    .getByLabel("Content title", { exact: true })
    .fill("A studio desk walkthrough");
  await page
    .getByLabel("Suggested caption", { exact: true })
    .fill("Meet Paper Orbit.");
  await page.getByRole("button", { name: "Save content" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /A studio desk walkthrough/ }),
  ).toBeVisible();
  const campaignPdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export plan as PDF" }).click();
  expect((await campaignPdf).suggestedFilename()).toBe("creovate-campaign.pdf");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume saved draft" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save campaign" }).click();
  await expect(
    page.getByText("Campaign saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create project brief" }).click();
  await expect(page.getByLabel("UI/UX Design", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Brand or project name")).toHaveValue(brand);
  await page.getByRole("button", { name: "Submit project brief" }).click();
  await page.getByRole("link", { name: "View project briefs" }).click();
  await expect(page.getByRole("heading", { name: brand })).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin access required." }),
  ).toBeVisible();
  await logout(page);
  await login(page, adminEmail!, adminPassword!);
  await page.getByRole("link", { name: "Review inquiries" }).click();
  const inquiry = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: brand, exact: true }),
  });
  await inquiry.getByRole("button", { name: "Approve inquiry" }).click();
  await expect(inquiry).toContainText("approved");
  await page
    .getByRole("navigation", { name: "Workspace pages" })
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: brand, exact: true }),
    })
    .getByRole("link", { name: "View project" })
    .click();
  const projectUrl = page
    .url()
    .replace("/admin/project/", "/dashboard/project/");
  const clientContext = await browser.newContext();
  const watcher = await clientContext.newPage();
  await login(watcher, clientEmail!, clientPassword!);
  await watcher.goto(projectUrl);
  await expect(
    watcher.getByRole("heading", { name: brand, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("In progress");
  await page.getByLabel("Progress (%)").fill("60");
  await page.getByRole("button", { name: "Update project" }).click();
  await expect(page.getByText("Project status updated.")).toBeVisible();
  await expect(watcher.getByText(/In progress.*60% complete/)).toBeVisible({
    timeout: 20000,
  });
  await clientContext.close();
  await page.getByLabel("New milestone").fill("Creative direction approved");
  await page.getByRole("button", { name: "Add milestone" }).click();
  await expect(
    page.getByText("Creative direction approved · Open"),
  ).toBeVisible();
  await logout(page);
  await login(page, clientEmail!, clientPassword!);
  await page
    .getByRole("navigation", { name: "Workspace pages" })
    .getByRole("link", { name: "My projects" })
    .click();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: brand, exact: true }),
    })
    .getByRole("link", { name: "View project" })
    .click();
  await expect(page.getByText("In progress · 60% complete")).toBeVisible();
  await expect(
    page.getByText("Creative direction approved · Open"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update project" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("In progress · 60% complete")).toBeVisible();
  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await login(stranger, strangerEmail!, strangerPassword!);
  await stranger.goto(projectUrl);
  await expect(
    stranger.getByText("This project is unavailable."),
  ).toBeVisible();
  await strangerContext.close();
  await page.goto("/studio");
  const kitName = "Studio test " + Date.now();
  await page.getByLabel("Brand name").fill(kitName);
  await page.getByRole("button", { name: "Save brand kit" }).click();
  await expect(page.getByText("Brand kit saved.")).toBeVisible();
  await page.goto("/dashboard?tab=kits");
  await page
    .getByRole("article")
    .filter({ hasText: kitName })
    .getByRole("link", { name: "Open brand kit" })
    .click();
  await expect(page.getByLabel("Brand name")).toHaveValue(kitName);
  expect(errors).toEqual([]);
});
