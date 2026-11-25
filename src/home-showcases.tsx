import { useState } from "react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./scroll-reveal";
import { ButtonLink } from "./ui";
import { money } from "./content";
import { BudgetVisual } from "./planner-widgets";
import { getIndustryIdeas, suggestedAllocation } from "./campaign-ideas";

const process = [
  [
    "Discover",
    "Define the problem, interview the people it affects and agree on what success looks like.",
    "M12 30a12 12 0 1 0 24 0 12 12 0 0 0-24 0m21 9 14 13M23 24v11m-5-5h10",
  ],
  [
    "Frame",
    "Set the direction, choose the deliverables and make the review checkpoints explicit.",
    "M11 16h40v31H11zM19 39l9-9 7 6 8-15m-5 0h5v5",
  ],
  [
    "Make",
    "Build the work, share early versions and refine the details with your feedback.",
    "m13 44 6-14 23-20 9 10-23 22-15 2Zm6-14 9 12m9-27 9 10",
  ],
  [
    "Launch",
    "Deliver the assets and document how your team can measure and improve the work.",
    "M19 39c1-16 14-24 31-27-3 15-12 30-28 30m-3-3-8 9m12-4-2 10m-6-16-8 1m28-11a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  ],
];
export function ProcessTimeline() {
  const [active, setActive] = useState(0);
  return (
    <div className="process-timeline">
      <StaggerContainer
        className="process-options"
        label="Creative process steps"
      >
        <ScrollReveal
          as="span"
          kind="line"
          className="process-connector"
          aria-hidden="true"
        />
        {process.map(([title, , path], i) => (
          <StaggerItem
            as="button"
            key={title}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
          >
            <small>0{i + 1}</small>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d={path} />
            </svg>
            <strong>{title}</strong>
          </StaggerItem>
        ))}
      </StaggerContainer>
      <ScrollReveal className="process-detail">
        <h3>{process[active][0]}</h3>
        <p>{process[active][1]}</p>
      </ScrollReveal>
    </div>
  );
}
const palettes = [
  ["#2b1944", "#e2d0fa"],
  ["#293326", "#c1d2aa"],
  ["#46261d", "#f3bda7"],
];
export function ToolPreviews() {
  const [budget, setBudget] = useState(25000);
  const [industry, setIndustry] = useState("Jewellery");
  const [palette, setPalette] = useState(0);
  const [font, setFont] = useState("Space Grotesk");
  const ideas = getIndustryIdeas(industry);
  return (
    <div className="grid two showcases">
      <ScrollReveal
        as="article"
        direction="left"
        className="feature planner-feature"
      >
        <StaggerContainer className="viewport-tool-inner">
          <StaggerItem>
            <h3>Campaign Planner</h3>
          </StaggerItem>
          <StaggerItem as="p">See what your budget can support.</StaggerItem>
          <StaggerItem className="mini-tool">
            <div className="mini-controls">
              <label>
                Industry
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option>Jewellery</option>
                  <option>Fashion</option>
                  <option>Technology</option>
                </select>
              </label>
              <label>
                Budget · {money(budget)}
                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="5000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.valueAsNumber)}
                />
              </label>
            </div>
            <BudgetVisual
              budget={budget}
              allocation={suggestedAllocation(budget, ideas.objectives[0])}
            />
            <p>
              Try a {ideas.formats[0].toLowerCase()} on {ideas.channels[0]}.
            </p>
          </StaggerItem>
          <StaggerItem>
            <ButtonLink to="/planner" kind="dark">
              Plan a campaign
            </ButtonLink>
          </StaggerItem>
        </StaggerContainer>
      </ScrollReveal>
      <ScrollReveal
        as="article"
        direction="right"
        className="feature studio-feature"
      >
        <StaggerContainer className="viewport-tool-inner">
          <StaggerItem>
            <h3>Creative Studio</h3>
          </StaggerItem>
          <StaggerItem as="p">
            Change the look and feel of a brand in real time.
          </StaggerItem>
          <StaggerItem className="mini-tool">
            <div className="mini-controls">
              <div className="studio-swatches">
                {palettes.map(([ink, paper], i) => (
                  <button
                    key={paper}
                    type="button"
                    aria-label={"Preview palette " + (i + 1)}
                    aria-pressed={palette === i}
                    onClick={() => setPalette(i)}
                  >
                    <i style={{ background: ink }} />
                    <i style={{ background: paper }} />
                  </button>
                ))}
              </div>
              <label>
                Typography
                <select value={font} onChange={(e) => setFont(e.target.value)}>
                  <option>Space Grotesk</option>
                  <option>Georgia</option>
                  <option>Courier New</option>
                </select>
              </label>
            </div>
            <div
              className="mini-brand"
              style={{
                background: palettes[palette][1],
                color: palettes[palette][0],
                fontFamily: font,
              }}
            >
              <small>Brand preview</small>
              <strong>Good Form.</strong>
              <span>Objects for slower mornings.</span>
            </div>
          </StaggerItem>
          <StaggerItem>
            <ButtonLink to="/studio" kind="dark">
              Open the studio
            </ButtonLink>
          </StaggerItem>
        </StaggerContainer>
      </ScrollReveal>
    </div>
  );
}
export function DissaraMockup() {
  return (
    <div className="dissara-mockup" aria-hidden="true">
      <div className="dissara-desktop">
        <div className="dissara-browser">
          ● ● ● <span>dissara.com</span>
        </div>
        <div className="dissara-screen">
          <small>JEWELLERY FOR EVERY DAY</small>
          <strong>DISSARA</strong>
          <span>Explore the collection</span>
        </div>
      </div>
      <div className="dissara-phone">
        <div className="dissara-screen">
          <small>THE COLLECTION</small>
          <strong>DISSARA</strong>
          <span>Shop jewellery</span>
        </div>
      </div>
    </div>
  );
}
