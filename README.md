# From zero to deployed

A small, self-service directory for PandaDoc people and teams hiring them. Next.js App Router, React, TypeScript, Tailwind, Supabase Auth/Postgres/RLS, and Resend. No approval workflow or routine listing administration.

## 1. Install

Use Node.js 24 LTS and pnpm 12.14.0 (pinned in `package.json`). Enable Corepack if needed, then:

```sh
corepack enable
corepack prepare pnpm@12.14.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Use the existing checkout. Each Codex cloud task is isolated; do not create a Git worktree unless specifically requested. This cloud machine has pnpm at `/workspace/.tools/node_modules/.bin/pnpm` if Corepack is unavailable.

Without service credentials, browsing renders an empty directory and sign-in explains that email is not connected. The empty People view shows one clearly labeled fictional example profile as an illustration, with no real contact link. It is never stored, counted, or matched as a listing, and disappears when a real profile is published. To inspect the larger fictional, read-only dataset locally:

```sh
DEMO_MODE=true pnpm dev
```

`DEMO_MODE` is ignored by production builds and cannot publish, report, or change data. This is a UI preview, not an alternative auth system.

## 2. Supabase project

Create a project, choose its region, and obtain the project URL, publishable key (`sb_publishable_…`), and server-only secret key (`sb_secret_…`). Legacy anon/service-role keys are also supported; put the legacy anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY` if necessary. Never prefix the secret/service-role key with `NEXT_PUBLIC_`.

For a fully local backend, use the official Supabase CLI with Docker:

```sh
supabase start
supabase db reset
```

Use the local URL and keys shown by the CLI in `.env.local`. Local auth messages appear in the email inbox at the port printed by `supabase start`. Development seeding is off by default.

## 3. Migrations

Apply all files in `supabase/migrations/` in filename order to an empty project through the Supabase SQL editor, or use the CLI below to apply pending migrations:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration creates listing tables, constraints, indexes, RLS, private report/rate-limit storage, reminder delivery records, and service-only maintenance functions. A candidate has one profile per account, including hidden/closed profiles; users reuse that profile or delete it before starting another. Hiring roles are unrestricted in number. All public queries require active, unexpired rows. The database owns listing identity, renewal periods, and close/reminder timestamps.

Automated database tests execute the actual migration on embedded PostgreSQL (PGlite), with Supabase-style auth roles and JWT identity helpers. No external project is required for those tests.

Optional fictional seed, **local Supabase only**:

```sh
# Node reads .env.local directly; this refuses non-localhost URLs.
ALLOW_DEV_SEED=1 node --env-file=.env.local scripts/seed-dev.mjs
```

The script is repeatable, uses reserved `.invalid` email addresses, and never seeds production. It creates no real employee profiles.

## 4. Auth redirect URLs

In Supabase Auth → URL Configuration:

- Site URL: your exact public origin, e.g. `https://your-site.vercel.app`.
- Redirect URL: `https://your-site.vercel.app/auth/callback`.
- For local development, add `http://localhost:3000/auth/callback`.
- Add explicit preview deployment URLs only if you need authentication there; avoid broad wildcard access.

Use passwordless email; no passwords or OAuth providers are needed. Keep production email confirmation enabled. Under Email Templates, use `supabase/templates/magic-link.html` for **both Magic Link and Confirm Signup**. The template links to `.RedirectTo` (which the app always supplies with a `next` query) with a `token_hash` and `type=email`. Server-side token verification works even if the email opens in a different browser. The default Supabase PKCE `code` callback is also supported; it must open in the requesting browser. Both handlers reject invalid/expired links and contain onward redirects to this site.

## 5. Resend / SMTP

Verify a domain in Resend and add its DNS records. Create an API key. Set `RESEND_API_KEY` and a verified `EMAIL_FROM` sender for lifecycle messages.

In Supabase Auth → Email → SMTP, enable a custom SMTP provider:

- Host: `smtp.resend.com`
- Port: `465` (SSL)
- Username: `resend`
- Password: a Resend API key
- Sender email/name: your verified address / People I’d Hire Again

Use production SMTP rather than Supabase’s restricted development email delivery. Keep auth email rate limits enabled. Supabase handles authentication email; the app uses Resend’s API only for expiry reminders.

## 6. Environment variables

See `.env.example`. Set all production values in Vercel, not Git:

| Variable                               | Purpose                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase HTTPS project URL                                                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key; RLS is mandatory                                                         |
| `SUPABASE_SECRET_KEY`                  | Server-only secret/service-role key for cron, reports, guest posts, and renewal links            |
| `RESEND_API_KEY`                       | Server-only transactional email credential                                                       |
| `EMAIL_FROM`                           | Resend-verified sender                                                                           |
| `CRON_SECRET`                          | Random server-only secret, at least 32 characters; cron auth and HMAC renewal/rate-limit signing |
| `NEXT_PUBLIC_SITE_URL`                 | Exact HTTPS public origin, without a path                                                        |
| `PROJECT_CONTACT_EMAIL`                | Public contact address for privacy/support                                                       |
| `DEMO_MODE`                            | Optional local preview only; leave false in deployments                                          |

Generate `CRON_SECRET` with `openssl rand -hex 32` and store it securely. Changing it invalidates outstanding reminder links; signed-in management remains available. No application secret is shipped to the browser. No environment secret values belong in source control or logs.

## 7. Vercel

Import the repository as a Next.js project. Use the repository root, Node.js 24, pnpm, install command `pnpm install --frozen-lockfile`, and build command `pnpm build`. Set production variables before deploying. Public environment variables are embedded at build time, so redeploy after changing them. Connect a custom domain if desired and update Supabase redirects and `NEXT_PUBLIC_SITE_URL` together.

To deploy the current local checkout directly, run `pnpm dlx vercel --prod`, sign in to your Vercel account, and link the configured project. This does not require pushing the implementation to GitHub first.

`vercel.json` registers one daily cron. No Redis, queues, worker services, or search service is required. Public data is fetched in pages of 1,000 and cached for 60 seconds; ordinary search/filtering happens in the browser. Expiry is checked again outside the cache on every server request. Mutations invalidate the public cache. Large directories will eventually need pagination/server search; the MVP intentionally targets a small community.

The site starts with `noindex, nofollow` and shareable OpenGraph previews. Employment is self-declared and never scraped or claimed as verified.

## 8. Cron and retention

One daily Vercel Cron calls `GET /api/cron` at 08:00 UTC. Vercel automatically supplies `Authorization: Bearer <CRON_SECRET>`. Use a plan supporting the configured function duration. The route refuses unauthorized calls and fails visibly when integration settings are incomplete. It processes batches of 50, paces requests to Resend’s default two-per-second limit, and stops claiming batches after four minutes (300-second function budget). A `pending` result flags a backlog for the next daily run; this is designed for a small community.

The cron deletes listings expired for more than 30 days or closed for more than 30 days, removes old/orphaned reports and delivery records, and clears rate-limit buckets after one day. It claims active listings expiring within five days. Transactional DB leases stop overlapping invocations claiming the same cycle; Resend receives a stable per-delivery idempotency key. Successful deliveries mark `reminder_sent_at`; renewing resets it for the new cycle. API failures can be retried without re-sending acknowledged deliveries.

Reminder links are signed, bounded in time, and tied to the listing’s exact expiry version. They cannot target a different listing or reopen a closed one. Opening a link never mutates data, so email scanners cannot renew/hide listings; one explicit button confirms the action without signing in. Renewal invalidates the old link. Hiding is safe to repeat.

Vercel cron is not required to hide expired content. Inspect failed function invocations in Vercel and retry the same authenticated endpoint after correcting a delivery/configuration error. Resend retains idempotency keys for 24 hours; in the rare crash window after delivery but before acknowledgement, retries after that provider window can duplicate a reminder. This cross-provider delivery limit does not affect listing visibility or retention.

## 9. Verification and production smoke test

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Browser checks, using a local Chromium binary by default:

```sh
# If Chromium is not installed, install Playwright's browser and pass its executable path.
# On this cloud machine Chromium is /usr/bin/chromium.
pnpm test:e2e
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` overrides that path. Browser tests use `DEMO_MODE=true` and check fictional browsing, filters/query links, details, auth error states, both forms, and responsive layout. Stop any conflicting non-demo dev server first. Tests do not send real email. Unit tests cover matching, filtering/query state, validation, expiry, signed links, and actual database RLS/retention/reminder claims.

After deploying, using two email inboxes you control:

1. Browse anonymously; an empty new directory is expected. Confirm noindex and the public contact address.
2. Sign in, publish a consenting candidate, open its public link in a private window, and confirm the login email is absent from public data.
3. Publish a role from the second account; check both matching sections and outbound links.
4. Try editing a listing from the other account; it must be inaccessible. Verify hide/show, edit, renew, close, and delete for both listing types.
5. Submit a report; verify the private `reports` table receives it and cannot be read/written anonymously. No report auto-hides a listing, avoiding malicious takedowns.
6. In a staging project only, move a fixture’s expiry inside the five-day window (the validation trigger normally owns expiry, so disable/re-enable it inside a single SQL transaction for the fixture). Run the secured cron twice. Confirm one reminder, a safe confirmation page, renewal invalidating the old token, and hide working without login.
7. Confirm an expired fixture is immediately absent, then exercise retention for an old expired/closed fixture in staging. Remove all test listings before sharing production.

## 10. Emergency listing removal

Routine listings are self-managed. Exceptional abuse can be handled in the Supabase SQL editor:

```sql
-- Use the correct table and a verified listing UUID.
update public.candidate_profiles set status='hidden' where id='LISTING_UUID';
-- or public.hiring_roles for a role.
```

The public cache refreshes within one minute; reload the directory after that. Delete the row for permanent removal. Private reports are visible only to the project operator/service credentials in Supabase. Never put service credentials in the browser or give someone else access to the SQL editor.

## Assumptions

- The initial scope is a small, English-language, self-declared community; no employment verification or manual approval.
- Regions/work modes are multi-select; skills are comma-separated and capped at ten, with five shown on cards.
- Closing means “found a role” / “role filled”; hiding is reversible, and showing starts a fresh 30 days.
- Auth accounts remain after listing deletion; account deletion requests go to the published contact email.
- All service setup and real email/deployment smoke tests require owner-controlled accounts. The application is implemented without those credentials; `LAUNCH_CHECKLIST.md` lists the remaining external setup.

## Community posts and the UX update

The homepage now has People, Hiring now, and Posts. With no self-published profiles, it opens the post collection so there is useful content immediately. Profiles remain opt-in. In the read-only development preview, post expiry is extended so browser fixtures remain usable; production never extends source-link expiry automatically. The eight bootstrap links (seven people’s posts plus the discussion thread) were explicitly supplied by the organizer; no LinkedIn profiles or comments were scraped. Names and roles are supplied labels, not independently verified availability. An “Added” date is the collection date.

Apply **all** migrations in filename order, including `202610220001_community_posts.sql` and `202610220002_shared_posts.sql` (`supabase db push` handles this for linked projects). They create the posts table, owner-only write policies, report support, retention cleanup, and idempotent source-link inserts. Existing projects should apply only pending migrations. Do not rerun the initial schema manually.

When Supabase is not configured, the same provided links are read from `src/data/shared-posts.json` and still respect their expiry. With Supabase configured, the database is authoritative: errors are shown calmly, and hidden/deleted links are not reintroduced from the file. Apply the migrations to populate the production database; saving repository files does not write to a remote Supabase project.

Share one public link at `/add/post`, or choose **Paste a list** to extract many URLs, review the proposed names/roles, and share up to 50 at once when signed in (up to 5 for guests). LinkedIn safety wrappers and tracking parameters are normalized locally. Duplicates are skipped, including when a partial import is retried. Optional metadata is folded away. Manage links shared while signed in at `/manage`. Posts are public for 30 days and retention cleanup uses the existing daily cron; post links do not receive reminder emails.

See [the quick UX review](docs/PRODUCT_REVIEW.md) for the sources and design decisions, and [post automation](docs/POST_AUTOMATION.md) for what is automated and what needs an approved external integration. Production service credentials remain required for sign-in and writes.

### Sharing without signing in

`/add/post` accepts guest submissions of public LinkedIn links. Sign-in is optional for new posts and remains required to edit owned posts, publish profiles, and publish hiring roles. Guests can share up to 5 links per hour (including pasted lists); no owner account is created. Guest records have `owner_id = null` and cannot be claimed through sign-in later. Use the report flow for corrections/removal; existing posts still expire after 30 days.

Guest writes use the server-only `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `CRON_SECRET` already needed for maintenance and reports. The existing `consume_limit` database function atomically meters attempts, including duplicates, across instances. No migration or anonymous-auth setting is needed. If these integrations or the limiter are unavailable, guest writes fail closed and the form offers sign-in instead. Never expose the secret key in client configuration.

Only Vercel's overwritten `x-vercel-forwarded-for` header is trusted when `VERCEL=1`. Other hosts share one conservative quota bucket; configure a trusted ingress implementation before needing per-address limits there. Raw addresses are not stored. This limits casual abuse, not distributed botnets; add a server-verified challenge if real abuse warrants it. Direct anonymous database inserts remain forbidden by RLS. React escapes submitted text, post URLs are allowlisted/normalized, duplicate URLs are rejected, and server actions check a honeypot and explicit confirmation. Guest posts publish immediately; report review still requires an operator.
