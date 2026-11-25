import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("themes update the Studio formats and export the customized PDF", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/studio");
  await expect(
    page.getByRole("heading", { name: "Find your visual voice." }),
  ).toBeVisible();
  const themes = page.getByRole("button", { name: /^Use This Theme:/ });
  await expect(themes).toHaveCount(10);
  await page
    .getByRole("button", { name: "Use This Theme: Coastal Calm" })
    .click();
  await expect(page.getByLabel("Aesthetic theme")).toHaveValue("coast");
  await expect(page.getByLabel("Primary colour")).toHaveValue("#254754");
  await page.getByLabel("Brand name").fill("Low Tide Works");
  await page.getByLabel("Tagline").fill("A quieter kind of studio.");
  await page.getByLabel("Heading font").selectOption("Georgia");
  await page.getByLabel("Body font").selectOption("Arial");
  await page.getByLabel("Primary colour").fill("#123456");

  const previews = page.getByLabel("Live brand previews");
  for (const format of [
    "Website hero",
    "Social post",
    "Instagram story",
    "Business card",
    "Typography",
  ]) {
    await expect(
      previews
        .getByLabel(format + " preview")
        .getByText("Low Tide Works", { exact: true })
        .last(),
    ).toBeVisible();
  }
  const web = previews.getByLabel("Website hero preview");
  await expect(web.getByText("A quieter kind of studio.")).toBeVisible();
  await expect(web.locator(".cs-wordmark")).toHaveCSS(
    "font-family",
    "Georgia, serif",
  );
  await expect(web).toHaveCSS("font-family", "Arial, sans-serif");
  await expect(previews.getByLabel("Palette preview")).toContainText("#123456");
  await page.getByRole("button", { name: "Copy primary HEX" }).click();
  await expect(page.getByText("#123456 copied.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "#123456",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );

  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download brand kit PDF" }).click();
  const pdf = await downloaded;
  expect(pdf.suggestedFilename()).toBe("low-tide-works-brand-kit.pdf");
  const contents = (await readFile((await pdf.path())!)).toString("latin1");
  expect(contents).toMatch(/^%PDF/);
  expect(contents).toContain("Coastal Calm");
  expect(contents).toContain("#123456");
  expect(contents).toContain("Identity guidelines");
  expect(contents.match(/\/Subtype \/Image/g)?.length).toBeGreaterThanOrEqual(
    2,
  );
  await page.reload();
  await expect(page.getByLabel("Brand name")).toHaveValue("Low Tide Works");
});
