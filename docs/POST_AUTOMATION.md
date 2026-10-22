# How collection can be automated

Implemented now:

1. Paste one post link or a list of comments/introductions into Share a post.
2. The app locally extracts URLs, unwraps LinkedIn safety links, removes tracking parameters, deduplicates links, and proposes tags from the role text supplied alongside each link.
3. Review names and roles, remove unwanted entries, and share the list. Signed-in submissions use Supabase Auth and owner-only RLS. Guests can share up to five links per hour through a server-only, rate-limited path; guest records have no owner and cannot be claimed afterward. Anonymous database inserts remain blocked. Retrying safely skips links already in the collection.

This does not fetch LinkedIn pages, discover people, read comments, or invent missing metadata. Names and professional roles are searchable labels provided by the sharer; a post entry is not a self-published candidate profile. The initial data is the organizer's eight explicit links. No original post dates or current job status were independently verified.

Fully automatic discovery is an external integration problem, not something a URL parser can solve. This machine currently receives proxy 403 responses for LinkedIn. Public comments can also require LinkedIn authentication. LinkedIn's approved APIs have product-specific permissions; do not assume there is a general API for all posts or comment searches. An approved integration or an export supplied by a participating user could feed the same validated ingestion path once its actual permissions and data shape are known. Account access, API approval, and data rights would be owner-controlled prerequisites. Do not request browser session cookies or bypass sign-in/access controls.

Do not depend on unattended logged-in scraping for normal operation. For the MVP, many people can contribute public links, and importing a copied comment list is one review-and-share step. That automates the repetitive intake work while keeping provenance and corrections clear.

The environment configuration draft now includes `lnkd.in`, `linkedin.com`, and `www.linkedin.com` alongside the existing network rules. Review/save those changes in environment settings and publish the environment to enable a retry of public access. Saving a draft does not change the running machine. This may resolve the current proxy block; it does not establish that LinkedIn will expose all comments without additional permitted access.
