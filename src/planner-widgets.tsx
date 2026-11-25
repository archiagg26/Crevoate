export { ContentCalendar } from "./content-calendar";
import { money } from "./content";
import {
  budgetAmounts,
  budgetBuckets,
  rebalanceAllocation,
} from "./campaign-ideas";
import { type Campaign, type planCampaign } from "./domain";

export function SuggestionChips({
  label,
  items,
  selected = [],
  choose,
}: {
  label: string;
  items: string[];
  selected?: string[];
  choose: (item: string) => void;
}) {
  return (
    <div className="smart-chips">
      <strong>{label}</strong>
      <div className="chips">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={selected.includes(item)}
            onClick={() => choose(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
export function BudgetVisual({
  budget,
  allocation,
  change,
}: {
  budget: number;
  allocation: number[];
  change?: (next: number[]) => void;
}) {
  const colors = ["#7047eb", "#ff7043", "#c1d2aa", "#f4df8b", "#d8c9eb"];
  const amounts = budgetAmounts(budget, allocation);
  let offset = 0;
  const gradient = allocation
    .map((value, i) => {
      const start = offset;
      offset += value;
      return colors[i] + " " + start + "% " + offset + "%";
    })
    .join(",");
  return (
    <section className="budget-visual" aria-label="Budget allocation">
      <div
        className="budget-ring"
        style={{ background: "conic-gradient(" + gradient + ")" }}
      >
        <div>
          <small>Total allocation</small>
          <strong>100%</strong>
        </div>
      </div>
      <div className="budget-items">
        {budgetBuckets.map((label, i) => (
          <div key={label}>
            <span className="budget-key" style={{ background: colors[i] }} />
            <span>{label}</span>
            {change ? (
              <input
                type="number"
                min="0"
                max="100"
                aria-label={label + " percentage"}
                value={allocation[i]}
                onChange={(e) =>
                  change(
                    rebalanceAllocation(allocation, i, e.target.valueAsNumber),
                  )
                }
              />
            ) : (
              <strong>{allocation[i]}%</strong>
            )}
            <small>{money(amounts[i])}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
export async function exportCampaignPdf(
  campaign: Campaign,
  plan: ReturnType<typeof planCampaign>,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  let y = 22;
  function write(text: string, size = 11) {
    pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(text, 166) as string[]) {
      if (y > 276) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, 22, y);
      y += size >= 16 ? 10 : 6;
    }
  }
  write("CREOVATE / CAMPAIGN PLAN");
  write(plan.concept, 22);
  const sections: [string, string[]][] = [
    ["Brand overview", [campaign.description]],
    ["Campaign strategy", [plan.strategy]],
    [
      "Audience",
      [
        campaign.audience,
        campaign.age,
        campaign.location,
        campaign.interests,
        campaign.behaviour ?? "",
        campaign.platforms ?? "",
      ],
    ],
    ["Goal and channels", [campaign.objective, ...plan.channels]],
    ["Influencer strategy", plan.creators],
    ["Content", plan.formats],
    [
      "Budget",
      Object.entries(plan.budget).map(
        ([label, value]) => label + " - INR " + value,
      ),
    ],
    ["Milestones", plan.milestones],
    ["KPIs", plan.kpis],
    ["Next steps", plan.next],
    [
      "Calendar",
      plan.calendar.map((entry) =>
        [
          entry.date,
          entry.platform,
          entry.format,
          entry.idea,
          entry.caption,
          entry.objective,
          entry.status,
        ].join(" / "),
      ),
    ],
  ];
  for (const [heading, lines] of sections) {
    y += 3;
    write(heading, 16);
    for (const line of lines.filter(Boolean)) write(line);
  }
  pdf.save("creovate-campaign.pdf");
}
