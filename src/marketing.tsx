import {
  ImageReveal,
  ParallaxImage,
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
  TextReveal,
} from "./scroll-reveal";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DissaraMockup, ProcessTimeline, ToolPreviews } from "./home-showcases";
import {
  ArrowDown,
  ArrowUpRight,
  Asterisk,
  Aperture,
  Orbit,
  Sparkles,
} from "lucide-react";
import {
  dissaraProject,
  faq,
  money,
  projects,
  projectWebsite,
  services,
} from "./content";
import { ButtonLink, Detail, Page } from "./ui";
import { CreativeBento } from "./creative-bento";
const publicPortfolio = [dissaraProject, ...projects];
const heroProjects = [projects[2], projects[0], projects[1]];
const conceptImages: Record<string, string> = {
  ora: "ora",
  bloom: "bloom",
  offbeat: "offbeat",
  easy: "easy",
};
const capabilityNames = [
  "Brand strategy",
  "Digital design",
  "Creative campaigns",
  "Content production",
];
export function Art({
  project,
  hero = false,
  parallax = false,
}: {
  project: (typeof projects)[number];
  hero?: boolean;
  parallax?: boolean;
}) {
  const image = conceptImages[project.id];
  const Cover = parallax ? ParallaxImage : "img";
  return (
    <div
      className={
        "art art-" +
        project.style +
        (hero ? " hero-art" : "") +
        (image ? " art-photo" : "")
      }
      style={{ backgroundColor: project.color, color: project.ink }}
      aria-hidden="true"
    >
      {image && (
        <Cover
          src={"/concepts/" + image + ".webp"}
          alt=""
          loading={hero ? "eager" : "lazy"}
          fetchPriority={hero ? "high" : "auto"}
        />
      )}
      <span className="art-caption">
        {project.sector} ·{" "}
        {projectWebsite(project.liveUrl) ? "Live website" : "Studio concept"}
      </span>
      <div className="art-shape">
        {project.style === "ora" ? (
          <Orbit />
        ) : project.style === "bloom" ? (
          <Aperture />
        ) : project.style === "easy" ? (
          <Sparkles />
        ) : (
          <Asterisk />
        )}
      </div>
      <strong>{project.name}</strong>
      {!projectWebsite(project.liveUrl) && (
        <span className="art-edition">CREOVATE STUDIO</span>
      )}
    </div>
  );
}
export function Questions({
  items = faq,
  animated = false,
}: {
  items?: string[][];
  animated?: boolean;
}) {
  return (
    <StaggerContainer className="faqs">
      {items.map(([question, answer]) => (
        <StaggerItem as="details" key={question} enabled={animated}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
export function Home() {
  const [active, setActive] = useState(0);
  const [service, setService] = useState(0);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    if (paused || interacting || reduceMotion) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % heroProjects.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [paused, interacting, reduceMotion]);

  const current = services[service] ?? services[0];
  const relatedByService: Record<string, string> = {
    "ui-ux": "bloom",
    "web-development": "dissara",
    branding: "ora",
    "influencer-marketing": "offbeat",
    "social-media": "offbeat",
    "campaign-production": "offbeat",
    content: "easy",
  };
  const relatedId = current ? relatedByService[current.id] : undefined;
  const related = publicPortfolio.find((project) => project.id === relatedId);

  return (
    <main id="main">
      <section className="wrap hero" id="home">
        <div className="hero-copy">
          <ScrollReveal as="p" className="eyebrow">
            <span className="signal" /> Independent creative studio
          </ScrollReveal>
          <TextReveal
            as="h1"
            lines={["Good Ideas", "Deserve", <em>Great Creative.</em>]}
          />
          <ScrollReveal as="p" className="lede" delay={0.16}>
            We bring brands to life through thoughtful design, digital
            experiences, and campaigns that connect with real people.
          </ScrollReveal>
          <StaggerContainer className="actions">
            <StaggerItem>
              <ButtonLink to="/contact">Start Your Project</ButtonLink>
            </StaggerItem>
            <StaggerItem>
              <ButtonLink to="/work" kind="secondary">
                Explore Our Work
              </ButtonLink>
            </StaggerItem>
          </StaggerContainer>
        </div>
        <div
          className="composition"
          onMouseEnter={() => setInteracting(true)}
          onMouseLeave={() => setInteracting(false)}
          onFocus={() => setInteracting(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget))
              setInteracting(false);
          }}
        >
          <ScrollReveal className="composition-top">
            <span>
              <Asterisk size={18} /> STUDIO IN MOTION
            </span>
            <span>CONCEPT SERIES</span>
          </ScrollReveal>
          <ImageReveal className="hero-image-reveal">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.6 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                key={active}
              >
                <Link
                  className="hero-case-link"
                  aria-label={
                    "View " + heroProjects[active].name + " case study"
                  }
                  to={"/work/" + heroProjects[active].id}
                >
                  <Art project={heroProjects[active]} hero />
                </Link>
              </motion.div>
            </AnimatePresence>
          </ImageReveal>
          <StaggerContainer
            className="composition-bottom"
            label="Featured concepts"
          >
            {!reduceMotion && (
              <StaggerItem
                as="button"
                type="button"
                onClick={() => setPaused(!paused)}
              >
                {paused ? "Play rotation" : "Pause rotation"}
              </StaggerItem>
            )}
            {heroProjects.map((p, i) => (
              <StaggerItem
                as="button"
                className={i === active ? "active" : ""}
                key={p.id}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                {p.name}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        <ScrollReveal as="a" href="#creative-bento" className="scroll-link">
          <ArrowDown size={17} /> Explore the studio
        </ScrollReveal>
      </section>
      <CreativeBento />
      <div className="stripe">
        <StaggerContainer className="wrap">
          {capabilityNames.map((name) => (
            <StaggerItem as="span" key={name}>
              <Asterisk size={20} />
              {name}
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
      <section className="wrap section" id="services">
        <ScrollReveal as="p" className="eyebrow">
          What we do
        </ScrollReveal>
        <TextReveal lines={["From first thought", "to final form."]} />
        {current && (
          <div className="service-showcase">
            <StaggerContainer className="service-select">
              {services.map((s, i) => (
                <StaggerItem
                  as="button"
                  key={s.id}
                  aria-pressed={s.id === current.id}
                  onClick={() => setService(i)}
                >
                  <span>{s.name}</span>
                  <ArrowUpRight size={19} />
                </StaggerItem>
              ))}
            </StaggerContainer>
            <article
              key={current.id}
              className="service-feature editorial-service"
            >
              <ImageReveal className="service-visual">
                {related?.id === "dissara" ? (
                  <DissaraMockup />
                ) : related ? (
                  <Art project={related} />
                ) : (
                  <span className="feature-icon">{current.icon}</span>
                )}
              </ImageReveal>
              <ScrollReveal className="service-description">
                <small>Estimated delivery · {current.days} days</small>
                <h3>{current.name}</h3>
                <p>{current.line}</p>
                <ul>
                  {current.outputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="actions">
                  <ButtonLink kind="dark" to={"/contact?service=" + current.id}>
                    Start project
                  </ButtonLink>
                  <Link to={"/services/" + current.id}>Explore service</Link>
                  {related && (
                    <Link to={"/work/" + related.id}>Related project</Link>
                  )}
                </div>
              </ScrollReveal>
            </article>
          </div>
        )}
      </section>
      <section className="wrap section" id="selected-work">
        <div className="section-title">
          <div>
            <ScrollReveal as="p" className="eyebrow">
              Selected work
            </ScrollReveal>
            <TextReveal lines={["Ideas made visible."]} />
          </div>
          <ScrollReveal>
            <ButtonLink to="/work" kind="secondary">
              All case studies
            </ButtonLink>
          </ScrollReveal>
        </div>
        <WorkGrid items={publicPortfolio} animated />
      </section>
      <section className="dark-section" id="process">
        <div className="wrap section">
          <ScrollReveal as="p" className="eyebrow">
            How we work
          </ScrollReveal>
          <TextReveal lines={["Make it meaningful."]} />
          <ProcessTimeline />
        </div>
      </section>
      <section className="wrap section" id="creative-tools">
        <ScrollReveal as="p" className="eyebrow">
          Creative tools
        </ScrollReveal>
        <TextReveal lines={["Get an idea moving."]} />
        <ToolPreviews />
      </section>
      <section className="wrap section faq-section" id="faq">
        <div>
          <ScrollReveal as="p" className="eyebrow">
            Good to know
          </ScrollReveal>
          <TextReveal lines={["Before we begin."]} />
        </div>
        <Questions animated />
      </section>
      <section className="cta" id="final-cta">
        <div className="wrap">
          <div>
            <TextReveal lines={["What are you", "dreaming up?"]} />
            <ScrollReveal as="p" delay={0.12}>
              Bring an idea, a challenge or a brief. We’ll help you find the
              next step.
            </ScrollReveal>
          </div>
          <ScrollReveal delay={0.14}>
            <ButtonLink to="/contact" kind="dark">
              Tell us about it
            </ButtonLink>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
export function Services() {
  return (
    <Page
      label="Capabilities"
      title="Creative work, built together."
      intro="Choose a discipline or combine a few into one project brief."
    >
      <div className="grid three">
        {services.map((s) => (
          <article className="card" key={s.id}>
            <span className="feature-icon">{s.icon}</span>
            <h2>{s.name}</h2>
            <p>{s.line}</p>
            <ButtonLink kind="secondary" to={"/services/" + s.id}>
              View service
            </ButtonLink>
          </article>
        ))}
      </div>
      <div className="actions">
        <ButtonLink to="/contact">Combine services</ButtonLink>
      </div>
    </Page>
  );
}
export function Service() {
  const { id } = useParams();
  const s = services.find((service) => service.id === id);
  if (!s)
    return (
      <Page label="Services" title="Service details">
        <p className="empty">This service is unavailable.</p>
        <ButtonLink to="/services">Browse services</ButtonLink>
      </Page>
    );
  const relevant = projects.filter(
    (_, i) =>
      i === services.findIndex((item) => item.id === id) % projects.length,
  );
  return (
    <Page label="Service" title={s.name} intro={s.line}>
      <div className="grid two">
        <div className="card">
          <h2>Deliverables</h2>
          <ul>
            {s.outputs.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <p>Estimated timeline · {s.days} days</p>
        </div>
        <div className="card">
          <h2>Illustrative packages</h2>
          <p>Core scope · from {money(s.price)}</p>
          <p>Expanded scope · from {money(s.price * 1.65)}</p>
          <div className="actions">
            <ButtonLink to={"/contact?service=" + s.id}>
              Start project
            </ButtonLink>
            <ButtonLink
              kind="secondary"
              to={"/contact?service=" + s.id + "&quote=1"}
            >
              Request a quote
            </ButtonLink>
            <ButtonLink kind="secondary" to={"/planner?service=" + s.id}>
              Plan a campaign
            </ButtonLink>
          </div>
        </div>
      </div>
      <section className="section">
        <h2>Related concept work</h2>
        <WorkGrid items={relevant} />
      </section>
      <Questions
        items={[
          [
            "What is included in the estimate?",
            "The core estimate covers the listed deliverables and a shared review schedule. Final scope is confirmed after discovery.",
          ],
          ["Can I combine this with another service?", faq[0][1]],
        ]}
      />
    </Page>
  );
}
function WorkGrid({
  items,
  animated = false,
}: {
  items: typeof projects;
  animated?: boolean;
}) {
  return (
    <StaggerContainer className="grid two work-grid">
      {[...items]
        .sort((a, b) => Number(b.id === "dissara") - Number(a.id === "dissara"))
        .map((project) => {
          const website = projectWebsite(project.liveUrl);
          const art =
            project.id === "dissara" ? (
              <DissaraMockup />
            ) : (
              <Art project={project} parallax={animated} />
            );
          const content = (
            <>
              {animated ? <ImageReveal>{art}</ImageReveal> : art}
              <ScrollReveal enabled={animated} delay={0.1}>
                <span>
                  <small>
                    {project.category} ·{" "}
                    {website ? "Live website" : "Concept work"}
                  </small>
                  <h3>{project.name}</h3>
                  <p>{project.intro}</p>
                </span>
                <ArrowUpRight aria-hidden="true" />
              </ScrollReveal>
            </>
          );
          const classes =
            "work-link" +
            (!website && project.id === "dissara" ? " featured-work" : "");
          return website ? (
            <StaggerItem
              as="a"
              enabled={animated}
              href={website}
              key={project.id}
              className={classes}
            >
              {content}
            </StaggerItem>
          ) : (
            <StaggerItem
              as="link"
              enabled={animated}
              to={"/work/" + project.id}
              key={project.id}
              className={classes}
            >
              {content}
            </StaggerItem>
          );
        })}
    </StaggerContainer>
  );
}
export function Work() {
  const [category, set] = useState("All");
  const items = publicPortfolio.filter(
    (p) =>
      category === "All" ||
      p.category === category ||
      (category === "Influencer Marketing" && p.id === "offbeat"),
  );
  return (
    <Page
      label="Portfolio"
      title="Selected work."
      intro="Explore live websites and studio concepts across jewellery, skincare, fashion and lifestyle."
    >
      <div className="chips">
        {[
          "All",
          "Branding",
          "UI/UX",
          "Web Development",
          "Influencer Marketing",
          "Creative Campaigns",
        ].map((c) => (
          <button key={c} aria-pressed={c === category} onClick={() => set(c)}>
            {c}
          </button>
        ))}
      </div>
      <WorkGrid items={items} />
    </Page>
  );
}
export function CaseStudy() {
  const { id } = useParams();
  const project = publicPortfolio.find((item) => item.id === id);
  if (!project)
    return (
      <Page label="Portfolio" title="Case study">
        <p className="empty">This project is unavailable.</p>
        <ButtonLink to="/work">Back to work</ButtonLink>
      </Page>
    );
  const website = projectWebsite(project.liveUrl);
  const details = [
    ["Business problem", project.problem],
    ["Audience", project.audience],
    ["Creative strategy", project.strategy],
    ["Design process", project.process],
    ["Visual identity", project.identity],
    ["Final deliverables", project.deliverables],
  ].filter(([, text]) => text);
  return (
    <Page
      label={
        project.category + (website ? " / Live website" : " / Concept work")
      }
      title={project.name}
      intro={project.intro}
    >
      {id === "dissara" ? <DissaraMockup /> : <Art project={project} />}
      {id === "dissara" && (
        <section className="dissara-facts" aria-label="Dissara project details">
          <Detail
            title="Storefront"
            text="Browse jewellery by collection and open individual product pages on the live website."
          />
          <Detail
            title="Portfolio presentation"
            text="Desktop and mobile storefront mockups built with React and CSS. The product imagery is illustrative."
          />
          <Detail
            title="Scope"
            text="Live ecommerce website with product browsing and shopping journeys."
          />
        </section>
      )}
      {website && (
        <div className="actions">
          <a className="button primary" href={website}>
            Visit live website
          </a>
        </div>
      )}
      {details.length > 0 && (
        <section className="grid two section">
          {details.map(([title, text]) => (
            <Detail key={title} title={title} text={text} />
          ))}
        </section>
      )}
      <h2>Related projects</h2>
      <WorkGrid
        items={publicPortfolio.filter((p) => p.id !== id).slice(0, 2)}
      />
    </Page>
  );
}
export function About() {
  return (
    <Page
      label="About Creovate"
      title="A studio for good ideas."
      intro="Creovate brings brand strategy, design, frontend development and campaigns together in one creative practice."
    >
      <div className="grid two">
        <article className="card">
          <h2>How we collaborate</h2>
          <p>
            We agree on the brief, share work in progress and make room for
            feedback at each milestone. The project workspace brings briefs,
            proposals and deliverables together.
          </p>
        </article>
        <article className="card">
          <h2>What we make</h2>
          <p>
            Visual identities, interfaces, websites, creator-led campaigns and
            the content systems that support them.
          </p>
        </article>
      </div>
      <div className="actions">
        <ButtonLink to="/contact">Start a conversation</ButtonLink>
        <ButtonLink to="/booking" kind="secondary">
          Book a consultation
        </ButtonLink>
      </div>
    </Page>
  );
}
