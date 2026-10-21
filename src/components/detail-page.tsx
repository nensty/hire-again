import Link from "next/link";
import { notFound } from "next/navigation";
import { getDirectory } from "@/lib/data";
import { isCandidate } from "@/lib/types";
import { matchingPeople, matchingRoles } from "@/lib/matching";
import { CopyButton } from "./copy-button";
import { ListingCard } from "./listing-card";
import { ReportForm } from "./report-form";
import { Icon } from "./icon";
export async function DetailPage({
  slug,
  kind,
}: {
  slug: string;
  kind: "candidate" | "role";
}) {
  const data = await getDirectory();
  if (data.unavailable)
    return (
      <div className="container page-content">
        <div className="empty-state">
          <h1 className="page-title">A little pause.</h1>
          <p>We couldn’t load this listing. Please try again in a moment.</p>
          <Link href="/" className="button">
            Back to the directory
          </Link>
        </div>
      </div>
    );
  const listing =
    kind === "candidate"
      ? data.people.find((l) => l.slug === slug)
      : data.roles.find((l) => l.slug === slug);
  if (!listing) notFound();
  const person = isCandidate(listing);
  const postUrl = person
    ? listing.open_to_work_post_url
    : listing.hiring_post_url;
  const matches = person
    ? matchingRoles(listing, data.roles)
    : matchingPeople(listing, data.people);
  return (
    <div className="container page-content">
      {data.demo && (
        <p className="notice demo-notice">
          Fictional development preview. These are not real people or
          opportunities.
        </p>
      )}
      <Link
        href={person ? "/#directory" : "/?view=roles#directory"}
        className="back-link"
      >
        ← Back to {person ? "people" : "roles"}
      </Link>
      <div className="detail-layout">
        <article className="detail-body">
          <header className="detail-header">
            <span className="availability">
              <span />
              {person ? "Open to work" : "Hiring now"}
            </span>
            <h1>{person ? listing.full_name : listing.role_title}</h1>
            <p className="detail-subtitle">
              {person ? listing.target_role : listing.company_name}
            </p>
            {person && listing.pandadoc_role && (
              <p className="hint">{listing.pandadoc_role}</p>
            )}
            <div className="detail-meta">
              <span>
                <Icon name="pin" /> {listing.location}
              </span>
              <span>{listing.seniority}</span>
              <span>{listing.work_modes.join(" / ")}</span>
            </div>
          </header>
          <h2>{person ? "The next chapter" : "About this opportunity"}</h2>
          <p>
            {listing.note ||
              (person
                ? "Ready to connect with a thoughtful team and explore what comes next."
                : "Interested? Take a look at the vacancy for the full role details.")}
          </p>
          <h2>At a glance</h2>
          <dl className="detail-list">
            <dt>Function</dt>
            <dd>{listing.function}</dd>
            <dt>Seniority</dt>
            <dd>{listing.seniority}</dd>
            <dt>Location</dt>
            <dd>{listing.location}</dd>
            <dt>Regions</dt>
            <dd>{listing.regions.join(" · ")}</dd>
            <dt>Work mode</dt>
            <dd>{listing.work_modes.join(" · ")}</dd>
            {person && listing.relocation && (
              <>
                <dt>Relocation</dt>
                <dd>Open to relocating</dd>
              </>
            )}
            {!person && listing.visa_support && (
              <>
                <dt>Visa / relocation</dt>
                <dd>{listing.visa_support}</dd>
              </>
            )}
          </dl>
          <h2>Skills & strengths</h2>
          <div className="skills">
            {listing.skills.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </article>
        <aside className="detail-aside">
          <h2>{person ? "Start with a hello." : "Your next team?"}</h2>
          <p>
            {person
              ? "A good connection can change everything. Reach out directly on LinkedIn."
              : `Contact ${listing.contact_name} or visit the full vacancy to learn more.`}
          </p>
          <a
            className="button"
            href={person ? listing.linkedin_url : listing.vacancy_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {person ? "Connect on LinkedIn" : "View vacancy"}
            <Icon name="external" />
          </a>
          {!person && listing.contact_linkedin_url && (
            <a
              className="text-link"
              href={listing.contact_linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact on LinkedIn <Icon name="external" />
            </a>
          )}
          {!person && listing.company_website && (
            <a
              className="text-link"
              href={listing.company_website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Company website <Icon name="external" />
            </a>
          )}
          {postUrl && (
            <a
              className="text-link"
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {person ? "OpenToWork post" : "Hiring post"}
              <Icon name="external" />
            </a>
          )}
          <CopyButton />
          <p>
            Public until{" "}
            {new Intl.DateTimeFormat("en", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(listing.expires_at))}
            .
          </p>
          <ReportForm kind={kind} id={listing.id} />
        </aside>
      </div>
      <section className="recommendations">
        <h2>
          {person ? "Teams that may be a fit" : "People who may be a fit"}
        </h2>
        <p>
          A few connections worth exploring. Based on function, skills,
          seniority, region, and work mode.
        </p>
        {matches.length ? (
          <div className="listing-grid">
            {matches.map((m) => (
              <ListingCard key={m.item.id} listing={m.item} explanation={m} />
            ))}
          </div>
        ) : (
          <div className="notice">
            No close matches yet. New people and opportunities can arrive any
            day.
          </div>
        )}
      </section>
    </div>
  );
}
