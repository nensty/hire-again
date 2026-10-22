import Link from "next/link";
import type { PersonResult as Person } from "@/lib/people";
import { Icon } from "./icon";
import { ReportForm } from "./report-form";
export function PersonResult({ person }: { person: Person }) {
  const href = person.profile
    ? `/people/${person.profile.slug}`
    : person.post!.url;
  const name = person.profile ? (
    <Link href={href}>{person.name}</Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {person.name}
    </a>
  );
  return (
    <article className="person-result">
      <div className="person-identity">
        <span className="person-initials" aria-hidden="true">
          {person.name
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")}
        </span>
        <div>
          <h3>{name}</h3>
          <p className="person-role">{person.role}</p>
          <p className="person-source">
            {person.profile ? "Added by this person" : "Shared LinkedIn post"}
            {person.profile?.location ? ` · ${person.profile.location}` : ""}
          </p>
        </div>
      </div>
      <div className="person-skills">
        {person.skills.slice(0, 4).map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
      <div className="person-actions">
        {person.profile ? (
          <Link href={href} className="person-open">
            View profile <Icon name="arrow" />
          </Link>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="person-open"
          >
            Read on LinkedIn <Icon name="external" />
          </a>
        )}
        {person.post && <ReportForm kind="post" id={person.post.id} />}
      </div>
    </article>
  );
}
