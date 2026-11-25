import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import {
  auth,
  authAvailability,
  authMessage,
  configurationError,
  safeReturnPath,
  supabase,
  workspaceSetupError,
} from "./data";
import { Field, useAction } from "./tools";
import { ButtonLink, Notice, Page, useSession } from "./ui";
import "./access.css";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.8 24.5c0-1.4-.1-2.8-.4-4.2H24v8.6h12.2a10.4 10.4 0 0 1-4.5 6.8v5.6H39c4.3-4 6.8-9.8 6.8-16.8z"
      />
      <path
        fill="#34A853"
        d="M24 46c6.1 0 11.3-2 15-5.4l-7.3-5.6c-2 1.3-4.6 2.1-7.7 2.1-5.9 0-10.9-4-12.7-9.4H3.8v5.8A22 22 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.3 27.7a13.3 13.3 0 0 1 0-7.4v-5.8H3.8a22 22 0 0 0 0 19z"
      />
      <path
        fill="#EA4335"
        d="M24 10.9c3.3 0 6.3 1.1 8.6 3.3L39 7.8A21.2 21.2 0 0 0 24 2 22 22 0 0 0 3.8 14.5l7.5 5.8A13.4 13.4 0 0 1 24 10.9z"
      />
    </svg>
  );
}
function AuthEditorial() {
  const reducedMotion = useReducedMotion();
  const x = useSpring(0, { stiffness: 105, damping: 19 });
  const y = useSpring(0, { stiffness: 105, damping: 19 });
  return (
    <section
      className="auth-editorial"
      aria-label="Creovate workspace"
      onPointerMove={(event) => {
        if (reducedMotion || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 20);
        y.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 15);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <p className="eyebrow">Creovate workspace</p>
      <strong className="auth-editorial-title">
        <span>Great creative</span>
        <span>
          starts <em>here.</em>
        </span>
      </strong>
      <p>Build campaigns, share ideas and keep the work moving.</p>
      <motion.div className="auth-art" style={{ x, y }}>
        <svg className="auth-doodle" viewBox="0 0 240 130" aria-hidden="true">
          <path
            className="auth-sage"
            d="M37 68c-5-20 19-39 47-38 31 1 46 12 50 29 6 26-20 43-48 42-23 0-45-11-49-33Z"
          />
          <path
            className="auth-peach"
            d="M151 48c7-21 30-22 43-5 16 1 29 16 18 28 4 15-14 24-28 16-18 11-43-1-36-17-9-8-7-14 3-22Z"
          />
          <path d="m65 57 0 7m25-9v8m-27 11c11 12 23 12 34-2m65-47 4-13m15 16 11-7M51 105l-14 12m85-24 11 10m29-43 11 4m11-10 11 3m-25 15 15 4" />
          <path
            className="auth-spark"
            d="M25 19c2 7 4 9 11 11-7 2-9 4-11 11-2-7-4-9-11-11 7-2 9-4 11-11ZM219 86v15m-7-7h14"
          />
        </svg>
      </motion.div>
    </section>
  );
}

export function Login() {
  const [params, setParams] = useSearchParams();
  const returnPath = safeReturnPath(params.get("next"));
  const navigate = useNavigate();
  const { user, setUser, error, ready } = useSession();
  const action = useAction(authMessage);
  const [pending, setPending] = useState<"form" | "google">("form");
  const [availability, setAvailability] =
    useState<Awaited<ReturnType<typeof authAvailability>>>();
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void authAvailability().then((result) => {
      if (active) setAvailability(result);
    });
    return () => {
      active = false;
    };
  }, []);
  const mode = params.has("recover")
    ? "recover"
    : params.has("reset")
      ? "reset"
      : params.has("signup")
        ? "signup"
        : "login";
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const strength =
    Number(password.length >= 8) +
    Number(password.length >= 12) +
    Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) +
    Number(/[0-9]/.test(password) && /[^\w]/.test(password));
  function switchMode(next: string) {
    const nextParams = new URLSearchParams();
    if (returnPath) nextParams.set("next", returnPath);
    if (params.has("live")) nextParams.set("live", "1");
    if (next !== "login") nextParams.set(next, "1");
    setPassword("");
    setVisible(false);
    action.clear();
    setParams(nextParams);
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (localPresentation) {
      openPresentation?.();
      return;
    }
    const fields = new FormData(e.currentTarget);
    if (
      (!availability || availability.schemaMissing) &&
      (mode === "login" || mode === "signup")
    )
      return;
    const email = String(fields.get("email") ?? "").trim();
    if (email) setEmail(email);
    const name = String(fields.get("name") ?? "").trim();
    const enteredPassword = String(fields.get("password") ?? "");
    const done =
      mode === "reset"
        ? "If an account exists, check its inbox for the reset link."
        : "";
    setPending("form");
    void action.run(async () => {
      if (mode === "reset") {
        await auth.reset(email, returnPath);
        return;
      }
      if (mode === "recover") {
        await auth.changePassword(enteredPassword);
        const updated = await auth.current();
        setUser(updated);
        navigate(
          returnPath ?? (updated?.role === "admin" ? "/admin" : "/dashboard"),
          { replace: true },
        );
        return;
      }
      if (mode === "signup" && !name) throw new Error("Enter your name.");
      const authenticated =
        mode === "signup"
          ? await auth.signup(name, email, enteredPassword)
          : await auth.login(email, enteredPassword);
      setUser(authenticated);
    }, done);
  }
  if (user && mode !== "recover")
    return (
      <Navigate
        to={
          mode === "signup"
            ? "/dashboard"
            : (returnPath ?? (user.role === "admin" ? "/admin" : "/dashboard"))
        }
        replace
      />
    );
  const title = {
    login: "Welcome back.",
    signup: "Create your account.",
    reset: "Reset your password.",
    recover: "Choose a new password.",
  }[mode];
  const subtitle = {
    login: "Pick up where you left off. Your creative workspace is waiting.",
    signup:
      "Bring your projects, campaigns and collaborators into one workspace.",
    reset:
      "Enter the email you use for Creovate and we’ll send you a reset link.",
    recover: "Set a new password to get back to your workspace.",
  }[mode];
  const localPresentation =
    import.meta.env.DEV &&
    mode === "login" &&
    !params.has("next") &&
    !params.has("live") &&
    !params.has("code") &&
    !params.has("error") &&
    !params.has("error_description");
  const openPresentation = import.meta.env.DEV
    ? () => {
        try {
          sessionStorage.setItem("creovate.presentation", "active");
        } catch {
          // The preview remains available if tab storage is blocked.
        }
        navigate("/preview/workspace", { replace: true });
      }
    : undefined;
  const blocked =
    (mode === "login" || mode === "signup") &&
    (!availability || availability.schemaMissing);
  return (
    <main id="main" className="wrap auth-layout">
      <AuthEditorial />
      <section className="auth-panel" aria-labelledby="auth-title">
        <header className="auth-heading" key={mode}>
          <h1 id="auth-title">{title}</h1>
          <p>{subtitle}</p>
        </header>
        {!supabase && !localPresentation ? (
          <>
            <Notice error={configurationError} />
            <ButtonLink kind="secondary" to="/work">
              Browse the portfolio
            </ButtonLink>
          </>
        ) : !ready ? (
          <p role="status">Checking your session…</p>
        ) : (
          <>
            <Notice
              error={
                (localPresentation ? "" : error) ||
                (params.has("error_description")
                  ? authMessage({
                      code: params.get("error_code"),
                      message: params.get("error_description"),
                    })
                  : undefined)
              }
            />
            {mode === "recover" && !user && (
              <Notice error="Open the password reset link from your email in this browser to continue." />
            )}
            {!localPresentation &&
              availability?.schemaMissing &&
              error !== workspaceSetupError && (
                <Notice error={workspaceSetupError} />
              )}
            {(mode === "login" || mode === "signup") &&
              availability?.google && (
                <button
                  type="button"
                  className="button secondary auth-google"
                  disabled={action.busy || blocked}
                  onClick={() => {
                    setPending("google");
                    void action.run(() => auth.google(returnPath), "");
                  }}
                >
                  {action.busy && pending === "google" ? (
                    <span className="auth-spinner" aria-hidden="true" />
                  ) : (
                    <GoogleMark />
                  )}
                  {action.busy && pending === "google"
                    ? "Opening Google…"
                    : "Continue with Google"}
                </button>
              )}
            {(mode === "login" || mode === "signup") &&
              availability?.google && (
                <div className="auth-divider">or use your email</div>
              )}
            <form
              className="form-stack auth-form"
              aria-busy={action.busy}
              key={mode}
              onSubmit={submit}
            >
              {mode === "signup" && (
                <Field label="Your name">
                  <input
                    name="name"
                    required
                    maxLength={120}
                    autoComplete="name"
                  />
                </Field>
              )}
              {mode !== "recover" && (
                <Field label="Email address">
                  <input
                    name="email"
                    required
                    type="email"
                    autoComplete={mode === "login" ? "username" : "email"}
                    defaultValue={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                    }}
                  />
                </Field>
              )}
              {mode !== "reset" && (
                <>
                  <div className="auth-password">
                    <Field
                      label={mode === "recover" ? "New password" : "Password"}
                    >
                      <input
                        id="auth-password"
                        name="password"
                        required
                        minLength={mode === "login" ? undefined : 8}
                        autoComplete={
                          mode !== "login" ? "new-password" : "current-password"
                        }
                        type={visible ? "text" : "password"}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                    <button
                      type="button"
                      className="plain-button"
                      aria-label={visible ? "Hide password" : "Show password"}
                      onClick={() => setVisible(!visible)}
                      aria-controls="auth-password"
                    >
                      {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <div className="password-strength">
                      <meter
                        aria-label="Password strength"
                        min="0"
                        max="4"
                        value={strength}
                      />
                      <small>
                        {"Password strength: " +
                          ["Very weak", "Weak", "Fair", "Good", "Strong"][
                            strength
                          ]}
                      </small>
                    </div>
                  )}
                </>
              )}
              <button
                type={localPresentation ? "button" : "submit"}
                onClick={localPresentation ? openPresentation : undefined}
                className="button primary auth-submit"
                disabled={
                  !localPresentation &&
                  (action.busy || (mode === "recover" && !user) || blocked)
                }
              >
                {action.busy && pending === "form" ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" /> Please
                    wait…
                  </>
                ) : (
                  <>
                    {
                      {
                        login: "Log in",
                        signup: "Sign up",
                        reset: "Send reset link",
                        recover: "Update password",
                      }[mode]
                    }
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </>
                )}
              </button>
              <Notice error={action.error} success={action.success} />
            </form>
            <div className="auth-switch">
              {mode === "login" ? (
                <>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() => switchMode("signup")}
                    disabled={action.busy}
                  >
                    Create an account
                  </button>
                  <button
                    type="button"
                    className="plain-button"
                    onClick={() => switchMode("reset")}
                    disabled={action.busy}
                  >
                    Forgot password?
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="plain-button"
                  onClick={() => switchMode("login")}
                  disabled={action.busy}
                >
                  Back to login
                </button>
              )}
            </div>
          </>
        )}
        {supabase && ready && mode === "recover" && !user && (
          <Link to="/login?reset=1">Request another reset link</Link>
        )}
      </section>
    </main>
  );
}
export function Protected({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const location = useLocation();
  const { ready, user, error } = useSession();
  if (!ready)
    return (
      <Page label="Workspace" title="Loading your workspace">
        <p role="status">Checking your session…</p>
      </Page>
    );
  if (error)
    return (
      <Page label="Workspace" title="Session unavailable">
        <Notice error={error} />
      </Page>
    );
  if (!user)
    return (
      <Navigate
        to={
          "/login?next=" +
          encodeURIComponent(
            location.pathname + location.search + location.hash,
          )
        }
        replace
      />
    );
  if (admin && user.role !== "admin")
    return (
      <Page label="Workspace" title="Admin access required.">
        <ButtonLink to="/dashboard">Go to client workspace</ButtonLink>
      </Page>
    );
  return children;
}
