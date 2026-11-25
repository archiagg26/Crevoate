import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  auth,
  supabase,
  list,
  message,
  type User,
  type Table,
  type Row,
} from "./data";

const Session = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
  ready: boolean;
  error: string;
}>({ user: null, setUser: () => {}, ready: false, error: "" });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let version = 0;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      const revision = ++version;
      clearTimeout(timer);
      if (!session) {
        setUser(null);
        setError("");
        setReady(true);
        return;
      }
      timer = setTimeout(() => {
        auth
          .current()
          .then((next) => {
            if (!active || revision !== version) return;
            setError("");
            setUser((previous) =>
              previous?.id === next?.id &&
              previous?.name === next?.name &&
              previous?.avatar === next?.avatar &&
              previous?.email === next?.email &&
              previous?.role === next?.role
                ? previous
                : next,
            );
          })
          .catch((e) => {
            if (active && revision === version) {
              setUser(null);
              setError(message(e));
            }
          })
          .finally(() => {
            if (active && revision === version) setReady(true);
          });
      }, 0);
    });
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);
  return (
    <Session.Provider value={{ user, setUser, ready, error }}>
      {children}
    </Session.Provider>
  );
}
export const useSession = () => useContext(Session);
export function useDraft<T>(key: string, fallback: T) {
  const { user } = useSession();
  const route = useLocation();
  const visitorKey = "creovate.draft.workspace.visitor." + key;
  const [transfer] = useState(() => {
    try {
      return Boolean(
        user &&
        sessionStorage.getItem("creovate.resume-guest") === route.pathname,
      );
    } catch {
      return false;
    }
  });
  const [storageKey] = useState(
    () => "creovate.draft.workspace." + (user?.id ?? "visitor") + "." + key,
  );
  const [initial] = useState(() => {
    try {
      const saved =
        sessionStorage.getItem(storageKey) ??
        (transfer ? sessionStorage.getItem(visitorKey) : null);
      if (saved) return { value: JSON.parse(saved) as T, restored: true };
    } catch {
      /* An invalid draft falls back to the default. */
    }
    return { value: fallback, restored: false };
  });
  const [value, setValue] = useState<T>(initial.value);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
      if (transfer) {
        sessionStorage.removeItem(visitorKey);
        sessionStorage.removeItem("creovate.resume-guest");
      }
    } catch {
      /* The form still works in memory. */
    }
  }, [storageKey, value, transfer, visitorKey]);
  return [
    value,
    setValue,
    () => {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Storage is optional. */
      }
    },
    initial.restored,
  ] as const;
}
export function SignInLink() {
  const route = useLocation();
  return (
    <Link
      className="button primary"
      to={"/login?next=" + encodeURIComponent(route.pathname + route.search)}
      onClick={() => {
        try {
          sessionStorage.setItem("creovate.resume-guest", route.pathname);
        } catch {
          /* Navigation is available without storage. */
        }
      }}
    >
      Sign in to save <ArrowUpRight size={17} aria-hidden="true" />
    </Link>
  );
}
export function useRows<K extends Table>(table: K) {
  const { user, ready } = useSession();
  const [rows, setRows] = useState<Row<K>[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [loadedFor, setLoadedFor] = useState<string>();
  const identity = user ? user.id + ":" + user.role : "visitor";
  useEffect(() => {
    if (!ready) return;
    let active = true;
    list(table, user)
      .then((result) => {
        if (active) {
          setRows(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setRows([]);
          setError(message(e));
        }
      })
      .finally(() => {
        if (active) {
          setLoadedFor(identity);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [table, user, ready, version, identity]);
  useEffect(() => {
    const tables: Table[] = [
      "projects",
      "project_milestones",
      "project_deliverables",
      "project_inquiries",
      "notifications",
      "campaigns",
      "brand_kits",
      "consultation_bookings",
      "feedback",
    ];
    const client = supabase;
    if (!client || !user || !tables.includes(table)) return;
    let active = true;
    const refresh = () => {
      if (active) setVersion((value) => value + 1);
    };
    const filter =
      user.role === "client" || table === "notifications"
        ? { filter: "user_id=eq." + user.id }
        : {};
    const channel = client
      .channel("workspace:" + table + ":" + crypto.randomUUID())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...filter },
        refresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      void client.removeChannel(channel);
    };
  }, [table, user]);
  return {
    rows: loadedFor === identity ? rows : [],
    error: loadedFor === identity ? error : "",
    loading: loading || loadedFor !== identity,
    refresh: () => setVersion((value) => value + 1),
  };
}
export function ButtonLink({
  to,
  children,
  kind = "primary",
}: {
  to: string;
  children: ReactNode;
  kind?: string;
}) {
  return (
    <Link className={"button " + kind} to={to}>
      {children}
      <ArrowUpRight size={17} aria-hidden="true" />
    </Link>
  );
}
export function Page({
  label,
  title,
  children,
  intro,
}: {
  label: string;
  title: string;
  children: ReactNode;
  intro?: string;
}) {
  useEffect(() => {
    document.title = title + " | Creovate";
    return () => {
      document.title = "Creovate — Independent Creative Studio";
    };
  }, [title]);
  return (
    <main id="main" className="wrap subpage">
      <header className="page-head">
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        {intro && <p className="lede">{intro}</p>}
      </header>
      {children}
    </main>
  );
}
export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
    </>
  );
}
export function RowsStatus({
  error,
  loading,
  empty,
  text = "Nothing here yet.",
}: {
  error: string;
  loading: boolean;
  empty: boolean;
  text?: string;
}) {
  return (
    <>
      <Notice error={error} />
      {loading ? (
        <p role="status">Loading…</p>
      ) : !error && empty ? (
        <p className="empty">{text}</p>
      ) : null}
    </>
  );
}
export function downloadText(
  filename: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
