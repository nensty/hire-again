import Link from "next/link";
import type { PublicListing } from "@/lib/types";
import { isCandidate } from "@/lib/types";
import { Icon } from "./icon";
export function ListingCard({
  listing,
  explanation,
}: {
  listing: PublicListing;
  explanation?: { label: string; reasons: string[] };
}) {
  const person = isCandidate(listing);
  return (
    <article className="listing-card">
      <div className="card-top">
        <span className="eyebrow">{listing.function}</span>
        <span className="availability">
          <span />
          {person ? "Open to work" : "Hiring now"}
        </span>
      </div>
      <h3>
        <Link href={`/${person ? "people" : "roles"}/${listing.slug}`}>
          {person ? listing.full_name : listing.role_title}
        </Link>
      </h3>
      <p className="card-role">
        {person ? listing.target_role : listing.company_name}
      </p>
      <p className="card-history">
        {person
          ? listing.pandadoc_role || "PandaDoc community"
          : `${listing.seniority} · ${listing.function}`}
      </p>
      <div className="skills">
        {listing.skills.slice(0, 5).map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className="card-meta">
        <span>
          <Icon name="pin" />
          {listing.location}
        </span>
        <span>
          {listing.work_modes.join(" / ")}
          {person ? ` · ${listing.seniority}` : ""}
        </span>
      </div>
      {!person && listing.visa_support && (
        <p className="visa">{listing.visa_support}</p>
      )}
      {explanation && (
        <div className="match-note">
          <strong>{explanation.label}</strong>
          <span>{explanation.reasons.join(" · ")}</span>
        </div>
      )}
      <div className="card-footer">
        <Link
          href={`/${person ? "people" : "roles"}/${listing.slug}`}
          className="text-link"
        >
          {person ? "Meet " + listing.full_name.split(" ")[0] : "View role"}
          <Icon name="arrow" />
        </Link>
        {person && (
          <a
            href={listing.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="linkedin-link"
            aria-label={`Visit ${listing.full_name} on LinkedIn`}
          >
            LinkedIn <Icon name="external" />
          </a>
        )}
      </div>
    </article>
  );
}
