import Link from "next/link";
export function PrivacyHold() {
  const contact = process.env.PROJECT_CONTACT_EMAIL;
  return (
    <section
      className="container narrow page-content"
      aria-labelledby="hold-title"
    >
      <p className="eyebrow">PEOPLE I’D HIRE AGAIN</p>
      <h1 id="hold-title">Public directory paused.</h1>
      <p className="page-intro">
        We’re reviewing privacy, consent, and removal controls before publishing
        people’s information. Browsing and new submissions through this site are
        paused.
      </p>
      <p className="page-intro">
        Existing contributors can sign in to hide or delete their own listings.
        This does not remove copies shared elsewhere.
      </p>
      <div className="action-row">
        <Link href="/manage" className="button">
          Manage my data
        </Link>
        <Link href="/privacy" className="button button-outline">
          Privacy information
        </Link>
      </div>
      <p className="guest-sharing-note">
        {contact ? (
          <>
            For a concern about an earlier listing,{" "}
            <a href={`mailto:${contact}`}>contact the project operator</a>.
          </>
        ) : (
          "A public project contact has not been configured yet. Publication will remain paused during this review."
        )}
      </p>
    </section>
  );
}
