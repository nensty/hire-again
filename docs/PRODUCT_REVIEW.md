# Product focus and UX review — 22 October 2026

**Historical design notes; publication is now paused.** The [privacy/security review](PRIVACY_SECURITY_REVIEW.md) supersedes the earlier publication assumptions. Examples in this file are fictional; no subject approval is inferred from an organizer sharing a link.

## The value

Help someone find a person from the PandaDoc community and reach their original post, without searching through a noisy feed. The organizer's concrete task is: “I saw my engineering-manager colleague's post, lost it, and spent half an hour finding it again.”

The main path is **search → recognize the person → open their post or profile → reach out**. The contribution path is **Add someone → name, optional role, public post link → publish**. It is a searchable introduction list. Profiles and shared posts are data sources within that list.

## Product decisions

- One list, one search, one primary contribution action. Remove the Explore sidebar, three category choices, zero counters, post-kind chips, and advanced-filter drawer from the main experience. Show a Specialty selector alongside search at every width.
- Include active owner-published profiles and active looking-for-work posts in the same results. Label the source within each entry, with “Read on LinkedIn” or “View profile” as appropriate. A shared post never creates a candidate profile or verifies current availability.
- Collapse duplicate references only when an active profile explicitly references the same normalized post URL and the names match. Never merge identities by name alone. Hidden/expired profiles must not suppress public posts. Count results rather than assert a verified count of unique people.
- Keep discussions and hiring posts under secondary related links. Existing job and management routes stay functional, but job-board navigation does not compete with finding a person.
- Ask for a person's name and post link when adding someone; keep the role visible and optional. Additional skills/notes are disclosed on demand. New single-person submissions default to looking-for-work without another classification step. Pasted lists retain review and correction before publishing.
- Guest link sharing remains available with the existing server-only quota, validation, duplicate checks, honeypot, explicit public-post confirmation, and 30-day expiry. Sign-in before sharing enables owner management. Guest corrections/removal use reporting. Profile publishing and management remain authenticated.
- Do not show fictional example profiles in an empty production list. Keep fictional fixtures in the clearly labeled development preview.

Assumption: helping hiring managers and colleagues find people is the primary value. This is product judgment based on organizer feedback and a concrete task; it is not an interview study or a measured conversion improvement.

## Sources consulted

- GOV.UK Design System, [Question pages](https://design-system.service.gov.uk/patterns/question-pages/), accessed via its [official source](https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/patterns/question-pages/index.md): ask only for information needed, label optional fields, preserve answers, and provide a clear action.
- GOV.UK Design System, [Details](https://design-system.service.gov.uk/components/details/), accessed via its [official source](https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/components/details/index.md): reveal secondary information on demand and keep essential information visible.

LinkedIn, Nielsen Norman Group pages, and the GOV.UK website were blocked by the environment's egress policy. No LinkedIn comments were fetched and no external competitor or user-research findings are claimed. The seven names/roles/post links and one discussion were organizer-provided.

## Validation

Find Jamie by name or engineering-manager role from the homepage, without choosing a data source. Search a skill across profiles and posts. Follow the original link. Open a filtered URL after reload. Confirm legacy People/Posts links open the same list. Add a person without login, or paste a list and correct it before publishing. Check hidden/expired visibility, explicit-source deduplication, owner-only writes, and guest quotas independently of the UI. Check keyboard access, automated WCAG AA, and overflow at 375/430/768/1440px.

A useful next test with real people: can someone explain the page's purpose and find a relevant person in under two minutes? Automated checks do not establish that outcome. Avoid expanding navigation until actual usage shows a second important task.
