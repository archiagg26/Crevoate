export const services = [
  {
    id: "ui-ux",
    name: "UI/UX Design",
    line: "Digital products people enjoy using.",
    icon: "◎",
    days: 21,
    price: 45000,
    outputs: [
      "User research synthesis",
      "Interaction flows",
      "High-fidelity prototype",
      "Design system",
    ],
  },
  {
    id: "web-development",
    name: "Website Development",
    line: "Fast, expressive websites built to last.",
    icon: "⌘",
    days: 28,
    price: 60000,
    outputs: [
      "Responsive frontend",
      "CMS handover",
      "Accessibility checks",
      "Launch checklist",
    ],
  },
  {
    id: "influencer-marketing",
    name: "Influencer Marketing",
    line: "Find the voices your audience listens to.",
    icon: "✳",
    days: 28,
    price: 50000,
    outputs: [
      "Creator shortlist",
      "Outreach briefs",
      "Content review",
      "Performance report",
    ],
  },
  {
    id: "branding",
    name: "Brand Identity & Strategy",
    line: "Give your brand a point of view.",
    icon: "✦",
    days: 21,
    price: 55000,
    outputs: [
      "Positioning",
      "Visual identity",
      "Typography and colour",
      "Brand guidelines",
    ],
  },
  {
    id: "social-media",
    name: "Social Media Marketing",
    line: "Build a rhythm your community can follow.",
    icon: "◉",
    days: 30,
    price: 35000,
    outputs: [
      "Channel strategy",
      "Content calendar",
      "Social templates",
      "Monthly review",
    ],
  },
  {
    id: "campaign-production",
    name: "Creative Campaign Production",
    line: "Make the big idea tangible.",
    icon: "◇",
    days: 35,
    price: 75000,
    outputs: [
      "Campaign concept",
      "Art direction",
      "Production plan",
      "Launch assets",
    ],
  },
  {
    id: "content",
    name: "Content & Visual Storytelling",
    line: "Make every frame say something.",
    icon: "▧",
    days: 21,
    price: 40000,
    outputs: [
      "Editorial concept",
      "Shot list",
      "Photo and video direction",
      "Final asset library",
    ],
  },
];
export type PortfolioProject = {
  id: string;
  name: string;
  sector: string;
  category: string;
  color: string;
  ink: string;
  style: string;
  intro: string;
  problem: string;
  audience: string;
  strategy: string;
  process: string;
  identity: string;
  deliverables: string;
  liveUrl?: string;
};

export const dissaraProject: PortfolioProject = {
  id: "dissara",
  name: "Dissara",
  sector: "Jewellery",
  category: "Web Development",
  color: "#f4df8b",
  ink: "#292116",
  style: "ora",
  intro: "A live jewellery storefront featuring collections for everyday wear.",
  problem: "",
  audience: "",
  strategy: "",
  process: "",
  identity: "",
  deliverables: "",
  liveUrl: "https://www.dissara.com/",
};

export function projectWebsite(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export const projects: PortfolioProject[] = [
  {
    id: "ora",
    name: "ORA Objects",
    sector: "Jewellery",
    category: "Branding",
    color: "#e9d8b8",
    ink: "#292116",
    style: "ora",
    intro:
      "An identity for jewellery that becomes part of your everyday rituals.",
    problem:
      "Fine jewellery can feel reserved for special occasions. ORA needed a visual language that made meaningful pieces feel personal and approachable.",
    audience: "Design-conscious shoppers looking for everyday heirlooms.",
    strategy:
      "Pair sculptural product styling with a warm, quiet editorial system.",
    process:
      "Explore material palettes, refine the wordmark, and prototype packaging and product pages.",
    identity: "Champagne, ink and restrained serif typography.",
    deliverables:
      "Wordmark, packaging system, art direction and ecommerce concepts.",
  },
  {
    id: "bloom",
    name: "Bloom Theory",
    sector: "Skincare",
    category: "UI/UX",
    color: "#d7e3bd",
    ink: "#29371b",
    style: "bloom",
    intro: "A clearer shopping experience for a calmer skincare routine.",
    problem:
      "A crowded product catalogue made it hard to build a simple routine.",
    audience:
      "Skincare shoppers who value ingredient transparency and practical advice.",
    strategy: "Organize the experience around routine steps and skin concerns.",
    process:
      "Map shopping journeys, prototype comparison cards and design mobile product pages.",
    identity: "Botanical green, warm paper and generous typography.",
    deliverables:
      "Shopping flows, reusable product components and a clickable design concept.",
  },
  {
    id: "offbeat",
    name: "Offbeat Dept.",
    sector: "Fashion",
    category: "Creative Campaigns",
    color: "#ff8968",
    ink: "#281629",
    style: "offbeat",
    intro: "A streetwear launch built around the people who wear it.",
    problem:
      "The capsule needed a recognisable idea it could carry from launch to creator content.",
    audience:
      "Style-led young adults who discover fashion through communities and creators.",
    strategy: "Use expressive typography and day-in-the-life creative briefs.",
    process:
      "Develop the creative line, storyboard short-form edits and build a creator toolkit.",
    identity: "Electric orange, deep plum and offset lettering.",
    deliverables:
      "Launch concept, campaign artwork, creator briefs and social formats.",
  },
  {
    id: "easy",
    name: "Easy Hours",
    sector: "Lifestyle",
    category: "Web Development",
    color: "#dcd1fa",
    ink: "#301b4c",
    style: "easy",
    intro: "A digital home for objects that make the day feel easier.",
    problem:
      "A small collection needed a storefront that made product details easy to explore.",
    audience:
      "People looking for thoughtful, practical objects for home and work.",
    strategy:
      "Use modular editorial storytelling with a direct path to product details.",
    process:
      "Map site navigation, prototype a responsive catalogue and set content rules.",
    identity: "Lavender, ink and a geometric display face.",
    deliverables:
      "Responsive storefront concept, content modules and product-page patterns.",
  },
];
export type Creator = {
  id: string;
  name: string;
  niche: string;
  platform: string;
  followers: number;
  engagement: number;
  cost: number;
  audience: string;
  portfolio: string;
};
export const faq = [
  [
    "Can I combine services?",
    "Yes. Select the services you need in the project brief so we can estimate them together.",
  ],
  [
    "How long does a project take?",
    "Most scopes take three to five weeks. The estimate on each service page is a starting point.",
  ],
  [
    "How do I access my workspace?",
    "Sign in to see your projects, save campaign plans and manage brand kits.",
  ],
];
export const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
