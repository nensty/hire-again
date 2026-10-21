import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container narrow page-content">
      <div className="empty-state">
        <span className="eyebrow">NOT HERE RIGHT NOW</span>
        <h1 className="page-title">A new chapter, perhaps.</h1>
        <p>
          This page isn’t available. The listing may be hidden, expired, filled,
          or removed.
        </p>
        <Link href="/" className="button">
          Back to the community →
        </Link>
      </div>
    </div>
  );
}
