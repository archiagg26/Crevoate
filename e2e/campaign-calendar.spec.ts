import { expect, test } from "@playwright/test";

test("campaign calendar supports editing, rescheduling, views and CSV export", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => {
    const prefix = "creovate.draft.workspace.visitor.";
    if (sessionStorage.getItem(prefix + "campaign-step")) return;
    sessionStorage.setItem(prefix + "campaign-step", "5");
    sessionStorage.setItem(
      prefix + "campaign-new",
      JSON.stringify({
        brand: "Studio North",
        industry: "Lifestyle",
        product: "Desk objects",
        website: "",
        description: "Launch our new desk collection.",
        objective: "Product launch",
        age: "25-34",
        location: "Pune",
        interests: "Product design",
        audience: "Independent makers",
        channels: ["Instagram"],
        budget: 25000,
        start: "2030-12-02",
        duration: 14,
        deliverables: "",
        creators: [],
        calendar: [
          {
            id: "first",
            date: "2030-12-02",
            platform: "Instagram",
            format: "Reel",
            idea: "Launch teaser",
            caption: "Meet Studio North",
            objective: "Product launch",
            status: "Draft",
          },
        ],
      }),
    );
  });
  await page.goto("/planner");
  const calendar = page.getByRole("region", {
    name: "Content calendar",
    exact: true,
  });
  await expect(
    calendar.getByRole("button", { name: /Launch teaser/ }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Month", exact: true }).click();
  await calendar.getByRole("button", { name: /Launch teaser/ }).click();
  const editor = page.getByRole("dialog", { name: "Edit calendar entry" });
  await editor
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Scheduled");
  await editor.getByLabel("Scheduled date").fill("2030-12-03");
  await editor.getByLabel("Posting time").fill("10:30");
  await editor.getByRole("button", { name: "Save content" }).click();
  await expect(editor).not.toBeVisible();
  await page.reload();
  await expect(
    calendar.getByRole("button", { name: /Launch teaser.*10:30 AM/ }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Content board" }).click();
  await expect(
    calendar.getByRole("heading", { name: "Scheduled 1" }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(
    calendar.getByRole("heading", { name: "Engagement & amplification" }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Month", exact: true }).click();
  await calendar.getByRole("button", { name: "Add content on 5 Dec" }).click();
  await editor.getByLabel("Content title").fill("Product close-up");
  await editor.getByRole("button", { name: "Save content" }).click();
  await expect(
    calendar.getByRole("button", { name: /Product close-up/ }),
  ).toBeVisible();
  await calendar
    .getByRole("button", { name: /Product close-up/ })
    .dragTo(
      calendar
        .getByRole("button", { name: "Add content on 6 Dec" })
        .locator(".."),
    );
  await expect(
    calendar
      .getByRole("button", { name: "Add content on 6 Dec" })
      .locator("..")
      .getByRole("button", { name: /Product close-up/ }),
  ).toBeVisible();
  await calendar.getByLabel("Search content").fill("Launch teaser");
  await expect(
    calendar.getByRole("button", { name: /Product close-up/ }),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await calendar.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe(
    "studio-north-calendar.csv",
  );
  await calendar.getByRole("button", { name: "Generate plan" }).click();
  await expect(calendar.getByRole("alert")).toContainText("Save the campaign");
  await calendar.getByRole("button", { name: "Next month" }).click();
  await expect(calendar.getByText("January 2031")).toBeVisible();
  const width = await calendar.evaluate(
    (node) => node.scrollWidth - node.clientWidth,
  );
  expect(width).toBeLessThanOrEqual(1);
});
