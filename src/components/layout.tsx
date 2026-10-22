import Link from "next/link";
import { Icon } from "./icon";
import { MobileNav } from "./mobile-nav";
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          href="/"
          className="wordmark"
          aria-label="People I'd Hire Again home"
        >
          <span className="brand-symbol">
            <Icon name="heart" />
          </span>
          <span>
            people I’d
            <br />
            <strong>hire again.</strong>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#directory">Find people</Link>
          <Link href="/about">About</Link>
        </nav>
        <MobileNav />
        <Link className="button button-small" href="/add/post">
          <Icon name="plus" />
          Add someone
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer container">
      <div className="footer-top">
        <p>
          Built with care for PandaDoc people. <span aria-hidden="true">♡</span>
        </p>
        <nav aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/manage">Manage your posts</Link>
        </nav>
      </div>
      <p className="fine-print">
        Independent community initiative. Not affiliated with or endorsed by
        PandaDoc.
      </p>
    </footer>
  );
}
