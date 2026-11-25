import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "./content";
import { totals } from "./domain";
import { remove, save } from "./data";
import {
  ButtonLink,
  Notice,
  Page,
  RowsStatus,
  useRows,
  useSession,
} from "./ui";
import { Field, useAction } from "./tools";

export function Discovery() {
  const { user } = useSession();
  const data = useRows("creators");
  const shortlist = useRows("creator_shortlists");
  const campaigns = useRows("campaigns");
  const action = useAction();
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("");
  const [budget, setBudget] = useState("");
  const [engagement, setEngagement] = useState("");
  const [sort, setSort] = useState("engagement");
  const [compare, setCompare] = useState<string[]>([]);
  const [campaign, setCampaign] = useState("");
  const all = data.rows.map((r) => r.data);
  const filtered = all
    .filter(
      (c) =>
        [c.name, c.niche, c.portfolio].some((v) =>
          v.toLowerCase().includes(search.toLowerCase()),
        ) &&
        (!niche || c.niche === niche) &&
        (!platform || c.platform === platform) &&
        (!budget || c.cost <= Number(budget)) &&
        c.engagement >= Number(engagement),
    )
    .sort((a, b) =>
      sort === "cost"
        ? a.cost - b.cost
        : sort === "followers"
          ? b.followers - a.followers
          : b.engagement - a.engagement,
    );
  const compared = all.filter((c) => compare.includes(c.id));
  function toggle(id: string) {
    setCompare((old) =>
      old.includes(id)
        ? old.filter((i) => i !== id)
        : old.length < 3
          ? [...old, id]
          : old,
    );
  }
  function add(id: string) {
    const row = campaigns.rows.find((r) => r.id === campaign);
    if (!row || !user) return;
    void action.run(async () => {
      await save(
        "campaigns",
        { ...row.data, creators: [...new Set([...row.data.creators, id])] },
        user,
        row.id,
      );
      campaigns.refresh();
    }, "Creator added to campaign.");
  }
  return (
    <Page
      label="Creator discovery"
      title="Find the right voices."
      intro="Browse creator profiles supplied by the agency. Availability and quoted fees should be confirmed with each creator."
    >
      <div className="card filters">
        <Field label="Search creators">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Niche">
          <select value={niche} onChange={(e) => setNiche(e.target.value)}>
            <option value="">All niches</option>
            {[...new Set(all.map((c) => c.niche))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Platform">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">All platforms</option>
            {[...new Set(all.map((c) => c.platform))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Maximum cost (INR)">
          <input
            type="number"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </Field>
        <Field label="Minimum engagement (%)">
          <input
            type="number"
            min="0"
            max="100"
            step=".1"
            value={engagement}
            onChange={(e) => setEngagement(e.target.value)}
          />
        </Field>
        <Field label="Sort by">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="engagement">Engagement</option>
            <option value="followers">Followers</option>
            <option value="cost">Lowest cost</option>
          </select>
        </Field>
      </div>
      {user ? (
        <div className="inline-controls">
          <Field label="Campaign for creator additions">
            <select
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              <option value="">Select a campaign</option>
              {campaigns.rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.data.brand}
                </option>
              ))}
            </select>
          </Field>
          <Link to="/planner">Create campaign</Link>
        </div>
      ) : (
        <p>
          <Link to="/login">Sign in</Link> to shortlist creators or add them to
          a campaign.
        </p>
      )}
      <Notice
        error={action.error || shortlist.error || campaigns.error}
        success={action.success}
      />
      {compared.length > 0 && (
        <section className="card comparison">
          <h2>Compare creators</h2>
          <p>Select up to three creators.</p>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Creator comparison</caption>
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  {compared.map((c) => (
                    <th key={c.id} scope="col">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    "platform",
                    "followers",
                    "engagement",
                    "cost",
                    "audience",
                  ] as const
                ).map((k) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    {compared.map((c) => (
                      <td key={c.id}>
                        {k === "cost"
                          ? money(c[k])
                          : k === "engagement"
                            ? c[k] + "%"
                            : c[k].toLocaleString("en-IN")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <RowsStatus
        {...data}
        empty={!filtered.length}
        text="No creators match these filters."
      />
      <div className="grid three">
        {filtered.map((c) => {
          const saved = shortlist.rows.find(
            (r) => r.data.creator === c.id && r.user_id === user?.id,
          );
          return (
            <article className="card creator-card" key={c.id}>
              <span className="avatar" aria-hidden="true">
                {c.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </span>
              <p className="eyebrow">
                {c.niche} / {c.platform}
              </p>
              <h2>{c.name}</h2>
              <dl className="creator-stats">
                <div>
                  <dt>Followers</dt>
                  <dd>{c.followers.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Engagement</dt>
                  <dd>{c.engagement}%</dd>
                </div>
                <div>
                  <dt>Est. cost</dt>
                  <dd>{money(c.cost)}</dd>
                </div>
              </dl>
              <p>{c.audience}</p>
              <p>{c.portfolio}</p>
              <div className="actions">
                <button
                  className="button secondary"
                  aria-pressed={compare.includes(c.id)}
                  disabled={compare.length === 3 && !compare.includes(c.id)}
                  onClick={() => toggle(c.id)}
                >
                  {compare.includes(c.id) ? "Remove comparison" : "Compare"}
                </button>
                {user && (
                  <button
                    className="button secondary"
                    aria-pressed={Boolean(saved)}
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        async () => {
                          if (saved)
                            await remove("creator_shortlists", saved.id, user);
                          else
                            await save(
                              "creator_shortlists",
                              { creator: c.id },
                              user,
                            );
                          shortlist.refresh();
                        },
                        saved
                          ? "Removed from shortlist."
                          : "Added to shortlist.",
                      )
                    }
                  >
                    {saved ? "Unshortlist" : "Shortlist"}
                  </button>
                )}
                {campaign && (
                  <button
                    className="button primary"
                    disabled={action.busy}
                    onClick={() => add(c.id)}
                  >
                    Add to campaign
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Page>
  );
}
export function Analytics() {
  const data = useRows("campaign_metrics");
  const campaigns = useRows("campaigns");
  const [id, setId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = data.rows
    .map((r) => r.data)
    .filter(
      (r) =>
        (!id || r.campaign === id) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to),
    );
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const chart = dates.map((date) => ({
    date,
    ...totals(rows.filter((r) => r.date === date)),
  }));
  const t = totals(rows);
  const stats = [
    ["Daily reach sum", t.reach.toLocaleString("en-IN")],
    ["Impressions", t.impressions.toLocaleString("en-IN")],
    ["Engagement rate", t.engagementRate.toFixed(2) + "%"],
    ["Click-through rate", t.ctr.toFixed(2) + "%"],
    ["Conversions", t.conversions.toLocaleString("en-IN")],
    ["Budget spent", money(t.spend)],
    ["Cost per engagement", money(t.cpe)],
  ];
  return (
    <div>
      <div className="card filters">
        <Field label="Campaign">
          <select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">All campaigns</option>
            {campaigns.rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.data.brand}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input
            type="date"
            max={to || undefined}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            min={from || undefined}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <Notice
        error={
          campaigns.error ||
          (from && to && from > to
            ? "The end date must be on or after the start date."
            : "")
        }
      />
      <RowsStatus
        {...data}
        empty={!rows.length}
        text="There are no metric records for this selection."
      />
      {rows.length > 0 && (
        <>
          <div className="grid four metrics">
            {stats.map(([name, value]) => (
              <div className="card" key={name}>
                <p>{name}</p>
                <h3>{value}</h3>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Daily campaign performance</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chart}
                  accessibilityLayer
                  margin={{ left: 4, right: 18, top: 12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(s) => s.slice(5)} />
                  <YAxis width={55} />
                  <Tooltip />
                  <Line
                    name="Impressions"
                    type="monotone"
                    dataKey="impressions"
                    stroke="#7047eb"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    name="Reach"
                    type="monotone"
                    dataKey="reach"
                    stroke="#b94425"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p>
              Reach is summed from daily records. Rates use impressions as the
              denominator.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
export function AnalyticsPage() {
  return (
    <Page
      label="Campaign analytics"
      title="See how campaigns perform."
      intro="Metrics are entered by the agency. Connect authorized reporting sources before using external performance data."
    >
      <Analytics />
      <ButtonLink to="/dashboard" kind="secondary">
        Back to workspace
      </ButtonLink>
    </Page>
  );
}
