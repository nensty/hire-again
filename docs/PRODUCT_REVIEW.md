# Quick product and UX review — 22 October 2026

Scope: the implemented product, the organizer's lost-post task, official interaction patterns, and browser checks. This is a heuristic review, not interviews or a claim of measured conversion improvement.

## Main task

“I saw someone useful. Help me find their post again, then connect on the original source.”

Secondary tasks: find a person to hire, find a role, and publish my own profile. A post collection and an opt-in profile directory meet different needs and must remain visibly distinct.

## What changed and why

- Put content higher on the page. Remove the decorative quotation and duplicated introduction; keep a compact product promise and direct actions.
- Start with useful content. When there are no profiles, open the available community posts; explicit People/Posts/Hiring choices always work and stay in the URL. No invented people counts.
- Show search and Function first. Reveal more detailed filters only when needed, with the mobile filter sheet retained. Keep post-type choices visible and hide irrelevant geography/seniority filters for posts.
- Let people recognize names, roles, and skills on cards. One primary card action opens the original LinkedIn post. “Added” dates describe collection activity, never a fabricated original publication date.
- One URL is enough to share a post. Put optional metadata behind a clearly labeled disclosure. Keep accuracy confirmation visible. No automatic profile creation.
- Paste one copied list instead of opening seven forms. Extract and normalize links locally, skip duplicates, suggest only tags supported by the pasted role, and show a review before publishing. Unknown information remains blank.
- Keep optional profile/role fields folded while required fields and publication consent stay visible. Show validation errors without losing entered values.
- Link management belongs beside existing listings. Edit/hide/renew/delete is owner-only; no approval queue or separate admin product.

## Sources actually consulted

- GOV.UK Design System, [Question pages](https://design-system.service.gov.uk/patterns/question-pages/), accessed via its [official source](https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/patterns/question-pages/index.md): ask only for information needed, label optional fields, preserve previous answers, provide a clear action, and avoid unnecessary progress indicators.
- GOV.UK Design System, [Details](https://design-system.service.gov.uk/components/details/), accessed via its [official source](https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/components/details/index.md): disclose secondary information when needed; do not hide information most users need.

Direct access to LinkedIn, Nielsen Norman Group pages, and the GOV.UK website was blocked by this environment's egress policy. No LinkedIn comments were fetched directly and no competitor/user-research findings are claimed. The supplied seven names, roles, and post links are organizer-provided; the eighth link is the organizer's shared discussion. The data migrations and source file record that provenance.

## Small validation tasks

Find Aleksandra's engineering-manager post by name or role; find Python roles/posts; switch between People, Hiring now, and Posts; open a shareable filtered URL; paste a list, review it, and remove a mistaken entry; use the product at 375/430/768/1440px with keyboard and accessible labels. Verify public/owner-only/expired SQL policies independently of the UI.

Success to measure with real users later: can a hiring manager find a relevant post in under two minutes, and can a contributor share a link without explanation? Do not add tracking or claim that this target has been proven by the automated tests.
