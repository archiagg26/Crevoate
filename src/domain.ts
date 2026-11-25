import {
  budgetAmounts,
  budgetBuckets,
  getIndustryIdeas,
  suggestedAllocation,
  type CalendarEntry,
} from "./campaign-ideas.ts";
import { services } from "./content.ts";

export const objectives = [
  "Brand awareness",
  "Product launch",
  "Engagement",
  "Lead generation",
  "Sales",
  "Community growth",
];
export const channels = [
  "Instagram",
  "YouTube",
  "LinkedIn",
  "Digital advertising",
  "Influencer collaborations",
  "Brand events",
];
export const objectiveChannels: Record<string, string[]> = {
  "Brand awareness": ["Instagram", "YouTube", "Influencer collaborations"],
  "Product launch": ["Instagram", "YouTube", "Digital advertising"],
  Engagement: ["Instagram", "Influencer collaborations"],
  "Lead generation": ["LinkedIn", "Digital advertising"],
  Sales: ["Digital advertising", "Instagram"],
  "Community growth": ["Instagram", "Brand events"],
};
export type Campaign = {
  title?: string;
  brand: string;
  industry: string;
  product: string;
  website: string;
  description: string;
  objective: string;
  age: string;
  location: string;
  interests: string;
  audience: string;
  channels: string[];
  budget: number;
  start: string;
  duration: number;
  deliverables: string;
  creators: string[];
  personality?: string;
  recommendations?: Omit<
    ReturnType<typeof planCampaign>,
    "calendar" | "allocation"
  >;
  allocation?: number[];
  calendar?: CalendarEntry[];
  preferences?: string[];
  behaviour?: string;
  platforms?: string;
};
export const blankCampaign: Campaign = {
  brand: "",
  industry: "",
  product: "",
  website: "",
  description: "",
  objective: objectives[0],
  age: "18–34",
  location: "",
  interests: "",
  audience: "",
  channels: [],
  budget: 25000,
  start: "",
  duration: 28,
  deliverables: "",
  creators: [],
};
export function planCampaign(c: Campaign) {
  const recommendation =
    objectiveChannels[c.objective] ?? objectiveChannels[objectives[0]];
  const ideas = getIndustryIdeas(c.industry);
  const selected = c.channels.length
    ? c.channels
    : ["Sales", "Lead generation"].includes(c.objective)
      ? recommendation
      : ideas.channels;
  const budget = Math.max(0, Math.round(Number(c.budget) || 0));
  const allocation =
    c.allocation?.length === budgetBuckets.length &&
    c.allocation.every((v) => Number.isInteger(v) && v >= 0) &&
    c.allocation.reduce((sum, v) => sum + v, 0) === 100
      ? c.allocation
      : suggestedAllocation(budget, c.objective);
  const amounts = budgetAmounts(budget, allocation);
  const formats = c.preferences?.length ? c.preferences : ideas.formats;
  const phaseDate = (fraction: number) => {
    const date = new Date(c.start + "T00:00:00Z");
    if (!Number.isFinite(date.getTime())) return "Set launch date";
    date.setUTCDate(
      date.getUTCDate() + Math.round(Math.max(0, c.duration - 1) * fraction),
    );
    return date.toISOString().slice(0, 10);
  };
  return {
    concept:
      ideas.concept === "in everyday life"
        ? c.brand + " in everyday life"
        : c.brand + " · " + ideas.concept,
    strategy:
      "Show how " +
      c.product +
      " fits into the lives of " +
      c.audience +
      " in " +
      c.location +
      ". Build around " +
      c.objective.toLowerCase() +
      " with creative grounded in " +
      c.interests +
      ".",
    channels: selected,
    formats,
    creators: [
      ...ideas.creators,
      budget < 15000
        ? "Nano creators (under 10k)"
        : "Micro creators (10k–100k)",
    ],
    budget: Object.fromEntries(
      budgetBuckets.map((label, i) => [label, amounts[i]]),
    ),
    allocation,
    calendar: c.calendar ?? [],
    milestones: [
      "Brief and concept approval",
      "Production and creator alignment",
      "Launch and optimization",
      "Reporting and learnings",
    ].map((label, i) => label + " · " + phaseDate(i / 3)),
    kpis:
      c.objective === "Sales" || c.objective === "Lead generation"
        ? ["Qualified conversions", "Click-through rate", "Cost per conversion"]
        : ["Unique reach", "Engagement rate", "Video completion rate"],
    next: [
      "Confirm scope and baseline targets",
      "Approve assets and tracking links",
      "Set a weekly performance review",
    ],
  };
}
export function serviceEstimate(ids: string[], catalog = services) {
  const selected = catalog.filter((service) => ids.includes(service.id));
  return {
    amount: selected.reduce((sum, s) => sum + s.price, 0),
    days: Math.max(0, ...selected.map((s) => s.days)),
    outputs: selected.flatMap((s) => s.outputs),
  };
}
export function bookingSlots(date: string, booked: string[], now = new Date()) {
  return ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"].filter(
    (time) =>
      !booked.includes(time) &&
      new Date(date + "T" + time + ":00+05:30") > now &&
      ![0, 6].includes(new Date(date + "T12:00:00+05:30").getUTCDay()),
  );
}
export function indiaDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function campaignIsComplete(c: Campaign) {
  return (
    [
      c.brand,
      c.industry,
      c.product,
      c.description,
      c.location,
      c.interests,
      c.audience,
    ].every((value) => value.trim()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(c.start) &&
    Number.isInteger(c.budget) &&
    c.budget >= 1000 &&
    c.budget <= 1e9 &&
    Number.isInteger(c.duration) &&
    c.duration >= 1 &&
    c.duration <= 365
  );
}
export type Metric = {
  date: string;
  reach: number;
  impressions: number;
  engagements: number;
  clicks: number;
  conversions: number;
  spend: number;
};
export function totals(rows: Metric[]) {
  const sums = rows.reduce(
    (a, r) => ({
      reach: a.reach + r.reach,
      impressions: a.impressions + r.impressions,
      engagements: a.engagements + r.engagements,
      clicks: a.clicks + r.clicks,
      conversions: a.conversions + r.conversions,
      spend: a.spend + r.spend,
    }),
    {
      reach: 0,
      impressions: 0,
      engagements: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    },
  );
  return {
    ...sums,
    engagementRate: sums.impressions
      ? (100 * sums.engagements) / sums.impressions
      : 0,
    ctr: sums.impressions ? (100 * sums.clicks) / sums.impressions : 0,
    cpe: sums.engagements ? sums.spend / sums.engagements : 0,
  };
}
