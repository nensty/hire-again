"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { DirectoryData } from "@/lib/types";
import type { CommunityPost } from "@/lib/posts";
import { FUNCTIONS, optionKey } from "@/lib/constants";
import { collectPeople, searchPeople } from "@/lib/people";
import { EMPTY_FILTERS, filterListings } from "@/lib/filters";
import { isPublic } from "@/lib/expiry";
import { PersonResult } from "./person-result";
import { ListingCard } from "./listing-card";
import { Icon } from "./icon";

export function Directory({
  data,
  initialQuery,
  initialNow,
  posts,
  postsUnavailable,
}: {
  data: DirectoryData;
  initialQuery: string;
  initialNow: number;
  posts: CommunityPost[];
  postsUnavailable: boolean;
}) {
  const initial = new URLSearchParams(initialQuery);
  // Old People and Posts links now open the same list. Keep role links working
  // without making the job board a decision in the primary experience.
  const rolesView = initial.get("view") === "roles";
  const [q, setQuery] = useState((initial.get("q") || "").slice(0, 200));
  const [field, setField] = useState(initial.get("function") || "");
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const listener = () => {
      const p = new URLSearchParams(location.search);
      setQuery((p.get("q") || "").slice(0, 200));
      setField(p.get("function") || "");
    };
    const timer = setInterval(() => setNow(Date.now()), 30000);
    window.addEventListener("popstate", listener);
    return () => {
      clearInterval(timer);
      window.removeEventListener("popstate", listener);
    };
  }, []);
  function update(query: string, nextField: string) {
    setQuery(query);
    setField(nextField);
    const params = new URLSearchParams();
    if (rolesView) params.set("view", "roles");
    if (query) params.set("q", query);
    if (nextField) params.set("function", nextField);
    history.replaceState(
      null,
      "",
      `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`,
    );
  }
  const people = searchPeople(collectPeople(data.people, posts, now), q, field);
  const roles = filterListings(
    data.roles.filter((r) => isPublic(r, now)),
    { ...EMPTY_FILTERS, q, function: field },
  );
  const count = rolesView ? roles.length : people.length;
  const active = Boolean(q || field);
  const partial = !rolesView && (data.unavailable || postsUnavailable);
  const unavailable = rolesView
    ? data.unavailable
    : data.unavailable && postsUnavailable;
  const resources = posts.filter(
    (p) => p.kind !== "looking" && isPublic(p, now),
  );
  const shared = initial.get("shared");
  return (
    <section
      id="directory"
      className="people-directory container"
      aria-labelledby="people-title"
    >
      {rolesView && (
        <Link className="back-link" href="/">
          ← Back to people
        </Link>
      )}
      <h2 id="people-title" className="sr-only">
        {rolesView ? "Find a role" : "Find people"}
      </h2>
      {data.demo && (
        <p className="notice people-preview">
          Development preview · Self-published profiles and hiring teams are
          fictional. The LinkedIn links were supplied by the organizer.
          Publishing is disabled.
        </p>
      )}
      {shared && (
        <p className="notice" role="status">
          {shared === "guest"
            ? "Added to the collection. Use Report listing if you need a correction or removal."
            : "Added to the collection."}
          {shared === "1" && (
            <>
              {" "}
              <Link className="text-link" href="/manage">
                Manage your posts →
              </Link>
            </>
          )}
        </p>
      )}
      <div className="people-search">
        <label className="people-search-input">
          <Icon name="search" />
          <span className="sr-only">Search directory</span>
          <input
            type="search"
            value={q}
            maxLength={200}
            placeholder={
              rolesView
                ? "Search a role, company, or skill"
                : "Search a name, role, or skill"
            }
            onChange={(e) => update(e.target.value, field)}
          />
          {q && (
            <button onClick={() => update("", field)} aria-label="Clear search">
              <Icon name="close" />
            </button>
          )}
        </label>
        <label className="people-field">
          <span className="sr-only">Specialty</span>
          <select value={field} onChange={(e) => update(q, e.target.value)}>
            <option value="">All specialties</option>
            {FUNCTIONS.map((f) => (
              <option key={f} value={optionKey(f)}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="people-results-meta" aria-live="polite">
        <p>
          {unavailable
            ? "The list couldn’t load."
            : `${count} ${count === 1 ? "result" : "results"}${active ? " matching your search" : ""}`}
        </p>
        {active && (
          <button className="text-button" onClick={() => update("", "")}>
            Clear filters
          </button>
        )}
      </div>
      {partial && !unavailable && (
        <p className="notice" role="status">
          Some entries couldn’t load. Showing the available results. Please try
          again for the full list.
        </p>
      )}
      {unavailable ? (
        <div className="empty-state" role="status">
          <h3>We couldn’t load the list.</h3>
          <p>Please try again in a moment.</p>
          <button
            className="button button-outline"
            onClick={() => location.reload()}
          >
            Try again
          </button>
        </div>
      ) : count ? (
        rolesView ? (
          <div className="listing-grid role-list">
            {roles.map((role) => (
              <ListingCard key={role.id} listing={role} />
            ))}
          </div>
        ) : (
          <div className="people-results">
            {people.map((person) => (
              <PersonResult key={person.id} person={person} />
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <h3>
            {active
              ? "No matches just yet."
              : rolesView
                ? "No open roles yet."
                : "Help someone get found."}
          </h3>
          <p>
            {active
              ? "Try a name, a broader role, or a different skill."
              : rolesView
                ? "Check back later for new opportunities."
                : "Know someone looking for their next team? Share their public post to start the list."}
          </p>
          {active ? (
            <button
              className="button button-outline"
              onClick={() => update("", "")}
            >
              Clear filters
            </button>
          ) : (
            <Link
              className="button"
              href={rolesView ? "/add/role" : "/add/post"}
            >
              {rolesView ? "Share a role" : "Add someone"}
              <Icon name="arrow" />
            </Link>
          )}
        </div>
      )}
      {!rolesView && (
        <>
          <p className="people-source-note">
            People add their own profiles, or the community shares their public
            posts. Check the original for current availability.
          </p>
          {resources.length > 0 && (
            <details className="people-resources">
              <summary>Related community links</summary>
              <ul>
                {resources.map((post) => (
                  <li key={post.id}>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {post.title}
                      <Icon name="external" />
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="people-contribute">
            <div>
              <h2>Know someone we should meet?</h2>
              <p>Add their public post so the next person can find them.</p>
            </div>
            <Link href="/add/post" className="button button-outline">
              Add someone <Icon name="plus" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
