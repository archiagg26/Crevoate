import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import { dissaraProject, projects, services } from "./content";
import { bookingSlots, type Campaign, type Metric } from "./domain";
import { type CalendarEntry } from "./campaign-ideas";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin";
  avatar?: string;
};
export type Brief = {
  name: string;
  email: string;
  brand: string;
  objective: string;
  services: string[];
  campaign?: Campaign;
};
export type Project = {
  title: string;
  status: string;
  brief: Brief;
  progress: number;
  due: string;
  inquiry?: string;
};
export type Booking = {
  service: string;
  date: string;
  time: string;
  name: string;
  email: string;
  purpose: string;
  status: "booked" | "cancelled";
};
export type BrandKit = {
  name: string;
  industry: string;
  personality: string;
  primary: string;
  secondary: string;
  font: string;
  theme?: string;
  tagline?: string;
  surface?: string;
  accent?: string;
  detail?: string;
  headingFont?: string;
  bodyFont?: string;
};
export type Proposal = {
  status?: "Draft" | "Pending review" | "Accepted" | "Declined";
  name: string;
  email: string;
  title: string;
  objective: string;
  services: string[];
  scope: string;
  deliverables: string;
  days: number;
  amount: number;
  payments: string;
  terms: string;
};
export type Tables = {
  project_inquiries: Brief & { status: string };
  projects: Project;
  campaigns: Campaign;
  campaign_drafts: { scope: string; step: number; form: Campaign };
  campaign_calendar: CalendarEntry;
  brand_kits: BrandKit;
  proposals: Proposal;
  consultation_bookings: Booking;
  services: (typeof services)[number];
  portfolio: (typeof projects)[number];
  creators: import("./content").Creator;
  creator_shortlists: { creator: string };
  project_milestones: { project: string; title: string; done: boolean };
  project_deliverables: { project: string; title: string; path: string };
  feedback: { project: string; message: string; type: string; reply?: string };
  notifications: { message: string; read: boolean };
  campaign_metrics: Metric & { campaign: string };
};
export type Table = keyof Tables;
export type Row<K extends Table> = {
  id: string;
  user_id: string | null;
  created_at: string;
  data: Tables[K];
};
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configurationError =
  "Creovate workspace is unavailable until Supabase is configured.";
export const workspaceSetupError =
  "Workspace setup is incomplete. Apply the Creovate database migrations in Supabase, then refresh this page.";
function missingTable(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}
function missingColumn(error: { code?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export async function authAvailability() {
  const client = backend();
  const signal = AbortSignal.timeout(6000);
  const [profile, settings] = await Promise.allSettled([
    client.from("profiles").select("id").limit(0).abortSignal(signal),
    fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key! },
      signal,
    }).then((response) => (response.ok ? response.json() : null)),
  ]);
  return {
    schemaMissing:
      profile.status === "fulfilled" && missingTable(profile.value.error),
    google:
      settings.status === "fulfilled" &&
      settings.value?.external?.google === true,
  };
}

export function authMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  const known: Record<string, string> = {
    invalid_credentials:
      "That email and password didn’t match. Try again, reset your password, or create an account if you’re new.",
    email_not_confirmed:
      "Confirm your email using the link in your inbox, then sign in again.",
    over_email_send_rate_limit:
      "Too many emails were requested. Wait a minute before requesting another.",
    otp_expired:
      "This link has expired or was already used. Request a new link.",
    signup_disabled: "Account creation is disabled for this workspace.",
  };
  const detail = errorDetail(error);
  const legacyCodes: Record<string, string> = {
    "invalid login credentials": "invalid_credentials",
    "email not confirmed": "email_not_confirmed",
  };
  const errorKey =
    typeof code === "string" && known[code]
      ? code
      : legacyCodes[detail.toLowerCase()];
  return known[errorKey] ?? message(error);
}
function configure() {
  if (!url || !key) return null;
  try {
    const endpoint = new URL(url);
    if (
      endpoint.protocol !== "https:" &&
      !(
        endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(endpoint.hostname)
      )
    )
      return null;
    return createClient(endpoint.href, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    return null;
  }
}
export const supabase = configure();
export function backend() {
  if (!supabase) throw new Error(configurationError);
  return supabase;
}
const catalog: Partial<{ [K in Table]: Tables[K][] }> = {
  services,
  portfolio: [dissaraProject, ...projects],
  creators: [],
};
const shared: Table[] = ["services", "portfolio", "creators"];
export function safeReturnPath(value: string | null) {
  if (!value || !/^\/(?![\/\\])/.test(value) || /[\\\s]/.test(value))
    return null;
  const path = new URL(value, location.origin);
  return path.origin === location.origin &&
    /^\/(dashboard|admin|analytics|planner|studio|proposal|contact|booking)(\/|$)/.test(
      path.pathname,
    )
    ? path.pathname + path.search + path.hash
    : null;
}
function authRedirect(next?: string | null, recovery = false) {
  const target = new URL("/login", location.origin);
  if (recovery) target.searchParams.set("recover", "1");
  if (next) target.searchParams.set("next", next);
  return target.href;
}
async function current(): Promise<User | null> {
  if (!supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session ? workspaceUser(session.user) : null;
}
async function workspaceUser(user: SupabaseUser): Promise<User> {
  const profiles = backend().from("profiles");
  const profile = await profiles
    .select("full_name,role")
    .eq("id", user.id)
    .single();
  const legacyProfile = missingColumn(profile.error)
    ? await profiles.select("name,role").eq("id", user.id).single()
    : null;
  const profileError = legacyProfile ? legacyProfile.error : profile.error;
  if (missingTable(profileError)) throw new Error(workspaceSetupError);
  if (profileError?.code === "PGRST116") {
    throw new Error(
      "Your account is signed in, but its workspace profile is missing. Ask the workspace owner to check the profile setup.",
    );
  }
  if (profileError) throw profileError;
  const avatar = user.user_metadata.avatar_url ?? user.user_metadata.picture;
  return {
    id: user.id,
    name: legacyProfile ? legacyProfile.data!.name : profile.data!.full_name,
    email: user.email ?? "",
    role: legacyProfile ? legacyProfile.data!.role : profile.data!.role,
    avatar:
      typeof avatar === "string" && avatar.startsWith("https://")
        ? avatar
        : undefined,
  };
}
export const auth = {
  current,
  async login(email: string, password: string) {
    const { data, error } = await backend().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return workspaceUser(data.session.user);
  },
  async signup(name: string, email: string, password: string) {
    const { data, error } = await backend().auth.signUp({
      email,
      password,
      options: { data: { name, full_name: name } },
    });
    if (error) throw error;
    if (!data.session)
      throw new Error(
        "Signup did not start a session. Try logging in, or contact the workspace owner if you can’t access your account.",
      );
    return workspaceUser(data.session.user);
  },
  async google(next?: string | null) {
    const { error } = await backend().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirect(next) },
    });
    if (error) throw error;
  },
  async reset(email: string, next?: string | null) {
    const { error } = await backend().auth.resetPasswordForEmail(email, {
      redirectTo: authRedirect(next, true),
    });
    if (error) throw error;
  },
  async changePassword(password: string) {
    const { error } = await backend().auth.updateUser({ password });
    if (error) throw error;
  },
  async updateName(user: User, name: string) {
    const profiles = backend().from("profiles");
    const update = (field: "full_name" | "name") =>
      profiles
        .update({ [field]: name })
        .eq("id", user.id)
        .select("id")
        .single();
    const result = await update("full_name");
    const { error } = missingColumn(result.error)
      ? await update("name")
      : result;
    if (error) throw error;
    return { ...user, name };
  },
  async logout() {
    const { error } = await backend().auth.signOut();
    if (error) throw error;
  },
};
export async function list<K extends Table>(
  table: K,
  user: User | null,
): Promise<Row<K>[]> {
  if (!user && !shared.includes(table)) return [];
  function bundledRows() {
    const items = (catalog[table] ?? []) as (Tables[K] & { id: string })[];
    return items.map((data) => ({
      id: data.id,
      user_id: null,
      created_at: "",
      data,
    }));
  }
  if (!supabase) return bundledRows();
  const query = supabase
    .from(table)
    .select("id,user_id,created_at,data")
    .order("created_at");
  if (user && table === "notifications") query.eq("user_id", user.id);
  const { data, error } = await query;
  if (
    error &&
    (table === "services" || table === "portfolio") &&
    (missingTable(error) || missingColumn(error))
  )
    return bundledRows();
  if (error) throw error;
  return data as Row<K>[];
}
export async function save<K extends Table>(
  table: K,
  data: Tables[K],
  user: User | null,
  id?: string,
  owner?: string | null,
): Promise<Row<K>> {
  const client = backend();
  if (
    !user &&
    (id || !["project_inquiries", "consultation_bookings"].includes(table))
  )
    throw new Error("Sign in to save.");
  const user_id = owner === undefined ? (user?.id ?? null) : owner;
  if (!user) {
    const row = { id: crypto.randomUUID(), user_id: null, data };
    const { error } = await client.from(table).insert(row);
    if (error?.code === "23505" && table === "consultation_bookings")
      throw new Error("That slot was just booked. Select another time.");
    if (error) throw error;
    return { ...row, created_at: new Date().toISOString() };
  }
  const query = id
    ? client.from(table).update({ data }).eq("id", id)
    : client.from(table).insert({ data, user_id });
  const result = await query.select("id,user_id,created_at,data").single();
  if (result.error?.code === "23505" && table === "consultation_bookings")
    throw new Error("That slot was just booked. Select another time.");
  if (result.error) throw result.error;
  return result.data as Row<K>;
}
export async function remove(table: Table, id: string, _user: User) {
  const { error } = await backend()
    .from(table)
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
}
export async function saveCampaignDraft(data: Tables["campaign_drafts"]) {
  const { error } = await backend().rpc("save_campaign_draft", { draft: data });
  if (error) throw error;
}
export async function available(date: string) {
  if (!date) return [];
  const { data, error } = await backend().rpc("reserved_slots", {
    booking_date: date,
  });
  if (error) throw error;
  return bookingSlots(
    date,
    data.map((row: { slot: string }) => row.slot),
  );
}
export async function approve(row: Row<"project_inquiries">, admin: User) {
  if (admin.role !== "admin") throw new Error("Admin access required.");
  const { error } = await backend().rpc("approve_inquiry", {
    inquiry_id: row.id,
  });
  if (error) throw error;
}
export async function uploadFile(file: File, project: Row<"projects">) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a file smaller than 10 MB.");
  if (!project.user_id)
    throw new Error("Assign this project to a client before uploading.");
  const path =
    project.user_id +
    "/" +
    project.id +
    "/" +
    crypto.randomUUID() +
    "-" +
    file.name.replace(/[^\w.-]/g, "-");
  const { error } = await backend()
    .storage.from("deliverables")
    .upload(path, file, { contentType: "application/octet-stream" });
  if (error) throw error;
  return path;
}
export async function downloadFile(path: string, title: string) {
  const { data, error } = await backend()
    .storage.from("deliverables")
    .createSignedUrl(path, 60, { download: title });
  if (error) throw error;
  const anchor = document.createElement("a");
  anchor.href = data.signedUrl;
  anchor.download = title;
  anchor.click();
}
const errorDetail = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "";

export function message(error: unknown) {
  const detail = errorDetail(error);
  if (
    /failed to fetch|load failed|networkerror|network request failed/i.test(
      detail,
    )
  )
    return "We couldn’t connect. Check your connection and try again.";
  if (error && typeof error === "object" && "code" in error) {
    const code = typeof error.code === "string" ? error.code : "";
    if (/^(?:PGRST20[0245]|42P01|42703)$/.test(code))
      return "This feature is temporarily unavailable.";
    if (code === "42501")
      return "You don’t have access to complete this action.";
    return "We couldn’t complete that request. Try again.";
  }
  if (
    error instanceof Error &&
    detail &&
    !/schema cache|row.level security|relation .* does not exist|permission denied/i.test(
      detail,
    )
  )
    return detail;
  return "We couldn’t complete that request. Try again.";
}

export async function updateCampaignCalendar(
  campaignId: string,
  previous: CalendarEntry[],
  next: CalendarEntry[],
) {
  const { error } = await backend().rpc("update_campaign_calendar", {
    campaign: campaignId,
    expected_calendar: previous,
    next_calendar: next,
  });
  if (error?.code === "40001")
    throw new Error(
      "This calendar changed in another session. The latest version has been requested; try again.",
    );
  if (error) throw error;
}
