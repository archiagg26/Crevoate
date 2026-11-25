import { expect, test } from "@playwright/test";

test("a missing services table keeps the inquiry form usable and hides database details", async ({
  page,
}) => {
  let inquiries = 0;
  await page.route("**/rest/v1/services?*", (route) =>
    route.fulfill({
      status: 404,
      json: {
        code: "PGRST205",
        message:
          "Could not find the table 'public.services' in the schema cache",
      },
    }),
  );
  await page.route("**/rest/v1/project_inquiries", (route) => {
    inquiries++;
    return route.fulfill({
      status: 404,
      json: {
        code: "PGRST205",
        message:
          "Could not find the table 'public.project_inquiries' in the schema cache",
      },
    });
  });
  await page.goto("/contact");
  await expect(
    page
      .getByRole("group", { name: "Select services" })
      .getByRole("checkbox")
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/schema cache/)).toHaveCount(0);
  test.skip(
    await page
      .getByText(
        "Creovate workspace is unavailable until Supabase is configured.",
      )
      .isVisible(),
    "Requires a Supabase browser configuration.",
  );
  await page.getByLabel("Your name").fill("Test Client");
  await page.getByLabel("Email address").fill("client@example.test");
  await page.getByLabel("Brand or project name").fill("Test Brand");
  await page
    .getByLabel("Project objectives")
    .fill("Plan a distinctive launch for the next season.");
  await page
    .getByRole("group", { name: "Select services" })
    .getByRole("checkbox")
    .first()
    .check();
  await page.getByRole("button", { name: "Submit project brief" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "This feature is temporarily unavailable.",
  );
  await expect(
    page.getByText(/schema cache|public\.project_inquiries/),
  ).toHaveCount(0);
  expect(inquiries).toBe(1);
});
