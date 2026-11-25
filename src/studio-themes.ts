import type { BrandKit } from "./data";

export const colours = [
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["surface", "Canvas"],
  ["accent", "Accent"],
  ["detail", "Detail"],
] as const;
export const fonts: Record<string, string> = {
  "Space Grotesk": '"Space Grotesk Variable", sans-serif',
  Manrope: '"Manrope Variable", sans-serif',
  Georgia: "Georgia, serif",
  Garamond: 'Garamond, "Palatino Linotype", Georgia, serif',
  Arial: "Arial, sans-serif",
  Impact: "Impact, Haettenschweiler, sans-serif",
  "Courier New": '"Courier New", monospace',
  "Trebuchet MS": '"Trebuchet MS", sans-serif',
};
export const industries = [
  "Lifestyle",
  "Fashion",
  "Jewellery",
  "Beauty",
  "Technology",
  "Food",
  "Luxury",
  "Hospitality",
  "Wellness",
  "Creative services",
];
export const personalities = [
  "Minimal",
  "Bold",
  "Luxury",
  "Playful",
  "Modern",
  "Editorial",
  "Warm",
  "Calm",
  "Nostalgic",
];

type Theme = {
  id: string;
  name: string;
  description: string;
  sample: string;
  tagline: string;
  palette: [string, string, string, string, string];
  type: [string, string];
  tags: [string, string];
};
export const themes: Theme[] = [
  {
    id: "quiet",
    name: "Quiet Luxury",
    description: "Fine lines, muted metals and space to breathe.",
    sample: "Maison Vale",
    tagline: "Considered in every detail.",
    palette: ["#392921", "#DFC9A1", "#F7F0E5", "#B99A65", "#867264"],
    type: ["Garamond", "Manrope"],
    tags: ["Luxury", "Considered"],
  },
  {
    id: "soft",
    name: "Soft Girl",
    description: "Powdery pinks and tender, whimsical shapes.",
    sample: "Dear Sunday",
    tagline: "Make room for little joys.",
    palette: ["#533653", "#F2C6D2", "#FFF4E8", "#D8C4EA", "#AD6E89"],
    type: ["Georgia", "Trebuchet MS"],
    tags: ["Playful", "Romantic"],
  },
  {
    id: "editorial",
    name: "Editorial Minimalism",
    description: "Monochrome, strong type and deliberate negative space.",
    sample: "Form Journal",
    tagline: "Objects worth a closer look.",
    palette: ["#1B1B1B", "#D7D3CB", "#FFFFFF", "#89847E", "#EAE7E2"],
    type: ["Space Grotesk", "Arial"],
    tags: ["Editorial", "Precise"],
  },
  {
    id: "earth",
    name: "Earthy Organic",
    description: "Plant tones and clay colours with a handcrafted feel.",
    sample: "Morrow Field",
    tagline: "Rooted in the everyday.",
    palette: ["#384538", "#C6CEAE", "#F3E4D0", "#B96346", "#876A50"],
    type: ["Garamond", "Manrope"],
    tags: ["Warm", "Grounded"],
  },
  {
    id: "bold",
    name: "Modern Bold",
    description: "Sharp geometry and electric colour built for impact.",
    sample: "Offbeat",
    tagline: "Turn up the signal.",
    palette: ["#23202B", "#AB84FF", "#F7EFFF", "#FF813E", "#6834E7"],
    type: ["Impact", "Space Grotesk"],
    tags: ["Bold", "Energetic"],
  },
  {
    id: "coast",
    name: "Coastal Calm",
    description: "An airy mix of powder blue, sun-warmed sand and ivory.",
    sample: "Low Tide",
    tagline: "Move with the tide.",
    palette: ["#254754", "#B8D5EA", "#FCF7EA", "#DCC49B", "#5E8E9F"],
    type: ["Garamond", "Trebuchet MS"],
    tags: ["Calm", "Airy"],
  },
  {
    id: "retro",
    name: "Vintage Retro",
    description: "Warm ink and playful curves with a printed feel.",
    sample: "Goldie Goods",
    tagline: "Good things come around.",
    palette: ["#641F35", "#E3B54A", "#F9EACD", "#828B42", "#D17D54"],
    type: ["Georgia", "Courier New"],
    tags: ["Nostalgic", "Expressive"],
  },
  {
    id: "beauty",
    name: "Clean Beauty",
    description: "Soft peaches and open layouts with a gentle polish.",
    sample: "Petal Ritual",
    tagline: "A little care goes a long way.",
    palette: ["#4B3536", "#F5CBD0", "#FFF8F1", "#E9AA93", "#AA776B"],
    type: ["Garamond", "Manrope"],
    tags: ["Minimal", "Gentle"],
  },
  {
    id: "dark",
    name: "Dark Luxury",
    description: "Deep emerald and gilded details for a dramatic finish.",
    sample: "Noir Reserve",
    tagline: "An after-dark affair.",
    palette: ["#EBD5A0", "#123C32", "#101815", "#C9A458", "#276052"],
    type: ["Garamond", "Manrope"],
    tags: ["Luxury", "Dramatic"],
  },
  {
    id: "play",
    name: "Playful Creative",
    description: "Candy-coloured blocks and offbeat, confident shapes.",
    sample: "Good Form",
    tagline: "Good ideas, better together.",
    palette: ["#382451", "#DDCCF3", "#F4C2AD", "#F7DB83", "#BCCFA5"],
    type: ["Space Grotesk", "Manrope"],
    tags: ["Playful", "Inventive"],
  },
];

export const industryThemes: Record<string, string> = {
  Lifestyle: "play",
  Fashion: "bold",
  Jewellery: "quiet",
  Beauty: "beauty",
  Technology: "editorial",
  Food: "retro",
  Luxury: "dark",
  Hospitality: "coast",
  Wellness: "earth",
  "Creative services": "play",
};

export type StudioKit = Required<BrandKit>;
export const themeById = (id?: string) =>
  themes.find((theme) => theme.id === id);
export function applyTheme(
  theme: Theme,
  brand: Pick<StudioKit, "name" | "tagline" | "industry">,
): StudioKit {
  const [primary, secondary, surface, accent, detail] = theme.palette;
  const [headingFont, bodyFont] = theme.type;
  return {
    ...brand,
    primary,
    secondary,
    surface,
    accent,
    detail,
    headingFont,
    bodyFont,
    font: headingFont + " / " + bodyFont,
    theme: theme.id,
    personality: theme.tags[0],
  };
}
export const defaultKit = applyTheme(themes[9], {
  name: "Good Form",
  tagline: "Good ideas, better together.",
  industry: "Lifestyle",
});
export const sampleKit = (theme: Theme) =>
  applyTheme(theme, {
    name: theme.sample,
    tagline: theme.tagline,
    industry: "Lifestyle",
  });

export function normalizeKit(kit: BrandKit): StudioKit {
  const theme = themeById(kit.theme);
  const base = theme ? applyTheme(theme, kitWithTagline(kit)) : defaultKit;
  const [heading, body] = (kit.font ?? "").split(" / ");
  const headingFont = [kit.headingFont, heading, base.headingFont].find(
    (font) => font && Object.hasOwn(fonts, font),
  )!;
  const bodyFont = [kit.bodyFont, body, base.bodyFont].find(
    (font) => font && Object.hasOwn(fonts, font),
  )!;
  const result: StudioKit = {
    ...base,
    ...kit,
    theme: theme?.id ?? "custom",
    tagline: kit.tagline ?? "",
    headingFont,
    bodyFont,
    font: headingFont + " / " + bodyFont,
  };
  for (const [field] of colours) {
    if (!/^#[0-9a-f]{6}$/i.test(result[field])) result[field] = base[field];
  }
  return result;
}
function kitWithTagline(kit: BrandKit) {
  return { name: kit.name, industry: kit.industry, tagline: kit.tagline ?? "" };
}

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
export function readableInk(ink: string, background: string) {
  const a = luminance(ink);
  const b = luminance(background);
  if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5) return ink;
  return b > 0.179 ? "#000000" : "#FFFFFF";
}

export function guidelines(kit: StudioKit) {
  return [
    "Use " +
      kit.headingFont +
      " for headlines and " +
      kit.bodyFont +
      " for body copy, labels and captions.",
    "Use " +
      kit.surface.toUpperCase() +
      " for backgrounds. Start with " +
      kit.primary.toUpperCase() +
      " for text, checking contrast before publishing.",
    "Use " +
      kit.secondary.toUpperCase() +
      " for large colour blocks, " +
      kit.accent.toUpperCase() +
      " for highlights and " +
      kit.detail.toUpperCase() +
      " for small graphic details.",
    "Keep the " +
      kit.personality.toLowerCase() +
      " voice consistent across " +
      kit.industry.toLowerCase() +
      " touchpoints. Leave clear space around the wordmark.",
    "Keep essential text inside the centre of Instagram stories so app controls do not cover it.",
  ];
}
