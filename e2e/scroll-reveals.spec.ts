import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 850 },
  { width: 390, height: 780 },
]) {
  test(
    "individual homepage reveals during a slow scroll at " +
      viewport.width +
      "px",
    async ({ page }) => {
      test.setTimeout(100000);
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page.locator(".hero h1 .viewport-text").first()).toHaveCSS(
        "opacity",
        "1",
      );
      await expect(page.locator(".footer-grid > div").first()).toHaveAttribute(
        "data-reveal-state",
        "waiting",
      );
      await expect(page.locator("#selected-work .work-link").first()).toHaveCSS(
        "opacity",
        "0",
      );
      const selectors = {
        bentoHeading: "#creative-bento h2 .viewport-text",
        bentoTiles: "#creative-bento .creative-tile",
        servicesHeading: "#services h2 .viewport-text",
        serviceList: "#services .service-select button",
        serviceImage: "#services .service-visual .viewport-image",
        projectCard: "#selected-work .work-link",
        projectImage: "#selected-work .work-link .viewport-image",
        projectTitle: "#selected-work .work-link > .viewport-slide",
        processSteps: "#process .process-options button",
        processLine: "#process .process-connector",
        planner: "#creative-tools .planner-feature",
        studio: "#creative-tools .studio-feature",
        toolContents: "#creative-tools .viewport-tool-inner > .viewport-reveal",
        faq: "#faq details",
        ctaLines: "#final-cta h2 .viewport-text",
        ctaButton: "#final-cta .wrap > .viewport-slide",
        footerColumns: ".footer-grid > .viewport-reveal",
      };
      const audit = await page.evaluate(async (selectors) => {
        const nodes = Object.entries(selectors).map(([name, selector]) => ({
          name,
          items: [...document.querySelectorAll<HTMLElement>(selector)].map(
            (node) => ({ node, entered: false, animated: false, ready: false }),
          ),
        }));
        let frame = 0;
        let maxOverflow = 0;
        function sample() {
          maxOverflow = Math.max(
            maxOverflow,
            document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          for (const group of nodes)
            for (const item of group.items) {
              if (item.animated && item.ready) continue;
              if (item.node.dataset.revealState !== "entered") continue;
              item.entered = true;
              const style = getComputedStyle(item.node);
              const opacity = Number(style.opacity);
              const transform =
                style.transform === "none"
                  ? new DOMMatrix()
                  : new DOMMatrix(style.transform);
              const image = item.node.dataset.revealKind === "image";
              const line = item.node.dataset.revealKind === "line";
              if (image) {
                const clip = style.clipPath;
                const percentages = [...clip.matchAll(/(-?[0-9.]+)%/g)].map(
                  (match) => Number(match[1]),
                );
                item.animated ||= percentages.some(
                  (value) => value > 0.1 && value < 99.9,
                );
                item.ready ||=
                  percentages.length > 0 &&
                  percentages.every((value) => Math.abs(value) < 0.1) &&
                  opacity >= 0.99;
              } else if (line) {
                item.animated ||= transform.a > 0.01 && transform.a < 0.99;
                item.ready ||= transform.a >= 0.99;
              } else {
                item.animated ||= opacity > 0.01 && opacity < 0.99;
                item.ready ||=
                  opacity >= 0.99 &&
                  Math.abs(transform.m41) < 1 &&
                  Math.abs(transform.m42) < 1;
              }
            }
          frame = requestAnimationFrame(sample);
        }
        sample();
        for (
          let top = 0;
          top < document.documentElement.scrollHeight;
          top += Math.round(innerHeight * 0.12)
        ) {
          window.scrollTo({ top, behavior: "instant" });
          await new Promise((resolve) => setTimeout(resolve, 165));
          if (
            scrollY + innerHeight >=
            document.documentElement.scrollHeight - 1
          )
            break;
        }
        const footer = nodes.find((group) => group.name === "footerColumns");
        const deadline = performance.now() + 4500;
        while (
          footer?.items.some((item) => !item.ready) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        cancelAnimationFrame(frame);
        return {
          maxOverflow,
          groups: nodes.map((group) => ({
            name: group.name,
            items: group.items.map(({ entered, animated, ready }) => ({
              entered,
              animated,
              ready,
            })),
          })),
        };
      }, selectors);
      expect(audit.maxOverflow).toBeLessThanOrEqual(1);
      for (const group of audit.groups) {
        expect(group.items.length, group.name).toBeGreaterThan(0);
        expect(
          group.items.every((item) => item.entered && item.ready),
          JSON.stringify(group),
        ).toBe(true);
        expect(
          group.items.some((item) => item.animated),
          JSON.stringify(group),
        ).toBe(true);
      }
      const firstTile = page.locator(".creative-intro");
      await expect(firstTile).toHaveAttribute("data-reveal-state", "waiting");
      const replayed = await firstTile.evaluate(async (tile) => {
        tile.scrollIntoView({ block: "center", behavior: "instant" });
        let animated = false;
        const deadline = performance.now() + 5000;
        do {
          await new Promise(requestAnimationFrame);
          if (tile.getAttribute("data-reveal-state") !== "entered") continue;
          const opacity = Number(getComputedStyle(tile).opacity);
          animated ||= opacity > 0.01 && opacity < 0.98;
          if (animated && opacity >= 0.99) return true;
        } while (performance.now() < deadline);
        return false;
      });
      expect(replayed).toBe(true);
      expect(errors).toEqual([]);
    },
  );
}

test("animations reveal staggered siblings at different times", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 850 });
  await page.goto("/");
  const sampled = await page.evaluate(async () => {
    const intro = document.querySelector<HTMLElement>(".creative-intro")!;
    const brand = document.querySelector<HTMLElement>(".creative-brand")!;
    intro.scrollIntoView({ block: "center", behavior: "instant" });
    for (let frame = 0; frame < 55; frame++) {
      if (
        Number(getComputedStyle(intro).opacity) > 0.05 &&
        Number(getComputedStyle(brand).opacity) === 0
      )
        return true;
      await new Promise(requestAnimationFrame);
    }
    return false;
  });
  expect(sampled).toBe(true);
});

test("homepage content remains available without IntersectionObserver", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "IntersectionObserver", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(page.locator(".hero h1 .viewport-text").first()).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator(".creative-intro")).toHaveCSS("opacity", "1");
  await expect(page.locator(".footer-grid > div").first()).toHaveCSS(
    "opacity",
    "1",
  );
});
