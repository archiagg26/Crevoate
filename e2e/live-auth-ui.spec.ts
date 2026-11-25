import { expect, test } from "@playwright/test";

test("connected email signup, login and workspace profile flow", async ({
  page,
}) => {
  const user = {
    id: "f8881111-0120-4400-8abc-0123456789ab",
    aud: "authenticated",
    role: "authenticated",
    email: "client@example.test",
    app_metadata: { provider: "email" },
    user_metadata: { name: "Aditi Sharma" },
    created_at: "2026-11-25T00:00:00Z",
  };
  let acceptLogin = false;
  let schemaReady = false;
  let issueSignupSession = false;
  const password = " TestPassword#2026 ";
  const credentialRequests: { origin: string; fieldsMatch: boolean }[] = [];
  await page.route(/\/auth\/v1\//, async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;
    if (path.endsWith("/signup") || path.endsWith("/token")) {
      const body = route.request().postDataJSON();
      credentialRequests.push({
        origin: requestUrl.origin,
        fieldsMatch:
          body?.email === user.email &&
          body?.password === password &&
          (path.endsWith("/signup")
            ? body?.data?.name === user.user_metadata.name &&
              body?.data?.full_name === user.user_metadata.name
            : requestUrl.searchParams.get("grant_type") === "password"),
      });
    }
    if (path.endsWith("/settings"))
      return route.fulfill({
        json: { external: { google: false, email: true } },
      });
    if (path.endsWith("/signup") && !issueSignupSession)
      return route.fulfill({ json: user });
    if (path.endsWith("/token") || path.endsWith("/signup")) {
      if (path.endsWith("/token") && !acceptLogin)
        return route.fulfill({
          status: 400,
          json: {
            code: "invalid_credentials",
            message: "Invalid login credentials",
          },
        });
      const claims = Buffer.from(
        JSON.stringify({
          sub: user.id,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url");
      const header = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
      ).toString("base64url");
      return route.fulfill({
        json: {
          access_token: header + "." + claims + ".demo",
          refresh_token: "test-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user,
        },
      });
    }
    return route.fulfill({ json: user });
  });
  await page.route(/\/rest\/v1\//, async (route) => {
    const request = route.request();
    if (!new URL(request.url()).pathname.endsWith("/profiles"))
      return route.fulfill({ json: [] });
    if (!schemaReady)
      return route.fulfill({
        status: 404,
        json: { code: "PGRST205", message: "Relation not found" },
      });
    if (new URL(request.url()).searchParams.get("select") === "id")
      return route.fulfill({
        status: 401,
        json: { code: "42501", message: "Permission denied" },
      });
    expect(new URL(request.url()).searchParams.get("select")).toBe(
      "full_name,role",
    );
    return route.fulfill({
      json: { full_name: "Aditi Sharma", role: "client" },
    });
  });

  await page.goto("/login?next=%2Fdashboard");
  const email = page.getByLabel("Email address");
  await expect(
    email.or(
      page.getByText(
        "Creovate workspace is unavailable until Supabase is configured.",
        { exact: true },
      ),
    ),
  ).toBeVisible();
  test.skip(
    !(await email.isVisible()),
    "Requires a browser-safe Supabase configuration.",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Apply the Creovate database migrations",
  );
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeDisabled();
  schemaReady = true;
  await page.reload();
  await email.fill("client@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "That email and password didn’t match",
  );
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(email).toHaveValue("client@example.test");
  await page.getByLabel("Your name").fill("Aditi Sharma");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Signup did not start a session",
  );
  await expect(page).toHaveURL(/\/login\?/);
  issueSignupSession = true;
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const dashboard = page.getByRole("heading", { name: "Hi, Aditi Sharma." });
  await expect(dashboard).toBeVisible();
  await page.reload();
  await expect(dashboard).toBeVisible();

  await page.locator('button[aria-controls="nav-account"]').click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login(?:\?next=%2Fdashboard)?$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await email.fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  acceptLogin = true;
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(dashboard).toBeVisible();
  expect(credentialRequests.map(({ fieldsMatch }) => fieldsMatch)).toEqual([
    true,
    true,
    true,
    true,
  ]);
  expect(new Set(credentialRequests.map(({ origin }) => origin)).size).toBe(1);
});

test("mobile auth keeps keyboard controls usable and sends real provider requests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { google: true, email: true } } }),
  );
  await page.route("**/rest/v1/profiles?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/auth/v1/recover?*", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.goto("/login?next=%2Fdashboard");
  const email = page.getByLabel("Email address");
  await expect(
    email.or(
      page.getByText(
        "Creovate workspace is unavailable until Supabase is configured.",
      ),
    ),
  ).toBeVisible();
  test.skip(
    !(await email.isVisible()),
    "Requires Supabase browser configuration.",
  );

  await expect(page.getByRole("navigation")).toHaveCount(1);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveText(
    "Back to website",
  );
  await expect(
    page.getByRole("link", { name: /presentation demo/i }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await email.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );

  await page.getByRole("button", { name: "Forgot password?" }).click();
  await email.fill("client@example.test");
  const recovery = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.endsWith("/recover") &&
      request.method() === "POST",
  );
  await page.getByRole("button", { name: "Send reset link" }).click();
  const redirect = new URL(
    new URL((await recovery).url()).searchParams.get("redirect_to")!,
  );
  expect(redirect.pathname).toBe("/login");
  expect(redirect.searchParams.get("recover")).toBe("1");
  expect(redirect.searchParams.get("next")).toBe("/dashboard");
  await expect(page.getByRole("status")).toContainText("check its inbox");

  await page.getByRole("button", { name: "Back to login" }).click();
  await page.route("**/auth/v1/authorize?*", (route) =>
    route.fulfill({ body: "OAuth request received" }),
  );
  const oauth = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/authorize"),
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const oauthUrl = new URL((await oauth).url());
  expect(oauthUrl.searchParams.get("provider")).toBe("google");
  expect(oauthUrl.searchParams.get("code_challenge")).toBeTruthy();
});
