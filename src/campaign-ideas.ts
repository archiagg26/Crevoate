export const industries = [
  "Jewellery",
  "Fashion",
  "Beauty and skincare",
  "Lifestyle",
  "Food and beverages",
  "Technology",
  "Healthcare",
  "Education",
  "Other",
];

export const industryIdeas: Record<
  string,
  {
    products: string[];
    audience: string;
    interests: string;
    concept: string;
    formats: string[];
    creators: string[];
    objectives: string[];
    channels: string[];
  }
> = {
  Jewellery: {
    products: [
      "Minimal everyday jewellery",
      "Gold-plated jewellery",
      "Anti-tarnish jewellery",
      "Bridal jewellery",
      "Luxury fine jewellery",
      "Personalized jewellery",
    ],
    audience: "Style-led shoppers and gift buyers",
    interests: "Jewellery styling, festive gifting",
    concept: "Pieces worth keeping",
    formats: [
      "Styling reel",
      "Product unboxing",
      "Festive collection carousel",
      "Gifting guide",
    ],
    creators: ["Fashion creators", "Lifestyle influencers", "Bridal stylists"],
    objectives: ["Product launch", "Sales"],
    channels: ["Instagram", "Influencer collaborations", "Digital advertising"],
  },
  Fashion: {
    products: ["Capsule collection", "Streetwear", "Occasionwear"],
    audience: "Style-conscious shoppers",
    interests: "Outfit inspiration, independent labels",
    concept: "Wear it your way",
    formats: ["Fit-check reel", "Lookbook", "Behind-the-scenes edit"],
    creators: ["Fashion creators", "Streetwear reviewers"],
    objectives: ["Product launch", "Engagement"],
    channels: ["Instagram", "YouTube", "Influencer collaborations"],
  },
  "Beauty and skincare": {
    products: ["Daily skincare", "Haircare", "Makeup"],
    audience: "Routine-focused beauty shoppers",
    interests: "Ingredients, routines and reviews",
    concept: "Make the routine yours",
    formats: ["Routine demo", "Ingredient explainer", "Texture close-up"],
    creators: ["Beauty reviewers", "Lifestyle creators"],
    objectives: ["Engagement", "Sales"],
    channels: ["Instagram", "YouTube", "Influencer collaborations"],
  },
  Lifestyle: {
    products: ["Homeware", "Desk accessories", "Wellness products"],
    audience: "Design-minded everyday shoppers",
    interests: "Daily rituals, thoughtful design",
    concept: "in everyday life",
    formats: [
      "Day-in-the-life video",
      "Product flat lay",
      "Creator walkthrough",
    ],
    creators: ["Home and lifestyle creators", "Design reviewers"],
    objectives: ["Brand awareness", "Product launch"],
    channels: ["Instagram", "YouTube"],
  },
  "Food and beverages": {
    products: ["Packaged snacks", "Specialty drinks", "Restaurant launch"],
    audience: "Food explorers and local diners",
    interests: "Recipes, new menus and tastings",
    concept: "Make room for flavour",
    formats: ["Recipe short", "Taste test", "Menu reveal"],
    creators: ["Food reviewers", "Recipe creators"],
    objectives: ["Product launch", "Sales"],
    channels: ["Instagram", "YouTube", "Brand events"],
  },
  Technology: {
    products: ["SaaS", "Mobile app", "Consumer electronics"],
    audience: "Early adopters and decision-makers",
    interests: "Productivity, product demos",
    concept: "A better way to work",
    formats: ["Workflow demo", "Founder Q&A", "Product comparison"],
    creators: ["Product educators", "Technology reviewers"],
    objectives: ["Lead generation", "Product launch"],
    channels: ["LinkedIn", "YouTube", "Digital advertising"],
  },
  Healthcare: {
    products: ["Clinic services", "Wellness programme", "Patient education"],
    audience: "Care-seekers and family decision-makers",
    interests: "Preventive care, trusted local resources",
    concept: "Clarity at every step",
    formats: ["Expert Q&A", "Service explainer", "Appointment guide"],
    creators: ["Credentialed educators", "Wellness communicators"],
    objectives: ["Brand awareness", "Lead generation"],
    channels: ["YouTube", "LinkedIn", "Digital advertising"],
  },
  Education: {
    products: ["Online courses", "Workshops", "Test preparation"],
    audience: "Learners and career switchers",
    interests: "Skills, learning outcomes",
    concept: "Learn by doing",
    formats: ["Mini lesson", "Learner Q&A", "Skills checklist"],
    creators: ["Subject educators", "Career creators"],
    objectives: ["Lead generation", "Community growth"],
    channels: ["YouTube", "LinkedIn", "Instagram"],
  },
  Other: {
    products: ["Physical product", "Digital service", "Local experience"],
    audience: "People actively researching their options",
    interests: "Useful comparisons, trusted reviews",
    concept: "in everyday life",
    formats: ["Product walkthrough", "Customer Q&A", "Behind-the-scenes post"],
    creators: ["Niche educators", "Local creators"],
    objectives: ["Brand awareness", "Engagement"],
    channels: ["Instagram", "YouTube"],
  },
};
export const getIndustryIdeas = (industry: string) =>
  industryIdeas[
    industries.find(
      (item) => item.toLowerCase() === industry.trim().toLowerCase(),
    ) ?? "Other"
  ];
export const budgetBuckets = [
  "Influencer marketing",
  "Paid advertisements",
  "Content production",
  "Creative design",
  "Contingency",
] as const;
export function suggestedAllocation(budget: number, objective: string) {
  if (budget < 15000) return [10, 20, 35, 25, 10];
  if (objective === "Sales" || objective === "Lead generation")
    return [20, 40, 20, 10, 10];
  return [30, 25, 25, 10, 10];
}
export function rebalanceAllocation(
  current: number[],
  index: number,
  input: number,
) {
  const chosen = Math.min(100, Math.max(0, Math.round(input || 0)));
  const others = current.map((value, i) => (i === index ? 0 : value));
  const denominator = others.reduce((sum, value) => sum + value, 0);
  const remaining = 100 - chosen;
  const result = others.map((value, i) =>
    i === index
      ? chosen
      : Math.floor(
          denominator
            ? (remaining * value) / denominator
            : remaining / (others.length - 1),
        ),
  );
  const remainderIndex = others.findIndex((_, i) => i !== index);
  result[remainderIndex] += 100 - result.reduce((sum, value) => sum + value, 0);
  return result;
}
export type CalendarEntry = {
  id: string;
  date: string;
  platform: string;
  format: string;
  idea: string;
  caption: string;
  objective: string;
  status: string;
  time?: string;
  concept?: string;
  hook?: string;
  hashtags?: string;
  cta?: string;
  visual?: string;
  script?: string;
  notes?: string;
  asset?: string;
  origin?: "ai" | "manual";
};

export function budgetAmounts(total: number, allocation: number[]) {
  const budget = Math.max(0, Math.round(total || 0));
  const amounts = allocation.map((percent) =>
    Math.floor((budget * percent) / 100),
  );
  const largest = allocation.indexOf(Math.max(...allocation));
  amounts[largest] += budget - amounts.reduce((sum, value) => sum + value, 0);
  return amounts;
}
