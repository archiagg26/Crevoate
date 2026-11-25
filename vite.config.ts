import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_SUPABASE_");
  for (const variable of [
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    const value = env[variable]?.trim();
    if (!value || value.startsWith("sb_publishable_")) continue;
    let role: string | undefined;
    try {
      role = JSON.parse(
        Buffer.from(value.split(".")[1] ?? "", "base64url").toString("utf8"),
      ).role;
    } catch {
      /* A key without an anonymous JWT role is not a browser key. */
    }
    if (role !== "anon")
      throw new Error(
        variable +
          " must contain a Supabase publishable key or legacy anon key.",
      );
  }
  return {
    base: "/",
    build: {
      rolldownOptions: {
        onLog(level, log, handler) {
          if (
            log.code === "MODULE_LEVEL_DIRECTIVE" &&
            log.id?.includes("node_modules")
          )
            return;
          handler(level, log);
        },
      },
    },
  };
});
