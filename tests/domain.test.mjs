import assert from "node:assert/strict";
import test from "node:test";
import {
  blankCampaign,
  bookingSlots,
  planCampaign,
  serviceEstimate,
  totals,
} from "../src/domain.ts";

test("planner recommendations are deterministic and preserve the entire integer budget", () => {
  const brief = {
    ...blankCampaign,
    brand: "North",
    industry: "Lifestyle",
    product: "Desk objects",
    audience: "Makers",
    location: "Pune",
    interests: "Design",
    objective: "Sales",
    start: "2026-12-01",
    duration: 10,
    budget: 1001,
  };
  const result = planCampaign(brief);
  assert.deepEqual(result, planCampaign(brief));
  assert.deepEqual(result.channels, ["Digital advertising", "Instagram"]);
  assert.equal(
    Object.values(result.budget).reduce((sum, value) => sum + value, 0),
    1001,
  );
  assert.match(result.milestones.at(-1), /2026-12-10/);
  assert.deepEqual(planCampaign({ ...brief, channels: ["YouTube"] }).channels, [
    "YouTube",
  ]);
});
test("scope estimates handle duplicate and unknown service IDs", () => {
  const result = serviceEstimate(["ui-ux", "ui-ux", "branding", "unknown"]);
  assert.equal(result.amount, 100000);
  assert.equal(result.days, 21);
  assert.equal(result.outputs.length, 8);
});
test("bookings exclude past, weekend and occupied IST slots", () => {
  const now = new Date("2026-11-24T05:00:00Z");
  assert.deepEqual(bookingSlots("2026-11-24", ["11:00"], now), [
    "12:00",
    "14:00",
    "15:00",
    "16:00",
  ]);
  assert.deepEqual(bookingSlots("2026-11-28", [], now), []);
  assert.deepEqual(bookingSlots("2026-11-23", [], now), []);
});
test("analytics rates use aggregate denominators and handle zero data", () => {
  const result = totals([
    {
      date: "2026-11-24",
      reach: 40,
      impressions: 100,
      engagements: 10,
      clicks: 4,
      conversions: 1,
      spend: 80,
    },
    {
      date: "2026-11-25",
      reach: 60,
      impressions: 300,
      engagements: 30,
      clicks: 8,
      conversions: 2,
      spend: 160,
    },
  ]);
  assert.equal(result.engagementRate, 10);
  assert.equal(result.ctr, 3);
  assert.equal(result.cpe, 6);
  assert.equal(totals([]).ctr, 0);
});

test("industry guidance varies and every edited budget adds up to 100%", async () => {
  const { rebalanceAllocation } = await import("../src/campaign-ideas.ts");
  const base = {
    ...blankCampaign,
    brand: "North",
    product: "New collection",
    start: "2027-01-01",
  };
  const jewellery = planCampaign({ ...base, industry: "Jewellery" });
  const technology = planCampaign({ ...base, industry: "Technology" });
  assert.notEqual(jewellery.concept, technology.concept);
  assert.notDeepEqual(jewellery.channels, technology.channels);
  assert.ok(jewellery.formats.includes("Styling reel"));
  assert.deepEqual(jewellery.calendar, []);
  for (const value of [0, 34, 100]) {
    const allocation = rebalanceAllocation([100, 0, 0, 0, 0], 0, value);
    assert.equal(allocation[0], value);
    assert.equal(
      allocation.reduce((sum, amount) => sum + amount, 0),
      100,
    );
  }
});

