export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy" };
export default function Privacy() {
  const contact = process.env.PROJECT_CONTACT_EMAIL;
  return (
    <article className="container page-content legal">
      <span className="eyebrow">PLAIN WORDS, NO SURPRISES</span>
      <h1>
        Your information.
        <br />
        Your choice.
      </h1>
      <p>
        People I’d Hire Again is a public, independent community directory. Last
        updated: 23 October 2026.
      </p>
      <p className="notice" role="status">
        Public browsing and new publication through this site are paused for a
        privacy and consent review. The description below covers data handled by
        the prototype. Copies in previous deployments, source history, or
        provider backups may remain; pausing the site does not erase them.
      </p>
      <h2>What we collect</h2>
      <p>
        We use your email address to sign you in and send a listing expiry
        reminder. We store the profile or role information you choose to submit,
        your consent to publish, listing timestamps, and visibility status. We
        do not ask for your password, CV, photo, or private messages.
      </p>
      <h2>What is public</h2>
      <p>
        Active, unexpired listings can be viewed by anyone. This includes your
        submitted name, role, skills, location, work preferences, public links,
        and note. Hiring listings also show the contact name and any contact
        LinkedIn link provided. Your authentication email is never included in
        public listing data.
      </p>
      <p>
        Share only information you are comfortable making public. We request
        that search engines do not index the site, but cannot guarantee this.
        Other people may copy or share public information.
      </p>
      <h2>Shared LinkedIn posts</h2>
      <p>
        Community members and the organizer may share links to posts that people
        have made public, along with a name, professional role, skills, and a
        short description. These details are supplied by the sharer, not fetched
        from LinkedIn. We do not copy post bodies, private messages, or contact
        information, and do not infer layoffs or current availability. The
        original source may change or be removed.
      </p>
      <p>
        Sharing a post does not create a candidate profile. Post links are
        public for 30 days, can be reported, and follow the same hidden/expired
        retention rules as listings. No account or email is required to share a
        link. If you sign in before sharing, you can edit, hide, renew, or
        delete your post. Guest posts cannot be claimed or edited by signing in
        afterward. If a post concerns you, use Report listing or contact the
        project operator to request removal. Shared posts do not receive
        reminder emails.
      </p>
      <h2>Why we use it</h2>
      <p>
        To help PandaDoc people and hiring teams find each other, let you manage
        your own listings, send a transactional expiry reminder, and keep the
        directory safe. There are no newsletters, marketing emails, advertising,
        or tracking analytics.
      </p>
      <h2>Services we use</h2>
      <p>
        Supabase stores listing and authentication data. Vercel hosts the
        website and runs daily maintenance. Resend delivers transactional
        emails, including authentication email when configured as Supabase’s
        SMTP provider. These providers process data to operate the service and
        may keep operational or security logs under their own policies. Project
        regions and international data transfers depend on the operator’s
        hosting configuration.
      </p>
      <h2>Cookies and safety</h2>
      <p>
        Essential session cookies keep you signed in. No advertising cookies are
        used. To reduce abuse of sign-in, guest post sharing, and reports, the
        server can store a keyed hash of the request IP address in hourly
        rate-limit buckets for up to one day. Raw IP addresses are not stored in
        the application database. Hosting providers may retain request logs.
      </p>
      <h2>Retention</h2>
      <p>
        Listings are public for 30 days from publishing or renewal. Hidden and
        expired listings are not public. Listing data is deleted after 30
        additional days of expiry, or 30 days after being marked closed, by
        daily maintenance. A reminder is sent within five days before expiry.
        Reports are kept for up to 30 days and removed when the related listing
        is removed during cleanup. Provider backups and logs may retain deleted
        data temporarily according to their policies.
      </p>
      <p>
        Deleting a listing does not delete your Supabase sign-in account or
        email. Your account remains so you can sign in again. Contact the
        project operator to request account deletion or a copy of your stored
        data.
      </p>
      <h2>Editing, hiding, and deletion</h2>
      <p>
        Sign in with the email you used to publish, then open Manage listing.
        You can edit, hide, renew, close, or permanently delete your listing
        without approval. Hidden listings can be shown again. Expired or closed
        listings can be renewed until retention cleanup deletes them. Anonymous
        directory caches may take up to one minute to refresh after a change;
        open pages refresh visibility checks every 30 seconds.
      </p>
      <h2>Contact</h2>
      <p>
        {contact ? (
          <>
            For privacy questions, access, corrections, account deletion, or a
            concern about a listing, email{" "}
            <a href={`mailto:${contact}`}>{contact}</a>.
          </>
        ) : (
          "The project’s contact email will be published here before launch. You can already remove your own listing through Manage listing."
        )}
      </p>
      <p>
        Independent community initiative. Not affiliated with or endorsed by
        PandaDoc.
      </p>
    </article>
  );
}
