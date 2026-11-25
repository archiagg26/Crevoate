import type { CSSProperties } from "react";
import { colours, fonts, readableInk, type StudioKit } from "./studio-themes";

type Format =
  | "Website hero"
  | "Social post"
  | "Instagram story"
  | "Business card"
  | "Identity"
  | "Typography"
  | "Palette"
  | "Campaign banner"
  | "Moodboard";
export const formats: Format[] = [
  "Website hero",
  "Social post",
  "Instagram story",
  "Business card",
  "Typography",
  "Palette",
  "Identity",
  "Campaign banner",
  "Moodboard",
];

export function studioTokens(kit: StudioKit) {
  return {
    "--primary": kit.primary,
    "--secondary": kit.secondary,
    "--paper": kit.surface,
    "--accent": kit.accent,
    "--detail": kit.detail,
    "--heading": fonts[kit.headingFont],
    "--body": fonts[kit.bodyFont],
    "--paper-ink": readableInk(kit.primary, kit.surface),
    "--secondary-ink": readableInk(kit.primary, kit.secondary),
    "--accent-ink": readableInk(kit.primary, kit.accent),
  } as CSSProperties;
}

export function Artwork({ theme }: { theme: string }) {
  return (
    <div className={"cs-art cs-art-" + theme} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

export function BrandPreview({
  kit,
  format,
  miniature = false,
}: {
  kit: StudioKit;
  format: Format;
  miniature?: boolean;
}) {
  const name = kit.name || "Your brand";
  const tagline = kit.tagline || kit.industry;
  const title = <strong className="cs-wordmark">{name}</strong>;
  const art = <Artwork theme={kit.theme} />;
  const photo = {
    "Website hero": "web",
    "Social post": "post",
    "Instagram story": "story",
    "Business card": "card",
    Identity: "identity",
    Typography: "type",
    Palette: "palette",
    "Campaign banner": "banner",
    Moodboard: "mood",
  }[format];
  return (
    <div
      className={
        "cs-preview cs-format-" + photo + (miniature ? " cs-miniature" : "")
      }
      role={miniature ? undefined : "group"}
      style={studioTokens(kit)}
      aria-label={miniature ? undefined : format + " preview"}
    >
      {format === "Website hero" ? (
        <>
          <div className="cs-web-nav">
            <b>{name}</b>
            <span aria-hidden="true">Studio &nbsp; About &nbsp; Menu</span>
          </div>
          <div className="cs-web-main">
            <div>
              <small>{kit.industry}</small>
              {title}
              <p>{tagline}</p>
              <span className="cs-web-cta" aria-hidden="true">
                Explore <span>&#8599;</span>
              </span>
            </div>
            {art}
          </div>
        </>
      ) : format === "Social post" || format === "Instagram story" ? (
        <>
          <small>
            {kit.personality} / {kit.industry}
          </small>
          {art}
          <div>
            {title}
            <p>{tagline}</p>
          </div>
        </>
      ) : format === "Typography" ? (
        <>
          <div className="cs-type-sample">
            <small>Display / {kit.headingFont}</small>
            <strong>Aa</strong>
            {title}
          </div>
          <div className="cs-type-body">
            <small>Body / {kit.bodyFont}</small>
            <p>{tagline}</p>
            <p>Aa Bb Cc 0123456789</p>
          </div>
        </>
      ) : format === "Palette" ? (
        <div className="cs-palette-grid">
          {colours.map(([field, label]) => (
            <div
              key={field}
              style={{
                background: kit[field],
                color: readableInk(kit.primary, kit[field]),
              }}
            >
              <b>{label}</b>
              <span>{kit[field].toUpperCase()}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div>
            <small>
              {format === "Identity" || format === "Business card"
                ? kit.industry
                : kit.personality}
            </small>
            {title}
            <p>{tagline}</p>
          </div>
          {art}
        </>
      )}
    </div>
  );
}
