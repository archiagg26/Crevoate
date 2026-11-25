import { industries, getIndustryIdeas } from "./campaign-ideas";
import {
  BudgetVisual,
  ContentCalendar,
  SuggestionChips,
  exportCampaignPdf,
} from "./planner-widgets";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { money, services } from "./content";
import {
  blankCampaign,
  campaignIsComplete,
  channels,
  indiaDate,
  objectives,
  planCampaign,
  serviceEstimate,
  type Campaign,
} from "./domain";
import {
  available,
  saveCampaignDraft,
  supabase,
  configurationError,
  message,
  save,
  type Brief,
  type Proposal,
} from "./data";
import {
  ButtonLink,
  Notice,
  Page,
  downloadText,
  SignInLink,
  useDraft,
  useRows,
  useSession,
} from "./ui";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Choices({
  options,
  value,
  change,
  label,
}: {
  options: { id: string; name: string }[];
  value: string[];
  change: (value: string[]) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="choice-grid">
        {options.map((o) => (
          <label className="choice" key={o.id}>
            <input
              type="checkbox"
              checked={value.includes(o.id)}
              onChange={(e) =>
                change(
                  e.target.checked
                    ? [...value, o.id]
                    : value.filter((v) => v !== o.id),
                )
              }
            />
            {o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function useAction(formatError = message) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  function clear() {
    setError("");
    setSuccess("");
  }
  async function run(task: () => Promise<void>, done = "Saved.") {
    if (inFlight.current) return;
    inFlight.current = true;
    clear();
    setBusy(true);
    try {
      await task();
      setSuccess(done);
    } catch (e) {
      setError(formatError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { error, success, busy, run, clear };
}
export function Inquiry() {
  const [params] = useSearchParams();
  const { user } = useSession();
  const campaigns = useRows("campaigns");
  const catalog = useRows("services");
  const action = useAction();
  const campaign = campaigns.rows.find(
    (r) => r.id === params.get("campaign"),
  )?.data;
  const editing = useRows("project_inquiries");
  const existing = editing.rows.find(
    (r) =>
      r.id === params.get("edit") &&
      r.data.status === "pending" &&
      r.user_id === user?.id,
  );
  const [form, set] = useState<Brief>({
    name: "",
    email: "",
    brand: "",
    objective: "",
    services: params.get("service") ? [params.get("service")!] : [],
  });
  useEffect(() => {
    if (existing) {
      set(existing.data);
      return;
    }
    set((previous) => ({
      ...previous,
      name: previous.name || user?.name || "",
      email: previous.email || user?.email || "",
      brand: previous.brand || campaign?.brand || "",
      objective: previous.objective || campaign?.description || "",
    }));
  }, [user, campaign, existing]);
  function update<K extends keyof Brief>(key: K, value: Brief[K]) {
    set((previous) => ({ ...previous, [key]: value }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      if (!form.services.length)
        throw new Error("Select at least one service.");
      if (
        !form.name.trim() ||
        !form.brand.trim() ||
        form.objective.trim().length < 12
      )
        throw new Error(
          "Enter a name, a brand and at least 12 characters about your objectives.",
        );
      await save(
        "project_inquiries",
        { ...form, campaign: campaign ?? form.campaign, status: "pending" },
        user,
        existing?.id,
      );
    }, "Your project brief was submitted.");
  }
  const estimate = serviceEstimate(
    form.services,
    catalog.rows.map((row) => row.data),
  );
  return (
    <Page
      label="Project brief"
      title={
        existing
          ? "Update your brief."
          : params.has("quote")
            ? "Request a quote."
            : "Let’s make something."
      }
      intro="Tell us what you’re building and choose the disciplines you need."
    >
      {!supabase && <Notice error={configurationError} />}
      <div className="tool-layout">
        <form className="card form-stack" onSubmit={submit}>
          <Field label="Your name">
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Email address">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Brand or project name">
            <input
              required
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Project objectives">
            <textarea
              required
              minLength={12}
              maxLength={3000}
              value={form.objective}
              onChange={(e) => update("objective", e.target.value)}
            />
          </Field>
          <Notice
            error={
              catalog.error ||
              (params.has("edit") ? editing.error : "") ||
              (params.has("campaign") ? campaigns.error : "")
            }
          />
          <Choices
            options={catalog.rows.map((r) => r.data)}
            value={form.services}
            change={(v) => update("services", v)}
            label="Select services"
          />
          <button
            className="button primary"
            disabled={action.busy || Boolean(action.success)}
          >
            {existing ? "Save brief" : "Submit project brief"}
          </button>
          <Notice {...action} />
          {action.success && user && (
            <Link to="/dashboard?tab=briefs">View project briefs</Link>
          )}
        </form>
        <aside className="card tint">
          <h2>Scope estimate</h2>
          <p className="big-number">{money(estimate.amount)}</p>
          <p>{estimate.days || "—"} days estimated</p>
          {campaign && <p>Campaign attached · {campaign.brand}</p>}
          <p>Final pricing is confirmed after a scope review.</p>
          <ButtonLink kind="secondary" to="/booking">
            Book a consultation
          </ButtonLink>
          {!user && supabase && (
            <p>
              <SignInLink /> to track this brief in your workspace.
            </p>
          )}
        </aside>
      </div>
    </Page>
  );
}
const steps = [
  "Brand details",
  "Campaign objectives",
  "Target audience",
  "Campaign preferences",
  "Budget and timeline",
  "Campaign summary",
];
export function Planner() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useSession();
  const { rows, error, loading } = useRows("campaigns");
  const creators = useRows("creators");
  const drafts = useRows("campaign_drafts");
  const action = useAction();
  const draftId = params.get("edit") ?? "new";
  const [step, setStep, clearStep] = useDraft(
    draftId === "new" ? "campaign-step" : "campaign-step-" + draftId,
    0,
  );
  const [form, set, clearCampaign, restored] = useDraft(
    draftId === "new" ? "campaign-new" : "campaign-form-" + draftId,
    blankCampaign,
  );
  const [id, setId] = useState<string>();
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const draft = drafts.rows.find((row) => row.data.scope === draftId);
  const [showErrors, setShowErrors] = useState(false);
  const record = rows.find((row) => row.id === params.get("edit"));
  const loadedCampaign = useRef("");
  useEffect(() => {
    if (record && loadedCampaign.current !== record.id) {
      loadedCampaign.current = record.id;
      setId(record.id);
      setSavedSnapshot(
        JSON.stringify({
          ...record.data,
          calendar: planCampaign(record.data).calendar,
        }),
      );
      if (!restored) {
        set(record.data);
        setStep(5);
      }
    }
  }, [record, restored]);
  const plan = planCampaign(form);
  const snapshot = JSON.stringify({ ...form, calendar: plan.calendar });
  const ideas = getIndustryIdeas(form.industry);
  const captions = [
    "Find the angle worth sharing.",
    "Decide what success looks like.",
    "Choose who the work is for.",
    "Make the channel mix work together.",
    "Give every rupee a job.",
    "Review your strategy and publishing schedule.",
  ];
  const [furthest, setFurthest] = useState(step);
  const listValue = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const toggleValue = (values: string[], value: string) =>
    values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
  const setChip = (
    key:
      | "product"
      | "age"
      | "location"
      | "interests"
      | "audience"
      | "behaviour"
      | "platforms",
    value: string,
  ) => update(key, toggleValue(listValue(form[key] ?? ""), value).join(", "));

  function update<K extends keyof Campaign>(key: K, value: Campaign[K]) {
    set((old) => ({ ...old, [key]: value }));
  }
  function input(
    key: keyof Campaign,
    label: string,
    required = true,
    type = "text",
  ) {
    return (
      <Field label={label}>
        <input
          type={type}
          required={required}
          maxLength={240}
          value={String(form[key] ?? "")}
          onChange={(e) => update(key, e.target.value)}
        />
      </Field>
    );
  }
  const complete = campaignIsComplete(form);
  function persist(duplicate = false, openCalendar = false) {
    void action.run(
      async () => {
        if (!complete)
          throw new Error("Complete the preceding steps to save this plan.");
        if (
          plan.calendar.some(
            (entry) =>
              !entry.date ||
              !entry.platform.trim() ||
              !entry.format.trim() ||
              !entry.idea.trim(),
          )
        )
          throw new Error(
            "Add a date, platform, format and idea to each calendar entry.",
          );
        const row = await save(
          "campaigns",
          {
            ...form,
            calendar: id
              ? (rows.find((item) => item.id === id)?.data.calendar ??
                plan.calendar)
              : plan.calendar,
            recommendations: {
              concept: plan.concept,
              strategy: plan.strategy,
              channels: plan.channels,
              formats: plan.formats,
              creators: plan.creators,
              budget: plan.budget,
              milestones: plan.milestones,
              kpis: plan.kpis,
              next: plan.next,
            },
          },
          user,
          duplicate ? undefined : id,
          record?.user_id,
        );
        setId(row.id);
        setSavedSnapshot(snapshot);
        clearCampaign();
        clearStep();
        if (openCalendar) navigate("/planner/calendar/" + row.id);
      },
      duplicate ? "Campaign duplicated." : "Campaign saved.",
    );
  }
  return (
    <Page
      label="Campaign planner"
      title="Turn an idea into a plan."
      intro="Build a campaign around your audience, channels and budget."
    >
      <div className="tool-layout planner-layout">
        <nav aria-label="Campaign steps" className="card step-list">
          <div className="planner-progress">
            <span>PLAN PROGRESS</span>
            <strong>
              {step + 1} / {steps.length}
            </strong>
            <progress
              value={step + 1}
              max={steps.length}
              aria-label="Campaign plan progress"
            />
          </div>
          {steps.map((name, i) => (
            <button
              key={name}
              disabled={
                i > Math.max(step, furthest) &&
                !(record || (i === 5 && complete))
              }
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
            >
              <span>{i + 1}</span>
              {name}
            </button>
          ))}
        </nav>
        <form
          className="card form-stack planner-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 5) {
              setShowErrors(false);
              setFurthest(Math.max(furthest, step + 1));
              setStep(step + 1);
            }
          }}
        >
          <div className="planner-step-header">
            <small>Smart recommendations · Step {step + 1}</small>
            <h2>{steps[step]}</h2>
            <p>{captions[step]}</p>
          </div>
          {user && (
            <div className="actions">
              <button
                type="button"
                className="button secondary"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await saveCampaignDraft({ scope: draftId, step, form });
                    drafts.refresh();
                  }, "Draft saved to your workspace.")
                }
              >
                Save draft
              </button>
              {draft && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    set(draft.data.form);
                    setStep(draft.data.step);
                  }}
                >
                  Resume saved draft
                </button>
              )}
            </div>
          )}
          {params.has("edit") && loading && (
            <p role="status">Loading saved campaign…</p>
          )}
          <Notice
            error={
              error || drafts.error || (!supabase ? configurationError : "")
            }
          />
          {step === 0 && (
            <>
              {input("brand", "Brand name")}
              {input("title", "Campaign name", false)}
              <Field label="Industry">
                <input
                  list="industry-options"
                  required
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                />
                <datalist id="industry-options">
                  {industries.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </Field>
              {input("product", "Product or service")}
              <SuggestionChips
                label="Product ideas"
                items={ideas.products}
                selected={listValue(form.product)}
                choose={(item) => setChip("product", item)}
              />
              <Field label="Brand personality">
                <select
                  value={form.personality ?? "Modern"}
                  onChange={(e) => update("personality", e.target.value)}
                >
                  {[
                    "Modern",
                    "Minimal",
                    "Bold",
                    "Playful",
                    "Luxury",
                    "Editorial",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              {input("website", "Website", false, "url")}
              <button
                type="button"
                className="button secondary"
                disabled={
                  !form.brand.trim() ||
                  !form.industry.trim() ||
                  !form.product.trim()
                }
                onClick={() =>
                  update(
                    "description",
                    form.brand +
                      " offers " +
                      form.product.toLowerCase() +
                      " in " +
                      form.industry.toLowerCase() +
                      ". Its " +
                      (form.personality ?? "Modern").toLowerCase() +
                      " point of view speaks to " +
                      ideas.audience.toLowerCase() +
                      ".",
                  )
                }
              >
                Generate brand description
              </button>
              <Field label="Brand description">
                <textarea
                  required
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </Field>
            </>
          )}
          {step === 1 && (
            <>
              <div className="objective-grid">
                {objectives.map((objective, i) => (
                  <button
                    type="button"
                    key={objective}
                    aria-pressed={form.objective === objective}
                    onClick={() => update("objective", objective)}
                  >
                    <span aria-hidden="true">
                      {["◎", "✷", "✦", "↗", "◇", "✳"][i]}
                    </span>
                    <strong>
                      {objective === "Community growth"
                        ? "Community building"
                        : objective}
                    </strong>
                    <small>
                      {ideas.objectives.includes(objective)
                        ? "Recommended for " +
                          (form.industry || "your category") +
                          " · "
                        : ""}
                      {
                        [
                          "Reach new audiences.",
                          "Give a new offer a clear moment.",
                          "Invite a response to your content.",
                          "Find people ready to enquire.",
                          "Turn product interest into orders.",
                          "Build an audience that returns.",
                        ][i]
                      }
                    </small>
                  </button>
                ))}
              </div>
              <Field label="Primary objective">
                <select
                  value={form.objective}
                  onChange={(e) => update("objective", e.target.value)}
                >
                  {objectives.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {step === 2 && (
            <>
              {input("age", "Age group")}
              <SuggestionChips
                label="Age ranges"
                items={["18–24", "25–34", "35–44", "45+"]}
                selected={listValue(form.age)}
                choose={(item) => setChip("age", item)}
              />
              {input("location", "Location")}
              <SuggestionChips
                label="Location ideas"
                items={["Mumbai", "Delhi NCR", "Bengaluru", "Pan India"]}
                selected={listValue(form.location)}
                choose={(item) => setChip("location", item)}
              />
              {input("interests", "Interests")}
              <SuggestionChips
                label="Suggested interests"
                items={ideas.interests.split(",").map((i) => i.trim())}
                selected={listValue(form.interests)}
                choose={(item) => setChip("interests", item)}
              />
              {input("audience", "Target customer profile")}
              <SuggestionChips
                label="Suggested persona"
                items={[ideas.audience]}
                selected={listValue(form.audience)}
                choose={(item) => setChip("audience", item)}
              />
              <Field label="Purchasing behaviour">
                <input
                  value={form.behaviour ?? ""}
                  onChange={(e) => update("behaviour", e.target.value)}
                />
              </Field>
              <SuggestionChips
                label="Purchasing signals"
                items={
                  form.objective === "Sales"
                    ? ["Compares product reviews", "Looks for gifting offers"]
                    : [
                        "Researches before buying",
                        "Discovers brands through creators",
                      ]
                }
                selected={listValue(form.behaviour ?? "")}
                choose={(item) => setChip("behaviour", item)}
              />
              <Field label="Preferred social platforms">
                <input
                  value={form.platforms ?? ""}
                  onChange={(e) => update("platforms", e.target.value)}
                />
              </Field>
              <SuggestionChips
                label="Platform suggestions"
                items={ideas.channels.filter((channel) =>
                  ["Instagram", "YouTube", "LinkedIn"].includes(channel),
                )}
                selected={listValue(form.platforms ?? "")}
                choose={(item) => setChip("platforms", item)}
              />
            </>
          )}
          {step === 3 && (
            <>
              <div className="recommendation-note">
                <strong>
                  {ideas.concept === "in everyday life"
                    ? "Everyday storytelling"
                    : ideas.concept}
                </strong>
                <p>
                  {ideas.creators.join(" · ")}.{" "}
                  {form.budget < 15000
                    ? "Start with nano creators and one weekly post."
                    : "Test micro creators and publish two or three times a week."}{" "}
                  Try a paid creator brief or a co-published post.
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    update(
                      "channels",
                      planCampaign({ ...form, channels: [] }).channels,
                    )
                  }
                >
                  Apply recommended channels
                </button>
              </div>
              <SuggestionChips
                label="Recommended creative formats"
                items={ideas.formats}
                selected={form.preferences ?? []}
                choose={(item) =>
                  update(
                    "preferences",
                    toggleValue(form.preferences ?? [], item),
                  )
                }
              />
              <Choices
                label="Preferred channels"
                options={channels.map((i) => ({ id: i, name: i }))}
                value={form.channels}
                change={(v) => update("channels", v)}
              />
            </>
          )}
          {step === 4 && (
            <>
              <Field label="Total budget (INR)">
                <input
                  type="number"
                  required
                  min="1000"
                  max="1000000000"
                  value={form.budget}
                  onChange={(e) =>
                    update("budget", e.target.valueAsNumber || 0)
                  }
                />
              </Field>
              <Field label="Adjust budget">
                <input
                  type="range"
                  min="1000"
                  max={Math.max(500000, form.budget)}
                  step="1000"
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.valueAsNumber)}
                />
              </Field>
              <BudgetVisual
                budget={form.budget}
                allocation={plan.allocation}
                change={(next) => update("allocation", next)}
              />
              {input("start", "Campaign start date", true, "date")}
              <Field label="Campaign duration (days)">
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={form.duration}
                  onChange={(e) =>
                    update("duration", e.target.valueAsNumber || 0)
                  }
                />
              </Field>
              {input("deliverables", "Preferred deliverables", false)}
              {form.start && (
                <div className="recommendation-note">
                  <strong>Recommended milestones</strong>
                  <ul>
                    {plan.milestones.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {step === 5 && (
            <>
              <div className="campaign-result">
                <small>
                  {form.objective} · {form.industry}
                </small>
                <h3>{plan.concept}</h3>
                <p>{plan.strategy}</p>
              </div>
              <div className="grid two summary">
                {Object.entries({
                  "Brand overview": [form.description],
                  Audience: [
                    form.age,
                    form.audience,
                    form.location,
                    form.interests,
                    form.behaviour,
                    form.platforms,
                  ].filter((value): value is string => Boolean(value)),
                  Channels: plan.channels,
                  "Content formats": plan.formats,
                  "Creator categories": plan.creators,
                  "Budget allocation": Object.entries(plan.budget).map(
                    ([k, v]) => k + " · " + money(v),
                  ),
                  Milestones: plan.milestones,
                  KPIs: plan.kpis,
                  "Next steps": plan.next,
                  ...(form.deliverables
                    ? { "Preferred deliverables": [form.deliverables] }
                    : {}),
                  ...(form.creators.length
                    ? {
                        "Shortlisted creators": form.creators.map(
                          (id) =>
                            creators.rows.find((row) => row.data.id === id)
                              ?.data.name ?? id,
                        ),
                      }
                    : {}),
                }).map(([title, items]) => (
                  <div key={title}>
                    <h3>{title}</h3>
                    <ul>
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {id ? (
                <ButtonLink to={"/planner/calendar/" + id}>
                  Open content calendar
                </ButtonLink>
              ) : (
                <ContentCalendar
                  entries={plan.calendar}
                  campaign={form}
                  change={(next) => update("calendar", next)}
                />
              )}
              <div className="actions">
                {user ? (
                  <>
                    <button
                      type="button"
                      className="button primary"
                      disabled={action.busy}
                      onClick={() => persist()}
                    >
                      Save campaign
                    </button>
                    {!id && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={action.busy}
                        onClick={() => persist(false, true)}
                      >
                        Save and open calendar
                      </button>
                    )}
                    {id && (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={action.busy}
                        onClick={() => persist(true)}
                      >
                        Duplicate
                      </button>
                    )}
                  </>
                ) : (
                  <SignInLink />
                )}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    downloadText(
                      "creovate-campaign.txt",
                      JSON.stringify({ brief: form, plan }, null, 2),
                    )
                  }
                >
                  Download plan
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(
                      () => exportCampaignPdf(form, plan),
                      "PDF export started.",
                    )
                  }
                >
                  Export plan as PDF
                </button>
                {id && savedSnapshot === snapshot && (
                  <ButtonLink
                    to={
                      "/contact?campaign=" +
                      id +
                      (params.get("service")
                        ? "&service=" +
                          encodeURIComponent(params.get("service")!)
                        : "")
                    }
                  >
                    Create project brief
                  </ButtonLink>
                )}
              </div>
            </>
          )}
          <Notice
            error={
              action.error || (showErrors ? "Complete required fields." : "")
            }
            success={action.success}
          />
          <div className="actions">
            {step > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            {step < 5 && (
              <button
                className="button primary"
                onInvalid={() => setShowErrors(true)}
              >
                Continue
              </button>
            )}
          </div>
        </form>
      </div>
    </Page>
  );
}
export function BookingPage() {
  const { user } = useSession();
  const catalog = useRows("services");
  const action = useAction();
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotError, setSlotError] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState("");
  useEffect(() => {
    let active = true;
    setTime("");
    setSlots([]);
    setSlotError("");
    if (date) {
      setLoading(true);
      available(date)
        .then((v) => {
          if (active) setSlots(v);
        })
        .catch((e) => {
          if (active) setSlotError(message(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else setLoading(false);
    return () => {
      active = false;
    };
  }, [date]);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    void action.run(async () => {
      if (!time) throw new Error("Select an available time.");
      await save(
        "consultation_bookings",
        {
          service: String(fields.get("service")),
          date,
          time,
          name: String(fields.get("name")).trim(),
          email: String(fields.get("email")),
          purpose: String(fields.get("purpose")).trim(),
          status: "booked",
        },
        user,
      );
    }, "Consultation confirmed.");
  }
  return (
    <Page
      label="Consultation"
      title="Let’s talk through it."
      intro="Choose a weekday slot. All times are shown in India Standard Time."
    >
      {!supabase && <Notice error={configurationError} />}
      <div className="tool-layout">
        <form className="card form-stack" onSubmit={submit}>
          <Field label="Service">
            <select required name="service">
              <option value="">Select a service</option>
              {catalog.rows.map(({ data: s }) => (
                <option value={s.name} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              required
              min={indiaDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Available time">
            <select
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="">
                {loading
                  ? "Checking slots…"
                  : date && !slots.length
                    ? "No slots available"
                    : "Choose a time"}
              </option>
              {slots.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input
              required
              name="name"
              defaultValue={user?.name}
              pattern=".*\S.*"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              name="email"
              defaultValue={user?.email}
            />
          </Field>
          <Field label="What would you like to discuss?">
            <textarea required name="purpose" minLength={10} maxLength={1500} />
          </Field>
          <button
            className="button primary"
            disabled={action.busy || Boolean(action.success)}
          >
            Confirm booking
          </button>
          <Notice
            error={action.error || slotError || catalog.error}
            success={action.success}
          />
        </form>
        <aside className="card tint">
          <h2>Booking history</h2>
          <p>
            Sign in to keep a record of your consultations and cancel a booking
            if your plans change.
          </p>
          <ButtonLink
            to={user ? "/dashboard?tab=bookings" : "/login"}
            kind="secondary"
          >
            {user ? "View bookings" : "Sign in"}
          </ButtonLink>
        </aside>
      </div>
    </Page>
  );
}
const blankProposal: Proposal = {
  status: "Draft",
  name: "",
  email: "",
  title: "",
  objective: "",
  services: [],
  scope: "",
  deliverables: "",
  days: 0,
  amount: 0,
  payments: "40% at kickoff, 30% at review, 30% at handover.",
  terms:
    "Final scope and timelines are subject to written approval. Estimates exclude applicable taxes.",
};
export async function exportProposal(p: Proposal) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  let y = 24;
  function write(value: string, size = 11) {
    pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(value, 165) as string[]) {
      if (y > 275) {
        pdf.addPage();
        y = 24;
      }
      pdf.text(line, 22, y);
      y += size >= 18 ? 10 : 6;
    }
  }
  write("CREOVATE / PROJECT PROPOSAL", 11);
  write(p.title, 24);
  write(p.name + "  |  " + p.email);
  y += 5;
  for (const [label, body] of [
    ["Objectives", p.objective],
    ["Scope", p.scope],
    ["Deliverables", p.deliverables],
    [
      "Estimate",
      "INR " + p.amount.toLocaleString("en-IN") + " / " + p.days + " days",
    ],
    ["Payment milestones", p.payments],
    ["Terms and assumptions", p.terms],
  ]) {
    write(label, 16);
    write(body);
    y += 5;
  }
  pdf.save("creovate-proposal.pdf");
}
export function ProposalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const proposals = useRows("proposals");
  const inquiries = useRows("project_inquiries");
  const record = proposals.rows.find((r) => r.id === params.get("edit"));
  const inquiry = inquiries.rows.find((r) => r.id === params.get("inquiry"));
  const [form, set, clearProposal] = useDraft(
    params.has("edit") ? "proposal-edit" : "proposal-new",
    blankProposal,
  );
  const [id, setId] = useState<string>();
  const [preview, setPreview] = useDraft("proposal-preview", false);
  const action = useAction();
  useEffect(() => {
    if (record) {
      set(record.data);
      setId(record.id);
    } else if (inquiry) {
      const { name, email, brand, objective, services } = inquiry.data;
      const estimate = serviceEstimate(services);
      set({
        ...blankProposal,
        name,
        email,
        title: brand,
        objective,
        services,
        scope: "Design and delivery of the selected services.",
        deliverables: estimate.outputs.join(", "),
        amount: estimate.amount,
        days: estimate.days,
      });
    }
  }, [record, inquiry]);
  const update = <K extends keyof Proposal>(key: K, value: Proposal[K]) =>
    set((old) => ({ ...old, [key]: value }));
  const textFields = [
    ["name", "Client name"],
    ["email", "Client email"],
    ["title", "Proposal title"],
    ["objective", "Project objectives"],
    ["scope", "Scope of work"],
    ["deliverables", "Deliverables"],
    ["payments", "Payment milestones"],
    ["terms", "Terms and assumptions"],
  ] as const;
  return (
    <Page
      label="Proposal generator"
      title="Put the scope in writing."
      intro="Create an editable estimate and export a proposal PDF."
    >
      <div className="tool-layout">
        <form
          className="card form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            setPreview(true);
          }}
        >
          {textFields.map(([key, label]) => (
            <Field key={key} label={label}>
              {["name", "email", "title"].includes(key) ? (
                <input
                  required
                  type={key === "email" ? "email" : "text"}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              ) : (
                <textarea
                  required
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              )}
            </Field>
          ))}
          <Choices
            options={services}
            value={form.services}
            change={(v) => update("services", v)}
            label="Project services"
          />
          {user?.role === "admin" && (
            <Field label="Proposal status">
              <select
                value={form.status ?? "Draft"}
                onChange={(e) =>
                  update("status", e.target.value as Proposal["status"])
                }
              >
                {["Draft", "Pending review", "Accepted", "Declined"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
            </Field>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const estimate = serviceEstimate(form.services);
              set((old) => ({
                ...old,
                scope: services
                  .filter((s) => old.services.includes(s.id))
                  .map((s) => s.name)
                  .join(", "),
                amount: estimate.amount,
                days: estimate.days,
                deliverables: estimate.outputs.join(", "),
              }));
            }}
          >
            Generate estimate
          </button>
          <div className="grid two">
            <Field label="Timeline (days)">
              <input
                type="number"
                required
                min="1"
                value={form.days}
                onChange={(e) => update("days", e.target.valueAsNumber || 0)}
              />
            </Field>
            <Field label="Pricing (INR)">
              <input
                type="number"
                required
                min="0"
                value={form.amount}
                onChange={(e) => update("amount", e.target.valueAsNumber || 0)}
              />
            </Field>
          </div>
          <button className="button primary">Preview proposal</button>
          <Notice error={proposals.error || inquiries.error} />
        </form>
        <aside className="card tint">
          {preview ? (
            <>
              <h2>{form.title}</h2>
              <p>
                {form.name} · {form.email}
              </p>
              <p>{form.objective}</p>
              <p>{form.scope}</p>
              <p>{form.deliverables}</p>
              <p>
                <strong>{money(form.amount)}</strong> · {form.days} days
              </p>
              <p>{form.payments}</p>
              <p>{form.terms}</p>
              <div className="actions">
                <button
                  className="button dark"
                  onClick={() =>
                    void action.run(
                      () => exportProposal(form),
                      "PDF export started.",
                    )
                  }
                >
                  Export PDF
                </button>
                {user ? (
                  <button
                    className="button secondary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        if (
                          !form.title.trim() ||
                          !form.name.trim() ||
                          form.days < 1
                        )
                          throw new Error("Complete the proposal details.");
                        const row = await save(
                          "proposals",
                          form,
                          user,
                          id,
                          record?.user_id ?? inquiry?.user_id ?? undefined,
                        );
                        setId(row.id);
                        clearProposal();
                        navigate("/proposal?edit=" + row.id, { replace: true });
                      }, "Proposal saved.")
                    }
                  >
                    Save proposal
                  </button>
                ) : (
                  <SignInLink />
                )}
              </div>
              <Notice {...action} />
            </>
          ) : (
            <>
              <h2>Proposal preview</h2>
              <p>Complete the form to review your scope and pricing here.</p>
            </>
          )}
        </aside>
      </div>
    </Page>
  );
}
