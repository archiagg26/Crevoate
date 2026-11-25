import type { CalendarEntry } from "./campaign-ideas";
import type { Campaign } from "./domain";
import { backend, supabase } from "./data";

export const calendarFormats = [
  "Reel",
  "Story",
  "Carousel",
  "Static post",
  "Influencer collaboration",
];
export const calendarStatuses = [
  "Draft",
  "In Progress",
  "Ready",
  "Scheduled",
  "Published",
];
export const entryStatus = (entry: CalendarEntry) =>
  entry.status === "In production" ? "In Progress" : entry.status;
export const formatClass = (format: string) => {
  const key = format.toLowerCase();
  if (/influencer|collab|ugc/.test(key)) return "influencer";
  if (/reel|video|short|film/.test(key)) return "reel";
  if (/stor(y|ies)/.test(key)) return "story";
  if (/carousel|slide/.test(key)) return "carousel";
  return "static";
};
export const dateISO = (date: Date) => date.toISOString().slice(0, 10);
export function addDays(date: string, n: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + n);
  return dateISO(value);
}
export const dateLabel = (
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => {
  const value = new Date(date + "T00:00:00Z");
  return Number.isFinite(value.getTime())
    ? new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" }).format(
        value,
      )
    : "Unscheduled";
};

export function phasePlan(campaign: Campaign) {
  const start = campaign.start || dateISO(new Date());
  const days = Math.max(
    1,
    Math.min(365, Math.round(Number(campaign.duration) || 1)),
  );
  const conversion = /sales|lead|conversion/i.test(campaign.objective);
  const labels = [
    ...(days >= 8 ? ["Pre-launch & teaser"] : []),
    "Launch",
    ...(days >= 4 ? ["Engagement & amplification"] : []),
    ...(days >= 6 && conversion ? ["Conversion"] : []),
    ...(days >= 8 ? ["Post-campaign follow-up"] : []),
  ];
  const starts = labels.map((_, index) =>
    Math.floor((index * days) / labels.length),
  );
  return labels.map((label, index) => ({
    label,
    start: addDays(start, starts[index]),
    end: addDays(start, (starts[index + 1] ?? days) - 1),
  }));
}

export function calendarCsv(entries: CalendarEntry[]) {
  const keys = [
    "date",
    "time",
    "platform",
    "format",
    "idea",
    "objective",
    "status",
    "concept",
    "caption",
    "hook",
    "hashtags",
    "cta",
    "visual",
    "script",
    "notes",
  ] as const;
  return [keys, ...entries.map((item) => keys.map((key) => item[key] ?? ""))]
    .map((row) =>
      row
        .map(
          (value) =>
            '"' +
            (/^\s*[=+\-@]/.test(value) ? "'" : "") +
            value.replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}

export async function generateCalendar(
  campaignId: string,
  entry?: CalendarEntry,
): Promise<CalendarEntry[]> {
  const { data, error } = await backend().functions.invoke<{
    entries?: CalendarEntry[];
    error?: string;
  }>("campaign-calendar", {
    body: { campaignId, entry },
  });
  if (error || !data?.entries?.length)
    throw new Error(await generationError(error, data?.error));

  return data.entries;
}
async function generationError(error: unknown, detail?: string) {
  if (
    error instanceof Error &&
    "context" in error &&
    error.context instanceof Response
  ) {
    try {
      const payload = await error.context.json();
      if (typeof payload?.error === "string") return payload.error;
    } catch {
      // The function gateway may return a non-JSON response.
    }
  }
  return (
    detail ||
    "AI generation is unavailable. You can still add and edit content manually."
  );
}
const bucket = "campaign-creative";
const supportedImages = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export async function uploadCalendarAsset(
  file: File,
  userId: string,
  campaignId: string,
) {
  if (!supportedImages.includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a JPEG, PNG, WebP or AVIF image under 5 MB.");
  const path =
    userId +
    "/" +
    campaignId +
    "/" +
    crypto.randomUUID() +
    "." +
    file.type.split("/")[1];
  const { error } = await backend().storage.from(bucket).upload(path, file);
  if (error) throw error;
  return path;
}

export async function calendarAssetUrl(path: string) {
  if (
    !supabase ||
    !/^[a-f\d-]+\/[a-f\d-]+\/[a-f\d-]+\.(jpeg|png|webp|avif)$/i.test(path)
  )
    return "";
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}
