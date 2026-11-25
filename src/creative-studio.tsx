import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUpRight, Check, Copy, Download } from "lucide-react";
import { save } from "./data";
import { ScrollReveal } from "./scroll-reveal";
import { Field, useAction } from "./tools";
import {
  downloadText,
  Notice,
  SignInLink,
  useDraft,
  useRows,
  useSession,
} from "./ui";
import { Artwork, BrandPreview, studioTokens } from "./studio-previews";
import {
  applyTheme,
  colours,
  defaultKit,
  fonts,
  guidelines,
  industries,
  industryThemes,
  normalizeKit,
  personalities,
  sampleKit,
  themeById,
  themes,
  type StudioKit,
} from "./studio-themes";
import "./creative-studio.css";

const previewFormats = [
  "Website hero",
  "Business card",
  "Typography",
  "Palette",
] as const;
const extraFormats = ["Identity", "Campaign banner", "Moodboard"] as const;

export function Studio() {
  const [params] = useSearchParams();
  const edit = params.get("edit");
  const { user } = useSession();
  const saved = useRows("brand_kits");
  const record = saved.rows.find((row) => row.id === edit);
  const [draft, setDraft, clearDraft] = useDraft(
    edit ? "kit-edit:" + edit : "kit-new",
    defaultKit,
  );
  const kit = normalizeKit(draft);
  const [savedId, setSavedId] = useState<string>();
  const [extra, setExtra] = useState<(typeof extraFormats)[number]>("Identity");
  const [feedback, setFeedback] = useState("");
  const loaded = useRef(false);
  const editor = useRef<HTMLHeadingElement>(null);
  const post = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const action = useAction();
  const exportAction = useAction();

  useEffect(() => {
    if (record && !loaded.current) {
      loaded.current = true;
      setDraft(normalizeKit(record.data));
    }
  }, [record, setDraft]);
  const editReady = !edit || Boolean(record);
  const selected = themeById(kit.theme);
  const themeName = selected?.name ?? "Custom identity";

  function change(field: keyof StudioKit, value: string) {
    setDraft((previous) => ({ ...normalizeKit(previous), [field]: value }));
  }
  function useTheme(id: string, goToEditor = true) {
    const theme = themeById(id);
    if (!theme) return;
    setDraft((previous) =>
      applyTheme(theme, {
        name: previous.name,
        industry: previous.industry,
        tagline: previous.tagline ?? "",
      }),
    );
    setFeedback(theme.name + " applied.");
    if (goToEditor) editor.current?.focus({ preventScroll: true });
    if (goToEditor) editor.current?.scrollIntoView({ block: "start" });
  }
  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setFeedback(hex.toUpperCase() + " copied.");
    } catch {
      setFeedback(
        "Clipboard unavailable. Select the visible HEX code to copy it.",
      );
    }
  }
  function saveKit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editReady) return;
    void action.run(async () => {
      if (!kit.name.trim()) throw new Error("Enter a brand name.");
      const row = await save(
        "brand_kits",
        { ...kit, name: kit.name.trim(), tagline: kit.tagline.trim() },
        user,
        edit ?? savedId,
        record?.user_id,
      );
      setSavedId(row.id);
      clearDraft();
    }, "Brand kit saved.");
  }
  function downloadGuide() {
    downloadText(
      "brand-style-guide.txt",
      [
        kit.name || "Your brand",
        kit.tagline,
        themeName,
        kit.industry + " / " + kit.personality,
        "",
        ...colours.map(
          ([field, label]) => label + " / " + kit[field].toUpperCase(),
        ),
        kit.font,
        "",
        ...guidelines(kit),
      ].join("\n"),
    );
  }
  function downloadPdf() {
    const postElement = post.current?.firstElementChild;
    const storyElement = story.current?.firstElementChild;
    if (
      !(postElement instanceof HTMLElement) ||
      !(storyElement instanceof HTMLElement)
    )
      return;
    void exportAction.run(async () => {
      const { exportBrandPdf } = await import("./studio-export");
      await exportBrandPdf(kit, postElement, storyElement);
    }, "Brand kit exported.");
  }

  return (
    <main id="main" className="cs-page">
      <div className="wrap cs-inner">
        <section className="cs-hero" aria-labelledby="cs-title">
          <div className="cs-hero-copy">
            <p className="eyebrow">Creovate Creative Studio</p>
            <h1 id="cs-title">
              Find your <em>visual voice.</em>
            </h1>
            <p>
              Start with an aesthetic and make it yours. See how your brand
              feels on a website, a social feed, and in someone’s hand.
            </p>
            <div className="actions">
              <a href="#studio-themes" className="button primary">
                Explore themes <ArrowDown size={17} aria-hidden="true" />
              </a>
              <a href="#studio-builder" className="button secondary">
                Open builder <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div
            className="cs-cover"
            style={studioTokens(defaultKit)}
            aria-hidden="true"
          >
            <div className="cs-cover-art">
              <Artwork theme="play" />
            </div>
            <div className="cs-cover-type">
              Aa<span>Type specimen</span>
            </div>
            <div className="cs-cover-colours">
              <i />
              <i />
              <i />
            </div>
          </div>
        </section>

        <section
          id="studio-themes"
          className="cs-section"
          aria-labelledby="cs-gallery-title"
        >
          <ScrollReveal className="cs-section-head">
            <div>
              <p className="eyebrow">Theme gallery</p>
              <h2 id="cs-gallery-title">Pick a starting point.</h2>
            </div>
            <p>
              Each direction pairs five colours and two typefaces across web,
              posts and stories.
            </p>
          </ScrollReveal>
          <div className="cs-gallery">
            {themes.map((theme) => {
              const sample = sampleKit(theme);
              return (
                <ScrollReveal as="article" className="cs-theme" key={theme.id}>
                  <div
                    className="cs-theme-art"
                    aria-hidden="true"
                    style={studioTokens(sample)}
                  >
                    <BrandPreview
                      kit={sample}
                      format="Website hero"
                      miniature
                    />
                    <div className="cs-mini-social">
                      <BrandPreview
                        kit={sample}
                        format="Social post"
                        miniature
                      />
                      <BrandPreview
                        kit={sample}
                        format="Instagram story"
                        miniature
                      />
                    </div>
                  </div>
                  <div className="cs-theme-copy">
                    <div className="cs-tags">
                      {theme.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <h3>{theme.name}</h3>
                    <p>{theme.description}</p>
                    <div className="cs-theme-swatches" aria-label="Palette">
                      {theme.palette.map((hex, index) => (
                        <span key={hex}>
                          <i style={{ backgroundColor: hex }} />
                          <code title={colours[index][1]}>{hex}</code>
                        </span>
                      ))}
                    </div>
                    <p className="cs-pair">{theme.type.join(" / ")}</p>
                    <button
                      type="button"
                      className="button secondary cs-theme-use"
                      aria-label={"Use This Theme: " + theme.name}
                      aria-pressed={kit.theme === theme.id}
                      disabled={exportAction.busy || action.busy || !editReady}
                      onClick={() => useTheme(theme.id)}
                    >
                      Use This Theme{" "}
                      {kit.theme === theme.id ? (
                        <Check size={16} aria-hidden="true" />
                      ) : (
                        <ArrowUpRight size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>

        <section className="cs-section" aria-labelledby="studio-builder">
          <ScrollReveal className="cs-section-head">
            <div>
              <p className="eyebrow">Identity builder</p>
              <h2 id="studio-builder" ref={editor} tabIndex={-1}>
                Make it yours.
              </h2>
            </div>
            <p>
              Adjust your palette and typography and watch every format update
              as you work.
            </p>
          </ScrollReveal>
          <div className="cs-workbench">
            <div className="cs-sidebar">
              <form className="cs-controls form-stack" onSubmit={saveKit}>
                <div className="cs-control-head">
                  <h3>Brand settings</h3>
                  <span>{themeName}</span>
                </div>
                {edit &&
                  !editReady &&
                  (saved.loading ? (
                    <p role="status">Loading brand kit...</p>
                  ) : (
                    <Notice
                      error={saved.error || "This brand kit is unavailable."}
                    />
                  ))}
                <fieldset
                  disabled={!editReady || action.busy || exportAction.busy}
                >
                  <Field label="Aesthetic theme">
                    <select
                      value={selected?.id ?? "custom"}
                      onChange={(event) => useTheme(event.target.value, false)}
                    >
                      {!selected && (
                        <option value="custom" disabled>
                          Custom identity
                        </option>
                      )}
                      {themes.map(({ id, name }) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Brand name">
                    <input
                      required
                      maxLength={40}
                      value={kit.name}
                      onChange={(event) => change("name", event.target.value)}
                    />
                  </Field>
                  <Field label="Tagline">
                    <input
                      maxLength={90}
                      value={kit.tagline}
                      onChange={(event) =>
                        change("tagline", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Industry">
                    <select
                      value={kit.industry}
                      onChange={(event) =>
                        change("industry", event.target.value)
                      }
                    >
                      {[...new Set([...industries, kit.industry])].map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                  </Field>
                  {industryThemes[kit.industry] && (
                    <button
                      type="button"
                      className="cs-text-button"
                      onClick={() =>
                        useTheme(industryThemes[kit.industry], false)
                      }
                    >
                      Apply industry preset{" "}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  )}
                  <Field label="Brand personality">
                    <select
                      value={kit.personality}
                      onChange={(event) =>
                        change("personality", event.target.value)
                      }
                    >
                      {[...new Set([...personalities, kit.personality])].map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                  </Field>
                </fieldset>
                <fieldset
                  className="cs-colour-controls"
                  disabled={!editReady || action.busy || exportAction.busy}
                >
                  <legend>Colour palette</legend>
                  {colours.map(([field, label]) => (
                    <div key={field}>
                      <label>
                        <input
                          aria-label={label + " colour"}
                          type="color"
                          value={kit[field]}
                          onChange={(event) =>
                            change(field, event.target.value)
                          }
                        />
                        <span>{label}</span>
                      </label>
                      <code>{kit[field].toUpperCase()}</code>
                      <button
                        type="button"
                        aria-label={"Copy " + label.toLowerCase() + " HEX"}
                        onClick={() => void copyHex(kit[field])}
                      >
                        <Copy size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </fieldset>
                <fieldset
                  disabled={!editReady || action.busy || exportAction.busy}
                >
                  <legend>Typography</legend>
                  {(
                    [
                      ["headingFont", "Heading font"],
                      ["bodyFont", "Body font"],
                    ] as const
                  ).map(([field, label]) => (
                    <Field key={field} label={label}>
                      <select
                        value={kit[field]}
                        onChange={(event) => change(field, event.target.value)}
                      >
                        {Object.keys(fonts).map((font) => (
                          <option key={font}>{font}</option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </fieldset>
                <div className="cs-export">
                  {user ? (
                    <button
                      className="button primary"
                      disabled={!editReady || action.busy || exportAction.busy}
                    >
                      {action.busy ? "Saving..." : "Save brand kit"}
                    </button>
                  ) : (
                    <SignInLink />
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!editReady || exportAction.busy || action.busy}
                    onClick={downloadPdf}
                  >
                    <Download size={17} aria-hidden="true" />
                    {exportAction.busy
                      ? "Preparing PDF..."
                      : "Download brand kit PDF"}
                  </button>
                  <button
                    type="button"
                    className="cs-text-button"
                    disabled={!editReady || exportAction.busy}
                    onClick={downloadGuide}
                  >
                    Export style guide as text
                  </button>
                </div>
                <p className="cs-feedback" role="status">
                  {feedback}
                </p>
                <Notice
                  error={
                    action.error ||
                    exportAction.error ||
                    (!edit ? saved.error : "")
                  }
                  success={action.success || exportAction.success}
                />
              </form>
            </div>
            <div className="cs-preview-grid" role="group" aria-label="Live brand previews">
              {previewFormats.map((format) => (
                <section
                  key={format}
                  className={
                    "cs-board cs-board-" + format.toLowerCase().split(" ")[0]
                  }
                >
                  <h3>
                    {format === "Website hero"
                      ? "Website landing page"
                      : format}
                  </h3>
                  <BrandPreview kit={kit} format={format} />
                </section>
              ))}
              <section className="cs-board cs-board-social">
                <div>
                  <h3>Instagram post</h3>
                  <div ref={post}>
                    <BrandPreview kit={kit} format="Social post" />
                  </div>
                </div>
                <div>
                  <h3>Instagram story</h3>
                  <div ref={story}>
                    <BrandPreview kit={kit} format="Instagram story" />
                  </div>
                </div>
              </section>
              <section className="cs-board cs-board-extra">
                <h3>More brand formats</h3>
                <div
                  className="cs-format-controls"
                  role="group"
                  aria-label="Additional preview format"
                >
                  {extraFormats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      aria-pressed={extra === format}
                      onClick={() => setExtra(format)}
                    >
                      {format}
                    </button>
                  ))}
                </div>
                <BrandPreview kit={kit} format={extra} />
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
