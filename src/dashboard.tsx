import { lazy, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  approve,
  auth,
  downloadFile,
  remove,
  save,
  supabase,
  uploadFile,
  type Row,
  type Table,
  type Tables,
} from "./data";
import { money, projectWebsite } from "./content";
import { indiaDate } from "./domain";

import { Field, useAction } from "./tools";
import {
  ButtonLink,
  Notice,
  Page,
  RowsStatus,
  useRows,
  useSession,
} from "./ui";

const Analytics = lazy(() =>
  import("./discovery").then((module) => ({ default: module.Analytics })),
);
const clientTabs = [
  ["overview", "Overview"],
  ["projects", "My projects"],
  ["campaigns", "My campaigns"],
  ["creators", "Saved creators"],
  ["briefs", "Project briefs"],
  ["kits", "Brand kits"],
  ["proposals", "Proposals"],
  ["bookings", "Consultation bookings"],
  ["notifications", "Notifications"],
  ["settings", "Account settings"],
];
const adminTabs = [
  ["overview", "Overview"],
  ["inquiries", "Inquiries"],
  ["projects", "Projects"],
  ["clients", "Clients"],
  ["campaigns", "Campaigns"],
  ["proposals", "Proposals"],
  ["services", "Services"],
  ["portfolio", "Portfolio"],
  ["bookings", "Consultation bookings"],
  ["analytics", "Analytics"],
];
export function Dashboard({ admin = false }: { admin?: boolean }) {
  const [params] = useSearchParams();
  const tabs = admin ? adminTabs : clientTabs;
  const tab = tabs.some(([id]) => id === params.get("tab"))
    ? params.get("tab")!
    : "overview";
  const { user } = useSession();
  const home = admin ? "/admin" : "/dashboard";
  const entries: Record<string, ReactNode> = {
    overview: <Overview admin={admin} />,
    projects: <Projects admin={admin} />,
    campaigns: <Campaigns />,
    creators: <SavedCreators />,
    briefs: <Inquiries admin={false} />,
    inquiries: <Inquiries admin />,
    kits: <Kits />,
    proposals: <Proposals />,
    bookings: <Bookings />,
    notifications: <Notifications />,
    settings: <Settings />,
    clients: <Clients />,
    services: <Catalog table="services" />,
    portfolio: <Catalog table="portfolio" />,
    analytics: <AdminAnalytics />,
  };
  return (
    <Page
      label={admin ? "Agency workspace" : "Client workspace"}
      title={
        tab === "overview"
          ? "Hi, " + user?.name + "."
          : tabs.find(([id]) => id === tab)![1] + "."
      }
    >
      <div className="dashboard-layout">
        <nav className="dashboard-nav" aria-label="Workspace pages">
          {tabs.map(([id, name]) => (
            <Link
              key={id}
              to={home + "?tab=" + id}
              aria-current={tab === id ? "page" : undefined}
            >
              {name}
            </Link>
          ))}
        </nav>
        <section className="dashboard-content" key={tab}>
          {entries[tab]}
        </section>
      </div>
    </Page>
  );
}
function Overview({ admin }: { admin: boolean }) {
  const inquiries = useRows("project_inquiries");
  const projects = useRows("projects");
  const campaigns = useRows("campaigns");
  const proposals = useRows("proposals");
  const notices = useRows("notifications");
  const kits = useRows("brand_kits");
  const bookings = useRows("consultation_bookings");
  const active = projects.rows.filter(
    (row) => !["Completed", "Archived"].includes(row.data.status),
  );
  const upcoming = bookings.rows
    .filter(
      (row) => row.data.status === "booked" && row.data.date >= indiaDate(),
    )
    .sort((a, b) =>
      (a.data.date + a.data.time).localeCompare(b.data.date + b.data.time),
    );
  const stats = [
    [admin ? "Total inquiries" : "Project briefs", inquiries.rows.length],
    [
      "Active projects",
      projects.rows.filter(
        (r) => !["Completed", "Archived"].includes(r.data.status),
      ).length,
    ],
    ["Campaigns", campaigns.rows.length],
    ...(!admin
      ? [
          ["Saved brand kits", kits.rows.length],
          ["Upcoming consultations", upcoming.length],
        ]
      : []),
    [
      admin ? "Pending proposals" : "Unread notifications",
      admin
        ? proposals.rows.filter((row) => row.data.status === "Pending review")
            .length
        : notices.rows.filter((r) => !r.data.read).length,
    ],
  ];
  return (
    <>
      <Notice
        error={
          inquiries.error ||
          projects.error ||
          campaigns.error ||
          proposals.error ||
          notices.error ||
          kits.error ||
          bookings.error
        }
      />
      {inquiries.loading || projects.loading || campaigns.loading ? (
        <p role="status">Loading workspace totals…</p>
      ) : (
        <div className="grid two">
          {stats.map(([label, n]) => (
            <article className="card" key={label}>
              <p>{label}</p>
              <strong className="big-number">{n}</strong>
            </article>
          ))}
        </div>
      )}
      <div className="actions">
        {admin ? (
          <>
            <ButtonLink to="/admin?tab=inquiries">Review inquiries</ButtonLink>
            <ButtonLink to="/admin?tab=analytics" kind="secondary">
              View analytics
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink to="/contact">Submit a project</ButtonLink>
            <ButtonLink to="/planner" kind="secondary">
              Plan a campaign
            </ButtonLink>
          </>
        )}
      </div>
      {!admin && (
        <div className="workspace-feed grid two">
          <article className="card">
            <h2>Project progress</h2>
            {active.length ? (
              active.slice(0, 4).map((row) => (
                <div className="workspace-progress" key={row.id}>
                  <Link to={"/dashboard/project/" + row.id}>
                    {row.data.title}
                  </Link>
                  <span>
                    {row.data.status} · {row.data.progress}%
                  </span>
                  <progress
                    aria-label={row.data.title + " progress"}
                    value={row.data.progress}
                    max={100}
                  />
                </div>
              ))
            ) : (
              <>
                <p>
                  Approved projects will appear here with milestones and
                  progress.
                </p>
                <ButtonLink kind="secondary" to="/contact">
                  Start a project
                </ButtonLink>
              </>
            )}
          </article>
          <article className="card">
            <h2>Recent activity</h2>
            {notices.rows.length ? (
              <ul>
                {[...notices.rows]
                  .reverse()
                  .slice(0, 4)
                  .map((row) => (
                    <li key={row.id}>{row.data.message}</li>
                  ))}
              </ul>
            ) : (
              <p>Updates on project reviews and delivery will appear here.</p>
            )}
            <ButtonLink kind="secondary" to="/dashboard?tab=notifications">
              View notifications
            </ButtonLink>
          </article>
          <article className="card">
            <h2>Upcoming consultations</h2>
            {upcoming.length ? (
              <ul>
                {upcoming.slice(0, 4).map((row) => (
                  <li key={row.id}>
                    {row.data.service} · {row.data.date} at {row.data.time} IST
                  </li>
                ))}
              </ul>
            ) : (
              <p>Schedule time to discuss your next brief with the studio.</p>
            )}
            <ButtonLink
              kind="secondary"
              to={upcoming.length ? "/dashboard?tab=bookings" : "/booking"}
            >
              {upcoming.length ? "View bookings" : "Book a consultation"}
            </ButtonLink>
          </article>
          <article className="card">
            <h2>Saved brand kits</h2>
            {kits.rows.length ? (
              <ul>
                {kits.rows.slice(0, 4).map((row) => (
                  <li key={row.id}>
                    <Link to={"/studio?edit=" + row.id}>{row.data.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Save a visual direction from Creative Studio to revisit it here.
              </p>
            )}
            <ButtonLink kind="secondary" to="/studio">
              Open Creative Studio
            </ButtonLink>
          </article>
        </div>
      )}
    </>
  );
}
function RecordList<K extends Table>({
  table,
  render,
  empty,
}: {
  table: K;
  render: (row: Row<K>, refresh: () => void) => ReactNode;
  empty: string;
}) {
  const records = useRows(table);
  return (
    <>
      <RowsStatus {...records} empty={!records.rows.length} text={empty} />
      <div className="record-list">
        {records.rows.map((row) => (
          <article className="card record" key={row.id}>
            {render(row, records.refresh)}
          </article>
        ))}
      </div>
    </>
  );
}
function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
    </div>
  );
}
function Delete({
  table,
  id,
  refresh,
}: {
  table: Table;
  id: string;
  refresh: () => void;
}) {
  const { user } = useSession();
  const action = useAction();
  const [confirm, setConfirm] = useState(false);
  if (!user) return null;
  return (
    <div className="actions">
      {confirm ? (
        <>
          <button
            className="button danger"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await remove(table, id, user);
                refresh();
              })
            }
          >
            Confirm delete
          </button>
          <button
            className="button secondary"
            onClick={() => setConfirm(false)}
          >
            Keep
          </button>
        </>
      ) : (
        <button className="button secondary" onClick={() => setConfirm(true)}>
          Delete
        </button>
      )}
      <Notice {...action} />
    </div>
  );
}
function Inquiries({ admin }: { admin: boolean }) {
  const { user } = useSession();
  const action = useAction();
  return (
    <>
      <Notice {...action} />
      {!admin && (
        <div className="actions">
          <ButtonLink to="/contact">New project brief</ButtonLink>
        </div>
      )}
      <RecordList
        table="project_inquiries"
        empty="No project briefs have been submitted."
        render={(row, refresh) => (
          <>
            <Heading
              title={row.data.brand}
              sub={
                row.data.name + " · " + row.data.email + " · " + row.data.status
              }
            />
            <p>{row.data.objective}</p>
            {row.data.campaign && <p>Campaign · {row.data.campaign.brand}</p>}
            <div className="actions">
              {admin && user && row.data.status === "pending" && (
                <>
                  <button
                    className="button primary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await approve(row, user);
                        refresh();
                      }, "Inquiry approved and project created.")
                    }
                  >
                    Approve inquiry
                  </button>
                  <button
                    className="button secondary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        await save(
                          "project_inquiries",
                          { ...row.data, status: "rejected" },
                          user,
                          row.id,
                        );
                        refresh();
                      }, "Inquiry rejected.")
                    }
                  >
                    Reject
                  </button>
                </>
              )}
              {admin && (
                <ButtonLink to={"/proposal?inquiry=" + row.id} kind="secondary">
                  Create proposal
                </ButtonLink>
              )}
              {!admin && row.data.status === "pending" && (
                <ButtonLink to={"/contact?edit=" + row.id} kind="secondary">
                  Edit brief
                </ButtonLink>
              )}
            </div>
          </>
        )}
      />
    </>
  );
}
function Projects({ admin }: { admin: boolean }) {
  return (
    <RecordList
      table="projects"
      empty="Approved projects will appear here."
      render={(row) => (
        <>
          <Heading
            title={row.data.title}
            sub={row.data.status + " · " + row.data.progress + "% complete"}
          />
          <progress
            max="100"
            value={row.data.progress}
            aria-label={row.data.title + " progress"}
          />
          <ButtonLink
            to={(admin ? "/admin" : "/dashboard") + "/project/" + row.id}
            kind="secondary"
          >
            View project
          </ButtonLink>
        </>
      )}
    />
  );
}
function Campaigns() {
  return (
    <>
      <div className="actions">
        <ButtonLink to="/planner">New campaign</ButtonLink>
        <ButtonLink to="/analytics" kind="secondary">
          View analytics
        </ButtonLink>
      </div>
      <RecordList
        table="campaigns"
        empty="Saved campaign plans will appear here."
        render={(row, refresh) => (
          <>
            <Heading
              title={row.data.brand}
              sub={row.data.objective + " · " + money(row.data.budget)}
            />
            <div className="actions">
              <ButtonLink to={"/planner?edit=" + row.id} kind="secondary">
                Open plan
              </ButtonLink>
              <ButtonLink to={"/planner/calendar/" + row.id} kind="secondary">
                Content calendar
              </ButtonLink>
              <Delete table="campaigns" id={row.id} refresh={refresh} />
            </div>
          </>
        )}
      />
    </>
  );
}
function Kits() {
  return (
    <>
      <div className="actions">
        <ButtonLink to="/studio">Create brand kit</ButtonLink>
      </div>
      <RecordList
        table="brand_kits"
        empty="Saved brand kits will appear here."
        render={(row, refresh) => (
          <>
            <Heading
              title={row.data.name}
              sub={row.data.industry + " · " + row.data.personality}
            />
            <div className="actions">
              <ButtonLink to={"/studio?edit=" + row.id} kind="secondary">
                Open brand kit
              </ButtonLink>
              <Delete table="brand_kits" id={row.id} refresh={refresh} />
            </div>
          </>
        )}
      />
    </>
  );
}
function Proposals() {
  return (
    <>
      <div className="actions">
        <ButtonLink to="/proposal">Create proposal</ButtonLink>
      </div>
      <RecordList
        table="proposals"
        empty="Saved proposals will appear here."
        render={(row, refresh) => (
          <>
            <Heading
              title={row.data.title}
              sub={
                row.data.name +
                " · " +
                money(row.data.amount) +
                " · " +
                (row.data.status ?? "Draft")
              }
            />
            <div className="actions">
              <ButtonLink to={"/proposal?edit=" + row.id} kind="secondary">
                Open proposal
              </ButtonLink>
              <Delete table="proposals" id={row.id} refresh={refresh} />
            </div>
          </>
        )}
      />
    </>
  );
}
function Bookings() {
  const { user } = useSession();
  const action = useAction();
  return (
    <>
      <Notice {...action} />
      <div className="actions">
        <ButtonLink to="/booking">Book consultation</ButtonLink>
      </div>
      <RecordList
        table="consultation_bookings"
        empty="There are no consultations yet."
        render={(row, refresh) => (
          <>
            <Heading
              title={row.data.service}
              sub={
                row.data.date +
                " · " +
                row.data.time +
                " IST · " +
                row.data.status
              }
            />
            <p>
              {row.data.name} · {row.data.email}
            </p>
            <p>{row.data.purpose}</p>
            {row.data.status === "booked" && user && (
              <button
                className="button secondary"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await save(
                      "consultation_bookings",
                      { ...row.data, status: "cancelled" },
                      user,
                      row.id,
                    );
                    refresh();
                  }, "Booking cancelled.")
                }
              >
                Cancel booking
              </button>
            )}
          </>
        )}
      />
    </>
  );
}
function Notifications() {
  const { user } = useSession();
  const action = useAction();
  return (
    <>
      <Notice {...action} />
      <RecordList
        table="notifications"
        empty="You’re up to date."
        render={(row, refresh) => (
          <>
            <p>{row.data.message}</p>
            {!row.data.read && user && (
              <button
                className="button secondary"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await save(
                      "notifications",
                      { ...row.data, read: true },
                      user,
                      row.id,
                    );
                    refresh();
                  })
                }
              >
                Mark as read
              </button>
            )}
          </>
        )}
      />
    </>
  );
}
function SavedCreators() {
  const data = useRows("creators");
  return (
    <>
      <div className="actions">
        <ButtonLink to="/creators">Discover creators</ButtonLink>
      </div>
      <Notice error={data.error} />
      <RecordList
        table="creator_shortlists"
        empty="Your shortlist is empty."
        render={(row, refresh) => {
          const c = data.rows.find((a) => a.data.id === row.data.creator)?.data;
          return (
            <>
              <Heading title={c?.name ?? row.data.creator} sub={c?.portfolio} />
              <Delete
                table="creator_shortlists"
                id={row.id}
                refresh={refresh}
              />
            </>
          );
        }}
      />
    </>
  );
}
function Settings() {
  const { user, setUser } = useSession();
  const action = useAction();
  return (
    <form
      className="card form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const name = String(
          new FormData(e.currentTarget).get("name") ?? "",
        ).trim();
        if (user)
          void action.run(async () => {
            if (!name) throw new Error("Enter your name.");
            setUser(await auth.updateName(user, name));
          }, "Account settings saved.");
      }}
    >
      <Field label="Name">
        <input name="name" required maxLength={120} defaultValue={user?.name} />
      </Field>
      <Field label="Email">
        <input value={user?.email ?? ""} readOnly />
      </Field>
      <button className="button primary" disabled={action.busy}>
        Save settings
      </button>
      <Notice {...action} />
    </form>
  );
}
type Client = { id: string; name: string; role: string };
function Clients() {
  const { user } = useSession();
  const [profiles, setProfiles] = useState<Client[]>([]);
  const action = useAction();
  const inquiries = useRows("project_inquiries");
  const contacts = [
    ...new Map(inquiries.rows.map((r) => [r.data.email, r.data])).values(),
  ];
  return (
    <>
      <Notice
        error={inquiries.error || action.error}
        success={action.success}
      />
      {supabase && (
        <button
          className="button secondary"
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const { data, error } = await supabase!
                .from("profiles")
                .select("id,name,role")
                .eq("role", "client");
              if (error) throw error;
              setProfiles(data);
            }, "Client accounts loaded.")
          }
        >
          Load client accounts
        </button>
      )}
      <div className="record-list">
        {profiles.map((p) => (
          <article className="card" key={p.id}>
            <Heading title={p.name} sub={p.role} />
            <details>
              <summary>Send notification</summary>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const message = String(
                    new FormData(form).get("message") ?? "",
                  ).trim();
                  if (user)
                    void action.run(async () => {
                      if (!message) throw new Error("Enter a message.");
                      await save(
                        "notifications",
                        { message, read: false },
                        user,
                        undefined,
                        p.id,
                      );
                      form.reset();
                    }, "Notification sent.");
                }}
              >
                <Field label={"Message for " + p.name}>
                  <textarea name="message" required maxLength={650} />
                </Field>
                <button className="button primary" disabled={action.busy}>
                  Send notification
                </button>
              </form>
            </details>
            <details>
              <summary>Create project</summary>
              <form
                className="form-stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget,
                    fields = new FormData(form);
                  const title = String(fields.get("title") ?? "").trim(),
                    objective = String(fields.get("objective") ?? "").trim(),
                    email = String(fields.get("email") ?? "").trim();
                  if (user)
                    void action.run(async () => {
                      if (!title || !objective)
                        throw new Error(
                          "Enter a title and project description.",
                        );
                      await save(
                        "projects",
                        {
                          title,
                          status: "Approved",
                          progress: 0,
                          due: "",
                          brief: {
                            name: p.name,
                            email,
                            brand: title,
                            objective,
                            services: [],
                          },
                        },
                        user,
                        undefined,
                        p.id,
                      );
                      form.reset();
                    }, "Project created.");
                }}
              >
                <Field label="Project title">
                  <input name="title" required maxLength={120} />
                </Field>
                <Field label="Client email">
                  <input name="email" type="email" required />
                </Field>
                <Field label="Project description">
                  <textarea name="objective" required maxLength={650} />
                </Field>
                <button className="button primary" disabled={action.busy}>
                  Create project
                </button>
              </form>
            </details>
          </article>
        ))}
        {contacts.map((p) => (
          <article className="card" key={p.email}>
            <Heading title={p.name} sub={p.email + " · " + p.brand} />
          </article>
        ))}
      </div>
      {!contacts.length && !profiles.length && (
        <p className="empty">No client records to display.</p>
      )}
    </>
  );
}
const blankCatalog = {
  services: {
    id: "",
    name: "",
    line: "",
    icon: "✳",
    days: 21,
    price: 35000,
    outputs: [],
  },
  portfolio: {
    id: "",
    name: "",
    sector: "",
    category: "Branding",
    color: "#ded2ff",
    ink: "#30214b",
    style: "easy",
    intro: "",
    problem: "",
    audience: "",
    strategy: "",
    process: "",
    identity: "",
    deliverables: "",
    liveUrl: "",
  },
};
const categories = [
  "Branding",
  "UI/UX",
  "Web Development",
  "Influencer Marketing",
  "Creative Campaigns",
];
function Catalog({ table }: { table: "services" | "portfolio" }) {
  const data = useRows(table);
  const { user } = useSession();
  const action = useAction();
  const [current, setCurrent] = useState<string>();
  const [value, setValue] = useState<Tables["services"] | Tables["portfolio"]>(
    blankCatalog[table],
  );
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    void action.run(async () => {
      const id = value.id.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !value.name.trim())
        throw new Error("Enter a name and a URL slug such as studio-design.");
      if (data.rows.some((row) => row.id !== current && row.data.id === id))
        throw new Error("That URL slug is already in use.");
      const liveUrl = "liveUrl" in value ? value.liveUrl?.trim() : undefined;
      if (liveUrl && !projectWebsite(liveUrl))
        throw new Error("Enter a valid HTTP or HTTPS website URL.");
      await save(
        table,
        { ...value, id, ...(table === "portfolio" ? { liveUrl } : {}) },
        user,
        current,
        null,
      );
      data.refresh();
      setCurrent(undefined);
      setValue(blankCatalog[table]);
    }, "Catalog entry saved.");
  }
  return (
    <>
      <Notice {...action} />
      <form className="card form-stack" onSubmit={submit}>
        <h2>{current ? "Edit entry" : "New entry"}</h2>
        {Object.entries(value).map(([key, field]) => (
          <Field
            label={
              key === "id"
                ? "URL slug"
                : key === "liveUrl"
                  ? "Live website URL (optional)"
                  : key[0].toUpperCase() + key.slice(1)
            }
            key={key}
          >
            {key === "category" ? (
              <select
                value={String(field)}
                onChange={(e) =>
                  setValue((v) => ({ ...v, category: e.target.value }))
                }
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            ) : Array.isArray(field) ? (
              <textarea
                value={field.join("\n")}
                onChange={(e) =>
                  setValue((v) => ({ ...v, [key]: e.target.value.split("\n") }))
                }
              />
            ) : (
              <input
                required={
                  key !== "liveUrl" &&
                  !(
                    "liveUrl" in value &&
                    value.liveUrl &&
                    [
                      "problem",
                      "audience",
                      "strategy",
                      "process",
                      "identity",
                      "deliverables",
                    ].includes(key)
                  )
                }
                type={
                  key === "liveUrl"
                    ? "url"
                    : typeof field === "number"
                      ? "number"
                      : key === "color" || key === "ink"
                        ? "color"
                        : "text"
                }
                min={key === "days" ? 1 : 0}
                value={field}
                onChange={(e) =>
                  setValue((v) => ({
                    ...v,
                    [key]:
                      typeof field === "number"
                        ? e.target.valueAsNumber || 0
                        : e.target.value,
                  }))
                }
              />
            )}
          </Field>
        ))}
        <div className="actions">
          <button className="button primary" disabled={action.busy}>
            Save entry
          </button>
          {current && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setCurrent(undefined);
                setValue(blankCatalog[table]);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
      <RowsStatus {...data} empty={!data.rows.length} />
      <div className="record-list">
        {data.rows.map((row) => (
          <article className="card record" key={row.id}>
            <Heading title={row.data.name} />
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => {
                  setCurrent(row.id);
                  setValue({ ...blankCatalog[table], ...row.data });
                }}
              >
                Edit
              </button>
              <Delete table={table} id={row.id} refresh={data.refresh} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
export function ProjectDetail({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const { user } = useSession();
  const projects = useRows("projects");
  const milestones = useRows("project_milestones");
  const deliverables = useRows("project_deliverables");
  const feedback = useRows("feedback");
  const catalog = useRows("services");
  const action = useAction();
  const row = projects.rows.find((r) => r.id === id);
  const home = admin ? "/admin?tab=projects" : "/dashboard?tab=projects";
  if (!row || !user)
    return (
      <Page label="Projects" title="Project details">
        <RowsStatus {...projects} empty text="This project is unavailable." />
        <ButtonLink to={home}>Back to projects</ButtonLink>
      </Page>
    );
  const project = row.data;
  const run = (fn: () => Promise<void>, done?: string) =>
    void action.run(fn, done);
  function status(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(async () => {
      await save(
        "projects",
        {
          ...project,
          status: String(form.get("status")),
          progress: Number(form.get("progress")),
          due: String(form.get("due")),
        },
        user,
        row!.id,
      );
      projects.refresh();
    }, "Project status updated.");
  }
  return (
    <Page
      label="Project workspace"
      title={project.title}
      intro={project.brief.objective}
    >
      <ButtonLink to={home} kind="secondary">
        Back to projects
      </ButtonLink>
      <Notice
        error={
          action.error ||
          milestones.error ||
          deliverables.error ||
          feedback.error
        }
        success={action.success}
      />
      <div className="grid two project-sections">
        <section className="card">
          <h2>Progress</h2>
          <p>
            {project.status} · {project.progress}% complete
          </p>
          <progress
            max="100"
            value={project.progress}
            aria-label="Project progress"
          />
          <p>Estimated completion · {project.due || "To be scheduled"}</p>
          <p>
            Services ·{" "}
            {project.brief.services
              .map(
                (id) =>
                  catalog.rows.find((r) => r.data.id === id)?.data.name ?? id,
              )
              .join(", ")}
          </p>
          {admin && (
            <form
              className="form-stack"
              key={project.status + project.progress + project.due}
              onSubmit={status}
            >
              <Field label="Status">
                <select name="status" defaultValue={project.status}>
                  {[
                    "Approved",
                    "In progress",
                    "In review",
                    "Completed",
                    "Archived",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Progress (%)">
                <input
                  name="progress"
                  type="number"
                  min="0"
                  max="100"
                  required
                  defaultValue={project.progress}
                />
              </Field>
              <Field label="Estimated completion">
                <input name="due" type="date" defaultValue={project.due} />
              </Field>
              <button className="button primary" disabled={action.busy}>
                Update project
              </button>
            </form>
          )}
        </section>
        <section className="card">
          <h2>Milestones</h2>
          {milestones.rows
            .filter((m) => m.data.project === row.id)
            .map((m) => (
              <div className="list-item" key={m.id}>
                <span>
                  {m.data.title} · {m.data.done ? "Complete" : "Open"}
                </span>
                {admin && (
                  <>
                    <button
                      className="button secondary"
                      disabled={action.busy}
                      onClick={() =>
                        run(async () => {
                          await save(
                            "project_milestones",
                            { ...m.data, done: !m.data.done },
                            user,
                            m.id,
                          );
                          milestones.refresh();
                        }, "Milestone updated.")
                      }
                    >
                      {m.data.done ? "Reopen" : "Complete"}
                    </button>
                    <Delete
                      table="project_milestones"
                      id={m.id}
                      refresh={milestones.refresh}
                    />
                  </>
                )}
              </div>
            ))}
          {!milestones.rows.some((m) => m.data.project === row.id) && (
            <p>No milestones yet.</p>
          )}
          {admin && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = String(new FormData(form).get("title")).trim();
                run(async () => {
                  if (!title) throw new Error("Enter a milestone title.");
                  await save(
                    "project_milestones",
                    { project: row.id, title, done: false },
                    user,
                    undefined,
                    row.user_id,
                  );
                  form.reset();
                  milestones.refresh();
                }, "Milestone added.");
              }}
            >
              <Field label="New milestone">
                <input name="title" required maxLength={120} />
              </Field>
              <button className="button primary" disabled={action.busy}>
                Add milestone
              </button>
            </form>
          )}
        </section>
        <section className="card">
          <h2>Deliverables</h2>
          {deliverables.rows
            .filter((d) => d.data.project === row.id)
            .map((d) => (
              <div className="list-item" key={d.id}>
                <span>{d.data.title}</span>
                <button
                  className="button secondary"
                  disabled={action.busy}
                  onClick={() =>
                    run(
                      () => downloadFile(d.data.path, d.data.title),
                      "Download started.",
                    )
                  }
                >
                  Download
                </button>
              </div>
            ))}
          {!deliverables.rows.some((d) => d.data.project === row.id) && (
            <p>No deliverables yet.</p>
          )}
          {admin && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const file = new FormData(form).get("file");
                run(async () => {
                  if (!(file instanceof File) || !file.size)
                    throw new Error("Select a file.");
                  const path = await uploadFile(file, row);
                  await save(
                    "project_deliverables",
                    { project: row.id, title: file.name, path },
                    user,
                    undefined,
                    row.user_id,
                  );
                  form.reset();
                  deliverables.refresh();
                }, "Deliverable uploaded.");
              }}
            >
              <Field label="Upload file">
                <input name="file" type="file" required />
              </Field>
              <button className="button primary" disabled={action.busy}>
                Upload deliverable
              </button>
            </form>
          )}
        </section>
        <section className="card">
          <h2>Feedback and revisions</h2>
          {feedback.rows
            .filter((f) => f.data.project === row.id)
            .map((f) => (
              <div className="list-item feedback" key={f.id}>
                <p>
                  <strong>{f.data.type}</strong> · {f.data.message}
                </p>
                {f.data.reply && <p>Agency reply · {f.data.reply}</p>}
                {admin && (
                  <form
                    className="form-stack"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const reply = String(
                        new FormData(e.currentTarget).get("reply"),
                      ).trim();
                      run(async () => {
                        if (!reply) throw new Error("Enter a reply.");
                        await save(
                          "feedback",
                          { ...f.data, reply },
                          user,
                          f.id,
                        );
                        feedback.refresh();
                      }, "Reply saved.");
                    }}
                  >
                    <Field label="Agency reply">
                      <textarea
                        name="reply"
                        required
                        maxLength={1500}
                        defaultValue={f.data.reply}
                      />
                    </Field>
                    <button className="button secondary" disabled={action.busy}>
                      Save reply
                    </button>
                  </form>
                )}
              </div>
            ))}
          {!feedback.rows.some((f) => f.data.project === row.id) && (
            <p>No feedback yet.</p>
          )}
          {!admin && (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  fd = new FormData(form);
                const message = String(fd.get("message")).trim();
                run(async () => {
                  if (message.length < 5)
                    throw new Error("Enter at least five characters.");
                  await save(
                    "feedback",
                    { project: row.id, message, type: String(fd.get("type")) },
                    user,
                  );
                  form.reset();
                  feedback.refresh();
                }, "Feedback submitted.");
              }}
            >
              <Field label="Type">
                <select name="type">
                  <option>Feedback</option>
                  <option>Revision request</option>
                </select>
              </Field>
              <Field label="Message">
                <textarea
                  name="message"
                  minLength={5}
                  maxLength={1500}
                  required
                />
              </Field>
              <button className="button primary" disabled={action.busy}>
                Send feedback
              </button>
            </form>
          )}
        </section>
      </div>
    </Page>
  );
}

function AdminAnalytics() {
  const [version, setVersion] = useState(0);
  return (
    <>
      <MetricEditor onSave={() => setVersion((v) => v + 1)} />
      <Analytics key={version} />
    </>
  );
}
function MetricEditor({ onSave }: { onSave: () => void }) {
  const { user } = useSession();
  const campaigns = useRows("campaigns");
  const metrics = useRows("campaign_metrics");
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [campaign, setCampaign] = useState("");
  const [date, setDate] = useState(indiaDate());
  const current = metrics.rows.find(
    (row) => row.data.campaign === campaign && row.data.date === date,
  );
  const numbers = [
    ["reach", "Reach"],
    ["impressions", "Impressions"],
    ["engagements", "Engagements"],
    ["clicks", "Clicks"],
    ["conversions", "Conversions"],
    ["spend", "Spend (INR)"],
  ] as const;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const selected = campaigns.rows.find((row) => row.id === campaign);
    const form = new FormData(event.currentTarget);
    void action.run(async () => {
      if (!selected) throw new Error("Choose a campaign.");
      const [reach, impressions, engagements, clicks, conversions, spend] =
        numbers.map(([key]) => Number(form.get(key)));
      if (reach > impressions || clicks > impressions || conversions > clicks)
        throw new Error(
          "Check the relationship between reach, impressions, clicks and conversions.",
        );
      await save(
        "campaign_metrics",
        {
          campaign,
          date,
          reach,
          impressions,
          engagements,
          clicks,
          conversions,
          spend,
        },
        user,
        current?.id,
        selected.user_id,
      );
      metrics.refresh();
      onSave();
    }, "Daily metrics saved.");
  }
  return (
    <section className="card metric-editor">
      <button
        className="button secondary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "Close metric editor" : "Record daily metrics"}
      </button>
      {open && (
        <form className="form-stack" onSubmit={submit}>
          <Notice
            error={campaigns.error || metrics.error || action.error}
            success={action.success}
          />
          <Field label="Campaign to update">
            <select
              required
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              <option value="">Select campaign</option>
              {campaigns.rows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.data.brand}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Metric date">
            <input
              required
              type="date"
              value={date}
              max={indiaDate()}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <div className="grid two" key={campaign + date + current?.id}>
            {numbers.map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  name={key}
                  type="number"
                  min="0"
                  step={key === "spend" ? ".01" : "1"}
                  required
                  defaultValue={current?.data[key] ?? 0}
                />
              </Field>
            ))}
          </div>
          <button className="button primary" disabled={action.busy}>
            Save daily metrics
          </button>
        </form>
      )}
    </section>
  );
}
