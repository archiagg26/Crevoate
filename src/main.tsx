import { StaggerContainer, StaggerItem } from "./scroll-reveal";
import { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { ArrowLeft, Asterisk, ChevronDown, Menu, X } from "lucide-react";
import { MotionConfig } from "motion/react";
import { auth } from "./data";
import { homepageSections, useActiveSection } from "./site-motion";
import { Home, About, Service, Services, Work, CaseStudy } from "./marketing";
import {
  ButtonLink,
  Notice,
  Page,
  SessionProvider,
  useRows,
  useSession,
} from "./ui";
import "./style.css";
import "./editorial.css";
import "./workspaces.css";
import "./site-motion.css";

const Planner = lazy(() =>
  import("./tools").then((m) => ({ default: m.Planner })),
);
const CampaignCalendar = lazy(() =>
  import("./campaign-calendar-page").then((m) => ({
    default: m.CampaignCalendarPage,
  })),
);
const Studio = lazy(() =>
  import("./creative-studio").then((m) => ({ default: m.Studio })),
);
const Inquiry = lazy(() =>
  import("./tools").then((m) => ({ default: m.Inquiry })),
);
const Booking = lazy(() =>
  import("./tools").then((m) => ({ default: m.BookingPage })),
);
const Proposal = lazy(() =>
  import("./tools").then((m) => ({ default: m.ProposalPage })),
);
const Login = lazy(() =>
  import("./access").then((m) => ({ default: m.Login })),
);
const Protected = lazy(() =>
  import("./access").then((m) => ({ default: m.Protected })),
);
const Dashboard = lazy(() =>
  import("./dashboard").then((m) => ({ default: m.Dashboard })),
);
const DemoWorkspace = import.meta.env.DEV
  ? lazy(() => import("./demo-workspace"))
  : null;
const Project = lazy(() =>
  import("./dashboard").then((m) => ({ default: m.ProjectDetail })),
);
const Discovery = lazy(() =>
  import("./discovery").then((m) => ({ default: m.Discovery })),
);
const Analytics = lazy(() =>
  import("./discovery").then((m) => ({ default: m.AnalyticsPage })),
);
const nav = [
  ["/", "Home"],
  ["/services", "Services"],
  ["/work", "Work"],

  ["/about", "About"],
  ["/contact", "Contact"],
];
const serviceNav = [
  ["/services/branding", "Brand strategy"],
  ["/services/ui-ux", "UI/UX design"],
  ["/services/web-development", "Website development"],
  ["/services/influencer-marketing", "Influencer marketing"],
  ["/services/social-media", "Social media marketing"],
  ["/services/campaign-production", "Campaign production"],
  ["/services/content", "Content and storytelling"],
];
const toolsNav = [
  ["/studio", "Creative Studio"],
  ["/planner", "Campaign Planner"],
  ["/creators", "Creator Discovery"],
  ["/proposal", "Proposal Generator"],
];
function Logo() {
  return (
    <Link className="logo" to="/" aria-label="Creovate home">
      <span>
        <Asterisk size={28} strokeWidth={2.8} />
      </span>
      creovate<span className="logo-dot">.</span>
    </Link>
  );
}
function DraftScope({ children }: { children: React.ReactNode }) {
  const { ready, user } = useSession();
  const location = useLocation();
  if (!ready)
    return (
      <main id="main" className="wrap subpage">
        <p role="status">Checking your session…</p>
      </main>
    );
  return (
    <div
      key={
        (user?.id ?? "visitor") +
        ":" +
        (new URLSearchParams(location.search).get("edit") ?? "new")
      }
    >
      {children}
    </div>
  );
}
function Shell() {
  const location = useLocation();
  let presentationWorkspace = false;
  if (import.meta.env.DEV) {
    presentationWorkspace = /^\/preview\/workspace\/?$/i.test(
      location.pathname,
    );
    try {
      presentationWorkspace ||=
        sessionStorage.getItem("creovate.presentation") === "active";
    } catch {
      // Fall back to showing the account on the preview route.
    }
  }
  const navigate = useNavigate();
  const { user, setUser } = useSession();
  const [menu, setMenu] = useState(false);
  const [dropdown, setDropdown] = useState("");
  const notifications = useRows("notifications");
  const unread = notifications.rows.filter((row) => !row.data.read).length;
  const activeSection = useActiveSection(location.pathname);
  const [avatarError, setAvatarError] = useState(false);
  useEffect(() => setAvatarError(false), [user?.avatar]);
  function closeMenus() {
    setMenu(false);
    setDropdown("");
  }
  function dropdownPanel(id: string, label: string, links: string[][]) {
    return (
      <div
        className="nav-dropdown"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget))
            setDropdown((value) => (value === id ? "" : value));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && dropdown === id) {
            e.stopPropagation();
            setDropdown("");
            e.currentTarget.querySelector("button")?.focus();
          }
        }}
      >
        {id === "services" && (
          <NavLink to="/services" onClick={closeMenus}>
            Services
          </NavLink>
        )}
        <button
          type="button"
          className="nav-disclosure"
          aria-label={id === "services" ? "Browse services" : undefined}
          aria-expanded={dropdown === id}
          aria-controls={"nav-" + id}
          onClick={() => setDropdown(dropdown === id ? "" : id)}
        >
          {id !== "services" && label}
          <ChevronDown size={15} />
        </button>
        <div className="nav-panel" id={"nav-" + id} hidden={dropdown !== id}>
          {links.map(([path, name]) => (
            <NavLink key={path} to={path} onClick={closeMenus}>
              {name}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }
  const [signoutError, setSignoutError] = useState("");
  useEffect(() => {
    closeMenus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  async function logout() {
    setSignoutError("");
    try {
      await auth.logout();
      setUser(null);
      navigate("/login");
    } catch {
      setSignoutError("Could not sign out. Please try again.");
    }
  }
  if (location.pathname.replace(/\/+$/, "").toLowerCase() === "/login") {
    return (
      <div className="auth-page">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="wrap auth-nav">
          <Logo />
          <nav aria-label="Workspace navigation">
            <Link to="/">
              <ArrowLeft size={16} aria-hidden="true" /> Back to website
            </Link>
          </nav>
        </header>
        <Suspense
          fallback={
            <main id="main" className="wrap" role="status">
              Loading workspace…
            </main>
          }
        >
          <Login />
        </Suspense>
      </div>
    );
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="wrap header-inner">
          <div className="nav-brand">
            <Logo />
          </div>
          <button
            className="menu-toggle"
            aria-expanded={menu}
            aria-controls="primary-nav"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => {
              if (menu) closeMenus();
              else setMenu(true);
            }}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav
            id="primary-nav"
            aria-label="Main navigation"
            className={menu ? "nav open" : "nav"}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeMenus();
            }}
          >
            {nav.map(([path, label]) =>
              path === "/services" ? (
                <div className="nav-service-slot" key={path}>
                  {dropdownPanel("services", label, serviceNav)}
                </div>
              ) : (
                <NavLink
                  key={path}
                  end={path === "/"}
                  to={path}
                  onClick={() => setMenu(false)}
                >
                  {label}
                </NavLink>
              ),
            )}
            {dropdownPanel("tools", "Creative Tools", toolsNav)}
            <div className="nav-actions">
              {user ? (
                <div
                  className="nav-dropdown account-menu"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget))
                      setDropdown((value) =>
                        value === "account" ? "" : value,
                      );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setDropdown("");
                      e.currentTarget.querySelector("button")?.focus();
                    }
                  }}
                >
                  <button
                    type="button"
                    className="nav-disclosure account-toggle"
                    aria-label={"Account for " + user.name}
                    aria-expanded={dropdown === "account"}
                    aria-controls="nav-account"
                    onClick={() =>
                      setDropdown(dropdown === "account" ? "" : "account")
                    }
                  >
                    <span className="account-avatar" aria-hidden="true">
                      {user.avatar && !avatarError ? (
                        <img
                          src={user.avatar}
                          alt=""
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        user.name
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()
                      )}
                    </span>
                    <span className="account-name">{user.name}</span>
                    {unread > 0 && (
                      <span
                        className="unread-count"
                        aria-label={unread + " unread notifications"}
                      >
                        {unread}
                      </span>
                    )}
                    <ChevronDown size={15} />
                  </button>
                  <div
                    className="nav-panel"
                    id="nav-account"
                    hidden={dropdown !== "account"}
                  >
                    {user.role === "admin" && (
                      <NavLink to="/admin" onClick={closeMenus}>
                        Agency Workspace
                      </NavLink>
                    )}
                    {[
                      ["/dashboard", "My Workspace"],
                      ["/dashboard?tab=campaigns", "My Campaigns"],
                      ["/dashboard?tab=projects", "My Projects"],
                      ["/dashboard?tab=kits", "Saved Brand Kits"],
                      [
                        "/dashboard?tab=notifications",
                        "Notifications" + (unread ? " (" + unread + ")" : ""),
                      ],
                      ["/dashboard?tab=settings", "Account Settings"],
                    ].map(([path, label]) => (
                      <NavLink end key={path} to={path} onClick={closeMenus}>
                        {label}
                      </NavLink>
                    ))}
                    <button
                      type="button"
                      className="plain-button"
                      onClick={() => void logout()}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : presentationWorkspace ? (
                <Link
                  className="presentation-account"
                  to="/preview/workspace"
                  onClick={closeMenus}
                >
                  <span aria-hidden="true">A</span>
                  <span>
                    Archi <small>Signed in</small>
                  </span>
                </Link>
              ) : (
                <NavLink to="/login" onClick={closeMenus}>
                  Login
                </NavLink>
              )}
              <ButtonLink to="/contact">Start a Project</ButtonLink>
            </div>
          </nav>
        </div>
        {location.pathname === "/" && (
          <nav className="wrap homepage-jump" aria-label="On this page">
            {homepageSections.map(([id, label]) => (
              <a
                key={id}
                href={"#" + id}
                aria-current={activeSection === id ? "location" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
        <div className="scroll-progress" aria-hidden="true" />
      </header>
      <Notice error={signoutError} />
      <Suspense
        fallback={
          <main id="main" className="wrap subpage">
            <p role="status">Loading page…</p>
          </main>
        }
      >
        <div className="route-entrance" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<Service />} />
            <Route path="/work" element={<Work />} />
            <Route path="/work/:id" element={<CaseStudy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Inquiry />} />
            <Route
              path="/planner"
              element={
                <DraftScope>
                  <Planner />
                </DraftScope>
              }
            />
            <Route
              path="/planner/calendar/:id"
              element={
                <Protected>
                  <CampaignCalendar />
                </Protected>
              }
            />
            <Route
              path="/studio"
              element={
                <DraftScope>
                  <Studio />
                </DraftScope>
              }
            />
            <Route path="/creators" element={<Discovery />} />
            <Route path="/booking" element={<Booking />} />
            <Route
              path="/proposal"
              element={
                <DraftScope>
                  <Proposal />
                </DraftScope>
              }
            />
            <Route
              path="/login.html"
              element={<Navigate to="/login" replace />}
            />
            <Route
              path="/signup.html"
              element={<Navigate to="/login?signup=1" replace />}
            />
            {DemoWorkspace && (
              <Route path="/preview/workspace" element={<DemoWorkspace />} />
            )}
            <Route
              path="/dashboard"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/dashboard/project/:id"
              element={
                <Protected>
                  <Project />
                </Protected>
              }
            />
            <Route
              path="/admin"
              element={
                <Protected admin>
                  <Dashboard admin />
                </Protected>
              }
            />
            <Route
              path="/admin/project/:id"
              element={
                <Protected admin>
                  <Project admin />
                </Protected>
              }
            />
            <Route
              path="/analytics"
              element={
                <Protected>
                  <Analytics />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <Page
                  label="404"
                  title="This page wandered off."
                  intro="Find your way back to the studio."
                >
                  <ButtonLink to="/">Back to home</ButtonLink>
                </Page>
              }
            />
          </Routes>
        </div>
      </Suspense>
      <footer className="footer">
        <div className="wrap">
          <StaggerContainer className="footer-grid">
            <StaggerItem enabled={location.pathname === "/"}>
              <Logo />
              <p>
                Independent creative studio
                <br />
                Design, digital and campaigns.
              </p>
            </StaggerItem>
            <StaggerItem enabled={location.pathname === "/"}>
              <h2>Explore</h2>
              <Link to="/services">Services</Link>
              <Link to="/work">Selected work</Link>
              <Link to="/about">About Creovate</Link>
            </StaggerItem>
            <StaggerItem enabled={location.pathname === "/"}>
              <h2>Studio tools</h2>
              <Link to="/planner">Campaign Planner</Link>
              <Link to="/studio">Creative Studio</Link>
              <Link to="/creators">Creator Discovery</Link>
              <Link to="/proposal">Proposal Generator</Link>
            </StaggerItem>
            <StaggerItem enabled={location.pathname === "/"}>
              <h2>Work with us</h2>
              <Link to="/contact">Start a project</Link>
              <Link to="/booking">Book a consultation</Link>
              <Link
                to={
                  user
                    ? "/dashboard"
                    : presentationWorkspace
                      ? "/preview/workspace"
                      : "/login"
                }
              >
                Client workspace
              </Link>
            </StaggerItem>
          </StaggerContainer>
          <div className="footer-base">
            <span>© {new Date().getFullYear()} Creovate</span>
            <span>Independent by design.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <SessionProvider>
      <MotionConfig reducedMotion="user">
        <Shell />
      </MotionConfig>
    </SessionProvider>
  </BrowserRouter>,
);
