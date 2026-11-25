import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Image,
  Camera,
  Layers,
  BriefcaseBusiness,
  Plus,
  Sparkles,
  X,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { CalendarEntry } from "./campaign-ideas";
import {
  addDays,
  calendarAssetUrl,
  calendarCsv,
  calendarFormats,
  calendarStatuses,
  dateISO,
  dateLabel,
  entryStatus,
  formatClass,
  generateCalendar,
  phasePlan,
  uploadCalendarAsset,
} from "./calendar-data";
import { message } from "./data";
import type { Campaign } from "./domain";
import { downloadText, Notice, useSession } from "./ui";
import "./content-calendar.css";

const views = ["Month", "Week", "Timeline", "Content board"] as const;
const formatNames = ["reel", "story", "carousel", "static", "influencer"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const detailFields = [
  ["concept", "Content concept"],
  ["caption", "Suggested caption"],
  ["hook", "Opening hook"],
  ["hashtags", "Hashtags"],
  ["cta", "Call to action"],
  ["visual", "Visual direction"],
  ["script", "Reel script or slide breakdown"],
  ["notes", "Creative notes"],
] as const;
const timeLabel = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) return "";
  const [hour, minute] = value.split(":").map(Number);
  return (
    (hour % 12 || 12) +
    ":" +
    String(minute).padStart(2, "0") +
    (hour < 12 ? " AM" : " PM")
  );
};
const isoDate = (value?: string) =>
  value && /^\d{4}-\d\d-\d\d$/.test(value) && Number.isFinite(Date.parse(value))
    ? value
    : dateISO(new Date());
const platformIcon = (platform: string) =>
  platform === "Instagram"
    ? Camera
    : platform === "YouTube"
      ? Play
      : platform === "LinkedIn"
        ? BriefcaseBusiness
        : CalendarDays;
const formatIcon = (key: string) =>
  key === "reel" ? Film : key === "carousel" ? Layers : Image;

function Thumbnail({ entry }: { entry: CalendarEntry }) {
  const [asset, setAsset] = useState<{ path: string; url: string }>();
  useEffect(() => {
    if (!entry.asset) return;
    let active = true;
    const path = entry.asset;
    void calendarAssetUrl(path)
      .then((url) => {
        if (active) setAsset({ path, url });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [entry.asset]);
  const Icon = formatIcon(formatClass(entry.format));
  return (
    <div className="cc-art">
      {asset?.path === entry.asset && asset?.url ? (
        <img src={asset.url} alt="" loading="lazy" />
      ) : (
        <>
          <Icon aria-hidden="true" />
          <span>{entry.format || "Creative direction"}</span>
        </>
      )}
    </div>
  );
}

type Props = {
  entries: CalendarEntry[];
  campaign: Campaign;
  change: (next: CalendarEntry[]) => void | Promise<void>;
  campaignId?: string;
  editCampaign?: string;
};

export function ContentCalendar({
  entries,
  campaign,
  change,
  campaignId,
  editCampaign,
}: Props) {
  const { user } = useSession();
  const start = isoDate(campaign.start);
  const [view, setView] = useState<(typeof views)[number]>("Week");
  const [date, setDate] = useState(start);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("");
  const [format, setFormat] = useState("");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<CalendarEntry>();
  const [openedEntry, setOpenedEntry] = useState<CalendarEntry>();
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState("");
  const [target, setTarget] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const phases = phasePlan({ ...campaign, start });
  const end = phases.at(-1)!.end;
  const platforms = [
    ...new Set(
      [...campaign.channels, ...entries.map((entry) => entry.platform)].filter(
        Boolean,
      ),
    ),
  ];
  const formats = [
    ...new Set(
      [...calendarFormats, ...entries.map((entry) => entry.format)].filter(
        Boolean,
      ),
    ),
  ];
  const filtered = entries
    .filter(
      (item) =>
        (!platform || item.platform === platform) &&
        (!format || item.format === format) &&
        (!status || entryStatus(item) === status) &&
        [item.idea, item.caption, item.objective, item.platform].some((value) =>
          value.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    )
    .sort((a, b) =>
      (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")),
    );
  const month = date.slice(0, 7) + "-01";
  const monthDate = new Date(month + "T00:00:00Z");
  const leading = (monthDate.getUTCDay() + 6) % 7;
  const dayCount = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const weekStart = addDays(
    date,
    -((new Date(date + "T00:00:00Z").getUTCDay() + 6) % 7),
  );
  const completed = entries.filter(
    (item) => entryStatus(item) === "Published",
  ).length;

  async function run(task: () => void | Promise<void>, success = "") {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(success);
    } catch (cause) {
      setError(message(cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function open(
    entry?: CalendarEntry,
    onDate = campaign.start ? isoDate(campaign.start) : date,
  ) {
    setError("");
    setNotice("");
    setFile(undefined);
    setOpenedEntry(entry);
    setDraft(
      entry
        ? { ...entry, status: entryStatus(entry) }
        : {
            id: crypto.randomUUID(),
            date: onDate,
            time: "09:00",
            platform: platforms[0] || "Instagram",
            format: "Static post",
            idea: "",
            caption: "",
            objective: campaign.objective,
            status: "Draft",
            origin: "manual",
          },
    );
    dialog.current?.showModal();
  }
  function update(field: keyof CalendarEntry, value: string) {
    setDraft((item) => (item ? { ...item, [field]: value } : item));
  }
  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!draft) return;
    void run(async () => {
      if (
        openedEntry?.id === draft.id &&
        JSON.stringify(entries.find((item) => item.id === draft.id)) !==
          JSON.stringify(openedEntry)
      )
        throw new Error(
          "This entry changed while you were editing. Reopen it to view the latest changes.",
        );
      if (!draft.idea.trim()) throw new Error("Enter a content title.");
      const asset =
        file && user && campaignId
          ? await uploadCalendarAsset(file, user.id, campaignId)
          : draft.asset;
      const saved: CalendarEntry = {
        ...draft,
        idea: draft.idea.trim(),
        origin: "manual",
        ...(asset ? { asset } : {}),
      };
      const next = entries.some((entry) => entry.id === saved.id)
        ? entries.map((entry) => (entry.id === saved.id ? saved : entry))
        : [...entries, saved];
      await change(next);
      dialog.current?.close();
    }, "Content saved.");
  }
  function regenerate() {
    if (!campaignId) {
      setError("Save the campaign before generating an AI plan.");
      return;
    }
    if (
      entries.some((entry) => entry.origin === "ai") &&
      !window.confirm(
        "Replace generated entries? Manually added or edited content stays in place.",
      )
    )
      return;
    void run(async () => {
      const generated = await generateCalendar(campaignId);
      await change([
        ...entries.filter((entry) => entry.origin !== "ai"),
        ...generated,
      ]);
      if (generated[0]?.date) setDate(generated[0].date);
    }, "Content plan generated.");
  }
  function shift(n: number) {
    setDate(
      view === "Month"
        ? dateISO(
            new Date(
              Date.UTC(
                monthDate.getUTCFullYear(),
                monthDate.getUTCMonth() + n,
                1,
              ),
            ),
          )
        : addDays(date, n * 7),
    );
  }
  function drop(area: string, changes: Partial<CalendarEntry>) {
    return {
      onDragOver: (event: React.DragEvent) => {
        if (!drag || busy) return;
        event.preventDefault();
        setTarget(area);
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        if (!drag) return;
        void run(
          async () => {
            await change(
              entries.map((item) =>
                item.id === drag
                  ? { ...item, ...changes, origin: "manual" }
                  : item,
              ),
            );
          },
          changes.date ? "Content rescheduled." : "Status updated.",
        );
        setDrag("");
        setTarget("");
      },
    };
  }
  function card(entry: CalendarEntry, compact = false) {
    const Icon = platformIcon(entry.platform);
    return (
      <button
        key={entry.id}
        type="button"
        className={
          "cc-card cc-" +
          formatClass(entry.format) +
          (compact ? " cc-compact" : "")
        }
        draggable={!busy}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", entry.id);
          setDrag(entry.id);
        }}
        onDragEnd={() => {
          setDrag("");
          setTarget("");
        }}
        onClick={() => open(entry)}
      >
        {!compact && <Thumbnail entry={entry} />}
        <span className="cc-card-type">
          <Icon size={15} aria-hidden="true" />
          {entry.platform} / {entry.format}
        </span>
        <strong>{entry.idea}</strong>
        <span>
          {entry.date ? dateLabel(entry.date) : "Unscheduled"}
          {entry.time ? " · " + timeLabel(entry.time) : ""}
        </span>
        <span>{entry.objective}</span>
        <small className="cc-status">{entryStatus(entry)}</small>
      </button>
    );
  }
  function filterField(
    label: string,
    value: string,
    options: string[],
    set: (value: string) => void,
  ) {
    return (
      <label className="field">
        <span>{label}</span>
        <select value={value} onChange={(event) => set(event.target.value)}>
          <option value="">All</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  const entriesFor = (onDate: string) =>
    filtered.filter((entry) => entry.date === onDate);
  const slug =
    campaign.brand
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") || "campaign";
  function printCalendar() {
    document.body.classList.add("cc-printing");
    try {
      window.print();
    } finally {
      document.body.classList.remove("cc-printing");
    }
  }
  return (
    <section className="cc-shell" aria-label="Content calendar">
      <header className="cc-header">
        <div>
          <p className="eyebrow">
            <CalendarDays size={16} aria-hidden="true" /> Creovate / Campaign
            calendar
          </p>
          <h2>
            {campaign.title ||
              (campaign.brand
                ? campaign.brand + " campaign"
                : "Content calendar")}
          </h2>
          <p>
            {campaign.brand || "Your brand"} · {campaign.objective} ·{" "}
            {dateLabel(start)} –{" "}
            {dateLabel(end, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <div className="cc-platforms">
            {platforms.map((item) => {
              const Icon = platformIcon(item);
              return (
                <span key={item}>
                  <Icon size={15} aria-hidden="true" />
                  {item}
                </span>
              );
            })}
          </div>
        </div>
        <div className="actions cc-actions">
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => open()}
          >
            <Plus size={17} /> Add content
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={regenerate}
          >
            <Sparkles size={16} />{" "}
            {entries.some((item) => item.origin === "ai")
              ? "Regenerate plan"
              : "Generate plan"}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              downloadText(
                slug + "-calendar.csv",
                calendarCsv(filtered),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={printCalendar}
          >
            Print calendar
          </button>
          {editCampaign && (
            <Link className="button secondary" to={editCampaign}>
              Edit campaign
            </Link>
          )}
        </div>
      </header>
      <div className="cc-metrics">
        <div>
          <strong>{entries.length}</strong>
          <span>Planned content</span>
        </div>
        {calendarFormats.map((item) => (
          <div key={item} className={"cc-" + formatClass(item)}>
            <strong>
              {
                entries.filter(
                  (entry) => formatClass(entry.format) === formatClass(item),
                ).length
              }
            </strong>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="cc-progress">
        <span>
          Publishing progress · {completed} of {entries.length} marked published
        </span>
        <progress
          value={completed}
          max={entries.length || 1}
          aria-label="Content marked published"
        />
      </div>
      <Notice error={draft ? "" : error} success={draft ? "" : notice} />
      <div className="cc-filters">
        <label className="field">
          <span>Search content</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {filterField("Platform", platform, platforms, setPlatform)}
        {filterField("Format", format, formats, setFormat)}
        {filterField("Status", status, calendarStatuses, setStatus)}
      </div>
      <div className="cc-toolbar">
        <div className="cc-views" role="group" aria-label="Calendar view">
          {views.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={view === item}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {(view === "Month" || view === "Week") && (
          <div className="cc-navigation">
            <button
              type="button"
              aria-label={"Previous " + view.toLowerCase()}
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong aria-live="polite">
              {view === "Month"
                ? dateLabel(month, { month: "long", year: "numeric" })
                : dateLabel(weekStart) +
                  " – " +
                  dateLabel(addDays(weekStart, 6))}
            </strong>
            <button
              type="button"
              aria-label={"Next " + view.toLowerCase()}
              onClick={() => shift(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      {!filtered.length && (
        <p className="cc-empty">
          {entries.length
            ? "No content matches these filters."
            : "Your calendar is empty. Add content or generate a first draft."}
        </p>
      )}
      <motion.div
        key={view}
        className="cc-view"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {view === "Month" ? (
          <div className="cc-month">
            {weekdays.map((name) => (
              <strong key={name} className="cc-weekday">
                {name}
              </strong>
            ))}
            {Array.from({ length: leading }, (_, index) => (
              <span key={"leading-" + index} className="cc-blank" />
            ))}
            {Array.from({ length: dayCount }, (_, index) => {
              const onDate = addDays(month, index);
              return (
                <div
                  key={onDate}
                  className={"cc-day " + (target === onDate ? "cc-target" : "")}
                  {...drop(onDate, { date: onDate })}
                >
                  <button
                    className="cc-day-add"
                    type="button"
                    onClick={() => open(undefined, onDate)}
                    aria-label={"Add content on " + dateLabel(onDate)}
                  >
                    {index + 1}
                    <Plus size={13} />
                  </button>
                  {entriesFor(onDate).map((entry) => card(entry, true))}
                </div>
              );
            })}
          </div>
        ) : view === "Week" ? (
          <div className="cc-week">
            {Array.from({ length: 7 }, (_, index) => {
              const onDate = addDays(weekStart, index);
              return (
                <section
                  key={onDate}
                  className={
                    "cc-week-day " + (target === onDate ? "cc-target" : "")
                  }
                  {...drop(onDate, { date: onDate })}
                >
                  <header>
                    <h3>
                      {weekdays[index]} · {dateLabel(onDate)}
                    </h3>
                    <button
                      type="button"
                      aria-label={"Add content on " + dateLabel(onDate)}
                      onClick={() => open(undefined, onDate)}
                    >
                      <Plus size={16} />
                    </button>
                  </header>
                  {entriesFor(onDate).map((entry) => card(entry))}
                  {!entriesFor(onDate).length && <p>No content</p>}
                </section>
              );
            })}
          </div>
        ) : view === "Timeline" ? (
          <ol className="cc-timeline">
            {phases.map((phase) => {
              const items = filtered.filter(
                (item) => item.date >= phase.start && item.date <= phase.end,
              );
              return (
                <li key={phase.label}>
                  <h3>{phase.label}</h3>
                  <p>
                    {dateLabel(phase.start)} – {dateLabel(phase.end)} ·{" "}
                    {items.length} entries
                  </p>
                  {items.map((entry) => card(entry, true))}
                </li>
              );
            })}
            {filtered.some((item) => item.date < start || item.date > end) && (
              <li>
                <h3>Outside campaign dates</h3>
                {filtered
                  .filter((item) => item.date < start || item.date > end)
                  .map((item) => card(item, true))}
              </li>
            )}
          </ol>
        ) : (
          <div className="cc-board">
            {calendarStatuses.map((column) => {
              const items = filtered.filter(
                (item) => entryStatus(item) === column,
              );
              return (
                <section
                  key={column}
                  className={target === column ? "cc-target" : ""}
                  {...drop(column, { status: column })}
                >
                  <h3>
                    {column} <span>{items.length}</span>
                  </h3>
                  {items.map((item) => card(item))}
                  {!items.length && <p>No content</p>}
                </section>
              );
            })}
          </div>
        )}
      </motion.div>
      <ul className="cc-legend">
        {calendarFormats.map((item, i) => (
          <li key={item}>
            <i className={"cc-" + formatNames[i]} />
            {item}
          </li>
        ))}
      </ul>
      <div className="cc-print">
        <h3>Content schedule</h3>
        {filtered.map((item) => (
          <article key={item.id}>
            <b>
              {item.date} {item.time} · {item.idea}
            </b>
            <p>
              {item.platform} / {item.format} / {entryStatus(item)}
            </p>
            <p>{item.caption}</p>
          </article>
        ))}
      </div>
      {createPortal(
        <dialog
          aria-label="Edit calendar entry"
          ref={dialog}
          className="cc-drawer"
          onClose={() => {
            setDraft(undefined);
            setFile(undefined);
          }}
        >
          {draft && (
            <form onSubmit={saveDraft} className="form-stack">
              <header>
                <div>
                  <p className="eyebrow">Content details</p>
                  <h3>{draft.idea || "New content"}</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close editor"
                  onClick={() => dialog.current?.close()}
                >
                  <X size={21} />
                </button>
              </header>
              <fieldset disabled={busy}>
                <label className="field">
                  <span>Content title</span>
                  <input
                    required
                    maxLength={160}
                    value={draft.idea}
                    onChange={(event) => update("idea", event.target.value)}
                  />
                </label>
                <div className="cc-fields">
                  {(
                    [
                      [
                        "platform",
                        "Platform",
                        [
                          ...new Set([
                            draft.platform,
                            ...platforms,
                            "Instagram",
                            "YouTube",
                            "LinkedIn",
                          ]),
                        ],
                      ],
                      ["format", "Content format", formats],
                      ["status", "Status", calendarStatuses],
                    ] as const
                  ).map(([key, label, options]) => (
                    <label key={key} className="field">
                      <span>{label}</span>
                      <select
                        value={draft[key]}
                        onChange={(event) => update(key, event.target.value)}
                      >
                        {options.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="field">
                    <span>Scheduled date</span>
                    <input
                      required
                      type="date"
                      value={draft.date}
                      onChange={(event) => update("date", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Posting time</span>
                    <input
                      type="time"
                      value={draft.time ?? ""}
                      onChange={(event) => update("time", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Content objective</span>
                    <input
                      maxLength={120}
                      value={draft.objective}
                      onChange={(event) =>
                        update("objective", event.target.value)
                      }
                    />
                  </label>
                </div>
                {detailFields.map(([key, label]) => (
                  <label key={key} className="field">
                    <span>{label}</span>
                    <textarea
                      maxLength={
                        key === "notes" || key === "script" ? 650 : 400
                      }
                      value={draft[key] ?? ""}
                      onChange={(event) => update(key, event.target.value)}
                    />
                  </label>
                ))}
                {campaignId && user && (
                  <label className="field">
                    <span>
                      {draft.asset
                        ? "Replace creative asset"
                        : "Upload creative asset"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={(event) => setFile(event.target.files?.[0])}
                    />
                  </label>
                )}
                {draft.asset && <Thumbnail entry={draft} />}
                <div className="actions">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!draft.caption && !draft.hashtags}
                    onClick={() =>
                      void run(
                        () =>
                          navigator.clipboard.writeText(
                            [draft.caption, draft.hashtags]
                              .filter(Boolean)
                              .join("\n\n"),
                          ),
                        "Caption and hashtags copied.",
                      )
                    }
                  >
                    Copy caption and hashtags
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!campaignId}
                    onClick={() =>
                      void run(async () => {
                        const [idea] = await generateCalendar(
                          campaignId!,
                          draft,
                        );
                        setDraft({
                          ...draft,
                          idea: idea.idea,
                          concept: idea.concept,
                          caption: idea.caption,
                          hook: idea.hook,
                          hashtags: idea.hashtags,
                          cta: idea.cta,
                          visual: idea.visual,
                          script: idea.script,
                        });
                      }, "Idea regenerated. Save to apply.")
                    }
                  >
                    Regenerate idea
                  </button>
                </div>
              </fieldset>
              <Notice error={error} success={notice} />
              <footer className="actions">
                <button className="button primary" disabled={busy}>
                  {busy ? "Working..." : "Save content"}
                </button>
                {entries.some((entry) => entry.id === draft.id) && (
                  <>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          id: crypto.randomUUID(),
                          status: "Draft",
                          origin: "manual",
                        })
                      }
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Delete this content entry?"))
                          void run(async () => {
                            await change(
                              entries.filter((entry) => entry.id !== draft.id),
                            );
                            dialog.current?.close();
                          }, "Content deleted.");
                      }}
                    >
                      Delete entry
                    </button>
                  </>
                )}
              </footer>
            </form>
          )}
        </dialog>,
        document.body,
      )}
    </section>
  );
}
