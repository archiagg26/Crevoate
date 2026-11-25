import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60000 });

for (const width of [360, 768, 1024, 1440, 1920]) {
  test(
    "responsive navigation and core pages at " + width + "px",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const path of [
        "/",
        "/services",
        "/work",
        "/planner",
        "/studio",
        "/creators",
        "/booking",
        "/unknown-route",
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const layout = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          return {
            width,
            scroll: document.documentElement.scrollWidth,
            overflow: [...document.querySelectorAll("*")]
              .filter((el) => el.getBoundingClientRect().right > width + 1)
              .slice(0, 12)
              .map(
                (el) =>
                  el.tagName +
                  " " +
                  el.getAttribute("class") +
                  " " +
                  Math.round(el.getBoundingClientRect().right),
              ),
          };
        });
        expect(
          layout.scroll,
          path + " " + layout.overflow.join(", "),
        ).toBeLessThanOrEqual(layout.width);
      }
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      if (process.env.CREOVATE_CAPTURE) {
        await page.screenshot({
          path: "test-results/home-" + width + ".png",
          animations: "disabled",
        });
        await page.locator("#creative-bento").screenshot({
          path: "test-results/bento-" + width + ".png",
          animations: "disabled",
        });
      }
      if (width < 1120)
        await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("button", { name: "Creative Tools" }).click();
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Creative Studio" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Find your visual voice." }),
      ).toBeVisible();
      await page.getByLabel("Brand name").fill("New Brand");
      await expect(
        page.getByLabel("Website hero preview").locator(".cs-wordmark"),
      ).toHaveText("New Brand");
      expect(errors).toEqual([]);
    },
  );
}

test("homepage bento and project cards link to their destinations", async ({
  page,
}) => {
  await page.goto("/");
  const bento = page.getByRole("region", {
    name: "Creativity Without Boundaries",
  });
  await expect(bento).toBeVisible();
  expect(await page.locator(".hero + #creative-bento").count()).toBe(1);
  const routes = {
    "Branding & Identity": "/services/branding",
    "Web Development & UI/UX": "/services/web-development",
    "Influencer Marketing": "/services/influencer-marketing",
    "Campaigns & Content": "/services/campaign-production",
    "Creative Studio": "/studio",
    "Campaign Planner": "/planner",
  };
  for (const [name, path] of Object.entries(routes)) {
    await expect(bento.getByRole("link", { name })).toHaveAttribute(
      "href",
      path,
    );
  }
  await page.getByRole("button", { name: "Pause rotation" }).click();
  await expect(
    page.getByRole("button", { name: "Play rotation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bloom Theory", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "View Bloom Theory case study" }),
  ).toHaveAttribute("href", "/work/bloom");
  const studio = bento.getByRole("link", { name: "Creative Studio" });
  await studio.focus();
  await expect(studio).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Find your visual voice." }),
  ).toBeVisible();
  await page.goto("/work");
  await expect(
    page.getByRole("link", { name: /Live website Dissara/ }),
  ).toHaveAttribute("href", "https://www.dissara.com/");
  await page.getByRole("link", { name: /ORA Objects/ }).click();
  await expect(
    page.getByRole("heading", { name: "ORA Objects", exact: true }),
  ).toBeVisible();
});

test("workspace entry keeps its return path and reflects backend configuration", async ({
  page,
}) => {
  await page.goto("/dashboard?tab=campaigns");
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/dashboard?tab=campaigns",
  );
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  const email = page.getByLabel("Email address");
  const unavailable = page
    .getByRole("alert")
    .filter({ hasText: "until Supabase is configured" });
  await expect(email.or(unavailable)).toBeVisible();
  if (await email.isVisible()) {
    await expect(page.getByLabel("Email address")).toBeVisible();
    await page.getByRole("button", { name: "Create an account" }).click();
    await expect(
      page.getByRole("meter", { name: "Password strength" }),
    ).toBeVisible();
    await page
      .getByLabel("Password", { exact: true })
      .fill("Example-Password123");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
  } else {
    await expect(page.getByRole("alert")).toContainText(
      "until Supabase is configured",
    );
    await expect(
      page.getByRole("button", { name: /demo|sign in|log in/i }),
    ).toHaveCount(0);
  }
});

test("homepage motion respects reduced motion and highlights sections", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Capabilities" })
    .click();
  await expect(
    page.getByRole("link", { name: "Capabilities", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  await expect(
    page.locator("#creative-bento h2 .viewport-text"),
  ).toHaveAttribute("data-reveal-state", "entered");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Creativity Without Boundaries" }),
  ).toBeVisible();
  await expect(page.locator(".creative-intro")).toHaveCSS("opacity", "1");
  await expect(page.locator(".creative-intro")).toHaveCSS("transform", "none");
});

test("public services and portfolio render without querying Supabase", async ({
  page,
}) => {
  const catalogRequests: string[] = [];
  await page.route(/\/rest\/v1\/(services|portfolio)(\?|$)/, async (route) => {
    catalogRequests.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 404,
      json: { code: "PGRST205", message: "Table missing" },
    });
  });
  await page.goto("/");
  await expect(
    page.locator("#services .service-select button").first(),
  ).toBeVisible();
  await expect(
    page.locator("#selected-work").getByRole("link", { name: /Dissara/ }),
  ).toHaveAttribute("href", "https://www.dissara.com/");
  await page.goto("/services/web-development");
  await expect(
    page.getByRole("heading", { name: "Website Development", exact: true }),
  ).toBeVisible();
  await page.goto("/work/ora");
  await expect(
    page.getByRole("heading", { name: "ORA Objects", exact: true }),
  ).toBeVisible();
  expect(catalogRequests).toEqual([]);
});
