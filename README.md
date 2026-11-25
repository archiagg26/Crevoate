# Creovate

Creovate is a creative agency website and campaign workspace. The public site includes service pages, editable creative tools, an editorial portfolio and a live project link for Dissara. Supabase handles accounts and private records for campaigns, brand kits, inquiries, projects, consultations and notifications.

## Run locally

Use Node 22.18 or a newer supported Node LTS.

```sh
npm ci
npm run dev
```

The public catalog, planner previews and Creative Studio previews work before Supabase is configured. Sign-in and database writes show a configuration error until public connection settings are supplied. Previous browser demo accounts and business records are no longer read by the application.

## Connect Supabase

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard). Copy its Project URL and browser publishable key from **Connect**. A legacy anon key is also supported.
2. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`. The publishable key takes precedence. Use browser-safe keys here and keep service-role keys, Supabase secret keys and provider secrets in server-side settings.
3. Apply every file in `supabase/migrations` in filename order through the SQL editor for a new project. For a CLI-linked project use `supabase db push`. For an existing installation that already has the first three migrations, apply only `202611240004_connected_workspace.sql`. It adds drafts, a calendar table, inquiry rejection notices and Realtime publication membership. It also removes the previous synthetic creator fixtures.
4. In **Authentication → Sign In / Providers**, enable Email and disable **Confirm email** on the development project to allow immediate signup. Keep password recovery enabled and check that its email template uses the supplied `ConfirmationURL`. Set up custom SMTP for production email delivery in **Authentication → Email**.
5. In **Authentication → URL Configuration**, set **Site URL** to the production origin. Add these redirect entries, replacing the production host as appropriate. Add equivalent localhost entries if you use `localhost` instead of `127.0.0.1`. The wildcard is restricted to the query string after the exact login path so the app can preserve the requested workspace destination.
   - `http://127.0.0.1:5173/login`
   - `http://127.0.0.1:5173/login\?**`
   - `https://creovatee.netlify.app/login`
   - `https://creovatee.netlify.app/login\?**`
6. Restart Vite. Sign up with the account you intend to use as administrator. Apply this statement in the Supabase SQL editor for that account's verified Auth user ID.

```sql
update public.profiles
set role = 'admin'
where id = '<verified-auth-user-uuid>';
```

Profiles are created by a database trigger. Application sessions can update the profile name through owner-scoped policies. Roles are changed by authorized database operators. See the [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

## Enable Google sign-in

1. In **Supabase → Authentication → Sign In / Providers → Google**, copy the callback URL shown for this project. It is normally `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In **Google Cloud Console → Google Auth Platform**, configure the consent screen and choose the appropriate audience. Add test users if the OAuth app remains in testing.
3. In **Clients**, create an OAuth client of type **Web application**. Enter the Creovate production origin and applicable development origin under **Authorized JavaScript origins**. Put the Supabase callback URL under **Authorized redirect URIs**.
4. Enable the Google provider in Supabase, paste the Google client ID and client secret into that provider's settings and save. Keep those credentials out of the Vite environment.
5. Start from the Creovate login page and click **Continue with Google**. Complete the Google consent flow and confirm the workspace and account menu open with the provider name and picture. The account menu falls back to initials when a picture is unavailable. See the [Supabase Google provider guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Workspace and Realtime

- The existing campaign record stores the brief, computed recommendations, allocation and editable entries. A database trigger mirrors the entries into `campaign_calendar` in the same transaction for owner-scoped queries. Signed-in users can save and resume server-side drafts. Unsubmitted forms also retain tab-scoped progress.
- The client workspace shows active project progress, consultations, saved brand kits and notices. Administrators can review inquiries, create projects for client accounts and send notifications in **Agency Workspace → Clients**.
- The fourth migration adds project, milestone, deliverable, inquiry, notification, campaign, brand kit, consultation and feedback tables to the `supabase_realtime` publication when present. Verify those tables are enabled under the project's replication settings. Subscriptions trigger fresh RLS-protected queries, and the app cleans them up when leaving a view. See [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
- Agency analytics use manually entered metrics. Creator Discovery displays profiles supplied by the agency. Configure real creator data and authorized external integrations separately.

## Verification

```sh
npm run lint
npm test
npm run test:e2e
npm run build
```

The database suite uses PGlite and minimal Auth and Storage shims. It verifies database policy boundaries and trigger behavior. The default Edge suite checks the public pages, protected redirect, configuration-error experience and motion across mobile and desktop. The connected browser test is opt-in. Supply the following environment variables in a shell pointed at an isolated, migrated test project with three verified accounts. The test creates campaign, calendar, project and branding records.

```text
CREOVATE_E2E_CLIENT_EMAIL
CREOVATE_E2E_CLIENT_PASSWORD
CREOVATE_E2E_ADMIN_EMAIL
CREOVATE_E2E_ADMIN_PASSWORD
CREOVATE_E2E_STRANGER_EMAIL
CREOVATE_E2E_STRANGER_PASSWORD
```

Run `npm run test:e2e -- connected-workspace`. On that project, also register a fresh account and confirm it opens the dashboard immediately, exercise password reset, confirm Google sign-in and verify a two-browser client/admin Realtime update. Use the same application origin for initiating and completing PKCE links.

## Deploy to Netlify

1. Connect the existing Netlify site to the branch containing the changes or use the current connected repository.
2. Set the Supabase URL and a publishable or anon key under **Site configuration → Environment variables** for the production build.
3. Trigger a deploy. `netlify.toml` runs `npm run build`, publishes `dist` and rewrites application routes to the SPA.
4. Set the production Auth redirect entries listed above and test a direct link to a protected project, a Google login and a client/admin update on the deployed origin.

For a project with an existing `public.profiles` table and no `public.brand_kits` table, the Studio can be enabled independently. Apply `supabase/migrations/202611250001_studio_brand_kits.sql` in the Supabase SQL Editor. It leaves existing brand-kit tables and policies intact. Signed-in users can save private kits and reopen them from their dashboard. Guests can customize previews and download a kit without signing in.

## Campaign content calendar

After saving a campaign, open its content calendar from the planner or dashboard. Manual entries, edits and drag-and-drop changes are saved through the campaign record and mirrored to owner-scoped calendar rows in the same transaction. The content status is manually tracked and does not publish to a platform. Export uses the filtered entries. Choose **Print calendar** to print or save the browser’s printable layout as PDF.

- On an existing Supabase project with profiles and campaigns, apply `supabase/migrations/202611250002_campaign_calendar.sql` in the SQL Editor. It adds calendar support to both the workspace JSON schema and the structured campaign schema. Confirm the `campaigns` and `campaign_calendar` tables are in the Realtime publication. If your structured campaigns table adds custom required fields, review their defaults against the planner.
- For optional AI generation, add `CALENDAR_AI_URL` (the full compatible Chat Completions endpoint URL), `CALENDAR_AI_KEY`, and `CALENDAR_AI_MODEL` in Supabase Edge Function Secrets. The model must support JSON-object responses. Configure these values on Supabase only.
- From the repository root, deploy with `supabase functions deploy campaign-calendar --project-ref mublcoybxsxcfagnintm --no-verify-jwt`. The function validates the caller with Supabase Auth and checks campaign ownership before contacting the provider. See [Deploy to Production](https://supabase.com/docs/guides/functions/deploy) and [Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets).
- The regular **Log in** button on Vite's unqualified local `/login` opens the presentation workspace. Use `/login?live=1` to test real Supabase login locally. Production always uses Supabase authentication.
