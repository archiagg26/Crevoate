import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  Film,
  LayoutGrid,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { ButtonLink, Page } from "./ui";
import "./demo-workspace.css";

const campaigns = [
  {
    name: "Summer in Full Colour",
    client: "Petal & Pine",
    channel: "Instagram",
    status: "In progress",
    progress: 68,
    next: "Review the launch reel and approve its opening frame.",
    tone: "lilac",
  },
  {
    name: "The Everyday Edit",
    client: "Good Form",
    channel: "Email",
    status: "In progress",
    progress: 42,
    next: "Choose a subject line for the first newsletter.",
    tone: "sage",
  },
  {
    name: "A Softer Launch",
    client: "Morrow Field",
    channel: "Website",
    status: "Planned",
    progress: 0,
    next: "Collect product photography for the landing page.",
    tone: "butter",
  },
  {
    name: "Made to Move",
    client: "Offbeat Goods",
    channel: "Instagram",
    status: "Complete",
    progress: 100,
    next: "Archive the final assets and share campaign learnings.",
    tone: "peach",
  },
] as const;
const statuses = [
  "All campaigns",
  "In progress",
  "Planned",
  "Complete",
] as const;
const checklist = [
  "Review the launch reel",
  "Choose a newsletter subject line",
  "Collect product photography",
];
const storageKey = "creovate.presentation.checklist";
const channelMix = [...new Set(campaigns.map(({ channel }) => channel))].map(
  (channel) => ({
    channel,
    total: campaigns.filter((campaign) => campaign.channel === channel).length,
  }),
);
const average = Math.round(
  campaigns.reduce((sum, campaign) => sum + campaign.progress, 0) /
    campaigns.length,
);

export default function DemoWorkspace() {
  const [filter, setFilter] =
    useState<(typeof statuses)[number]>("All campaigns");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      const data: unknown = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "[]",
      );
      return Array.isArray(data)
        ? checklist.filter((item) => data.includes(item))
        : [];
    } catch {
      return [];
    }
  });
  const shown = campaigns.filter(
    (campaign) =>
      (filter === "All campaigns" || campaign.status === filter) &&
      [campaign.name, campaign.client, campaign.channel].some((value) =>
        value.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  function toggle(item: string) {
    const next = checked.includes(item)
      ? checked.filter((value) => value !== item)
      : [...checked, item];
    setChecked(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Keep the checklist usable in memory. */
    }
  }
  return (
    <Page
      label="Creovate workspace"
      title="Hello, Archi."
      intro="Here’s what’s moving across your campaigns."
    >
      <div className="demo-toolbar">
        <h2>Campaign overview</h2>
        <ButtonLink to="/planner">Plan a campaign</ButtonLink>
      </div>
      <dl className="demo-metrics">
        <div>
          <dt>Total campaigns</dt>
          <dd>{campaigns.length}</dd>
        </div>
        {statuses.slice(1).map((status) => (
          <div key={status}>
            <dt>{status}</dt>
            <dd>
              {
                campaigns.filter((campaign) => campaign.status === status)
                  .length
              }
            </dd>
          </div>
        ))}
      </dl>

      <div className="demo-bento">
        <section className="demo-spotlight">
          <p className="eyebrow">
            <Sparkles size={16} aria-hidden="true" /> In the spotlight
          </p>
          <h2>{campaigns[0].name}</h2>
          <p>{campaigns[0].next}</p>
          <a href="#workspace-campaigns">
            Explore campaigns <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <Film
            className="demo-spotlight-art"
            strokeWidth={1}
            aria-hidden="true"
          />
        </section>
        <section className="demo-panel demo-momentum">
          <h2>Momentum</h2>
          <div
            className="demo-ring"
            role="img"
            aria-label={average + "% average campaign progress"}
            style={{
              background: "conic-gradient(#6638de " + average + "%, #e9dff7 0)",
            }}
          >
            <strong>{average}%</strong>
          </div>
          <p>Average campaign progress</p>
        </section>
        <section className="demo-panel demo-queue">
          <h2>
            <Check size={22} aria-hidden="true" /> On your desk
          </h2>
          <p aria-live="polite">
            {checked.length} of {checklist.length} tasks done
          </p>
          {checklist.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={checked.includes(item)}
                onChange={() => toggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </section>
        <section className="demo-panel demo-channels">
          <h2>
            <LayoutGrid size={19} aria-hidden="true" /> Channel mix
          </h2>
          <ul>
            {channelMix.map(({ channel, total }) => (
              <li key={channel}>
                <span>{channel}</span>
                <strong>{total}</strong>
                <progress
                  aria-label={channel + " campaign count"}
                  value={total}
                  max={campaigns.length}
                />
              </li>
            ))}
          </ul>
        </section>
        <section className="demo-panel demo-toolbox">
          <h2>Creative shortcuts</h2>
          <ButtonLink kind="secondary" to="/studio">
            Open Creative Studio <WandSparkles size={17} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink kind="secondary" to="/planner">
            Build a content plan <CalendarDays size={17} aria-hidden="true" />
          </ButtonLink>
        </section>
      </div>

      <section
        id="workspace-campaigns"
        aria-labelledby="workspace-campaign-title"
      >
        <div className="demo-toolbar">
          <h2 id="workspace-campaign-title">Campaigns</h2>
          <div className="demo-filters">
            <label className="field">
              <span>Search campaigns</span>
              <span className="demo-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Find a campaign"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </span>
            </label>
            <label className="field">
              <span>Filter campaigns</span>
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as typeof filter)
                }
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {!shown.length && (
          <p className="empty">No campaigns match your search and filter.</p>
        )}
        <div className="demo-campaigns">
          {shown.map((campaign) => (
            <article
              className={"demo-campaign demo-" + campaign.tone}
              key={campaign.name}
            >
              <div className="demo-campaign-head">
                <p className="eyebrow">
                  {campaign.client} / {campaign.channel}
                </p>
                <span>
                  <Circle size={9} fill="currentColor" aria-hidden="true" />
                  {campaign.status}
                </span>
              </div>
              <h3>{campaign.name}</h3>
              <div className="demo-progress">
                <progress
                  aria-label={campaign.name + " progress"}
                  value={campaign.progress}
                  max={100}
                />
                <strong>{campaign.progress}%</strong>
              </div>
              <details>
                <summary>Next step</summary>
                <p>{campaign.next}</p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </Page>
  );
}
