import { StaggerContainer, StaggerItem, TextReveal } from "./scroll-reveal";
import "./creative-bento.css";

const tiles = [
  {
    id: "brand",
    title: "Branding & Identity",
    to: "/services/branding",
    type: "Service",
  },
  {
    id: "web",
    title: "Web Development & UI/UX",
    to: "/services/web-development",
    type: "Service",
  },
  {
    id: "influence",
    title: "Influencer Marketing",
    to: "/services/influencer-marketing",
    type: "Service",
  },
  {
    id: "content",
    title: "Campaigns & Content",
    to: "/services/campaign-production",
    type: "Service",
  },
  {
    id: "studio",
    title: "Creative Studio",
    to: "/studio",
    type: "Interactive tool",
  },
  {
    id: "planner",
    title: "Campaign Planner",
    to: "/planner",
    type: "Interactive tool",
  },
] as const;

const descriptions: Record<string, string> = {
  brand: "Positioning, strategy and a visual identity with a point of view.",
  web: "Thoughtful interfaces and websites built to work.",
  influence: "Find creators who can tell your story in their own voice.",
  content: "Creative direction and production for every channel.",
  studio: "Try a palette, type pairing and visual direction.",
  planner: "Build a campaign, budget and publishing schedule.",
};
const drawings = {
  intro: (
    <>
      <path d="M19 105c17-16 48-24 78-23 20 0 28 5 18 10-16 8-55 15-84 13M34 43c14-13 43-18 60-8 16 10 17 33 4 45-16 16-53 17-67-3-8-11-7-24 3-34Z" />
      <path d="M55 52l-1 6m21-8-1 6M51 66c8 11 19 12 28-2M100 24l8-12m2 17 14-4M18 62 7 58" />
    </>
  ),
  brand: (
    <>
      <path
        d="M65 12c4 29 15 44 46 51-30 4-44 15-49 45-5-29-20-41-47-45 28-6 42-21 50-51Z"
        fill="#f8f2e1"
      />
      <path d="M94 17v20m-10-9h21M24 87v18m-9-9h18M55 63h17" />
    </>
  ),
  web: (
    <>
      <path d="M14 24q42-3 96 0l2 64q-53 4-100 1Z" fill="#f8f2e1" />
      <path d="M15 41h94M25 33h1m10 0h1m10 0h1M46 55 34 64l12 10m32-19 12 9-12 10M67 51 57 78M46 98h37" />
    </>
  ),
  influence: (
    <>
      <path
        d="M105 57c2 25-15 41-42 42-27 2-45-13-44-38 0-27 19-45 45-44 24 0 40 15 41 40Z"
        fill="#f8f2e1"
      />
      <path d="M47 45l-1 9m30-10 1 9M43 64c10 15 28 18 41-1m17-43 10-10m1 20 12-1M16 82l-9 9" />
    </>
  ),
  content: (
    <>
      <path d="m28 88 13-24 44-45 19 18-45 45-31 6Z" fill="#f8f2e1" />
      <path d="m41 64 18 18m19-56 19 18M28 88l14-3-8-8M21 101c14 0 31-9 48-8 17 0 22 8 43 3M109 63v14m-7-7h14" />
    </>
  ),
  studio: (
    <>
      <path
        d="M23 70c-9-21 7-41 26-36 4-22 35-25 44-3 23-2 32 26 13 37 3 20-24 30-37 15-13 18-42 10-46-13Z"
        fill="#f8f2e1"
      />
      <path d="M45 56h1m15-8h1m17 5h1m12 10h1M48 74c8 0 16-3 25-8M14 28l11-8m81 67 11 8" />
    </>
  ),
  planner: (
    <>
      <path d="M21 27q40-5 85 0l2 67-88 1Z" fill="#f8f2e1" />
      <path d="M21 46h85M40 17v20m46-20v19M33 70l8 8 13-16m14 3h23M69 78h15m21 23 14-11m-9-2 10 1-1 10" />
    </>
  ),
};

export function CreativeBento() {
  return (
    <section
      className="creative-bento"
      id="creative-bento"
      aria-labelledby="creative-bento-title"
    >
      <div className="wrap">
        <TextReveal
          id="creative-bento-title"
          lines={["Creativity Without Boundaries"]}
        />
        <StaggerContainer className="creative-bento-grid">
          <StaggerItem className="creative-tile creative-intro">
            <p>We turn ideas into experiences.</p>
            <svg
              className="creative-doodle"
              viewBox="0 0 130 120"
              aria-hidden="true"
            >
              {drawings.intro}
            </svg>
          </StaggerItem>
          {tiles.map(({ id, title, to, type }) => (
            <StaggerItem
              as="link"
              className={"creative-tile creative-" + id}
              to={to}
              key={id}
            >
              <span className="creative-type">{type}</span>
              <div className="creative-tile-copy">
                <h3>{title}</h3>
                <p>{descriptions[id]}</p>
              </div>
              <svg
                className="creative-doodle"
                viewBox="0 0 130 120"
                aria-hidden="true"
              >
                {drawings[id]}
              </svg>
              <svg
                className="creative-arrow"
                viewBox="0 0 26 26"
                aria-hidden="true"
              >
                <path d="M5 21 21 5M8 5h13v13" />
              </svg>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
