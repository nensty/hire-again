import Link from "next/link";
export default function AuthError() {
  return (
    <div className="container narrow page-content">
      <div className="empty-state">
        <h1 className="page-title">Let’s try a fresh link.</h1>
        <p>
          This sign-in link has expired, has already been used, or was opened in
          a different browser. Request a new one and open it in the same
          browser.
        </p>
        <Link href="/login" className="button">
          Get a new sign-in link
        </Link>
      </div>
    </div>
  );
}
