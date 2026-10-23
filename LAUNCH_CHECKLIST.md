# Owner-controlled launch actions

**Do not launch during the privacy review hold.** Complete the [privacy containment and release gates](docs/PRIVACY_SECURITY_REVIEW.md) first. In particular, restrict repository access/history, deploy the hold, and apply `202610230001_privacy_hold.sql` if a database was connected. Configure a monitored operator contact and subject-controlled approval/withdrawal before any reopening.

- [ ] Create a Supabase project in the appropriate region; apply all repository migrations in filename order using its SQL editor or authenticated Supabase CLI.
- [ ] Copy the project URL, publishable key, and server-only secret key into Vercel environment settings.
- [ ] Verify a sender domain in Resend, publish its required DNS records, create an API key, and configure `RESEND_API_KEY` and `EMAIL_FROM` in Vercel.
- [ ] Configure Supabase Auth custom SMTP using Resend; set the production Site URL and the exact `/auth/callback` redirect URL. Add the repository magic-link template to both Magic Link and Confirm Signup templates. Keep email confirmation enabled in production.
- [ ] Create/import the Vercel project, connect this repository, and set the remaining environment values: `NEXT_PUBLIC_SITE_URL`, `PROJECT_CONTACT_EMAIL`, and a securely generated `CRON_SECRET` of at least 32 characters. Ensure the plan supports the configured daily cron and up to 300-second function duration.
- [ ] Deploy and run the production smoke procedure in README using an email inbox you control. Confirm sign-in and reminder delivery, and that the daily cron is enabled in Vercel.
