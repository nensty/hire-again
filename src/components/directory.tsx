"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { DirectoryData } from "@/lib/types";
import {
  FUNCTIONS,
  SENIORITIES,
  REGIONS,
  WORK_MODES,
  optionKey,
} from "@/lib/constants";
import {
  type Filters,
  EMPTY_FILTERS,
  filterListings,
  readFilters,
  writeFilters,
} from "@/lib/filters";
import { isPublic } from "@/lib/expiry";
import { PostCard } from "./post-card";
import { filterPosts, POST_KINDS, type CommunityPost } from "@/lib/posts";
import { ListingCard } from "./listing-card";
import { ExampleProfile } from "./example-profile";
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
  const [filters, setFilters] = useState(() =>
    readFilters(new URLSearchParams(initialQuery)),
  );
  const [drawer, setDrawer] = useState(false);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const listener = () =>
      setFilters(readFilters(new URLSearchParams(location.search)));
    window.addEventListener("popstate", listener);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.removeEventListener("popstate", listener);
      clearInterval(timer);
    };
  }, []);
  function update(p: Partial<Filters>) {
    const next = { ...filters, ...p };
    setFilters(next);
    startTransition(() => {
      const query = writeFilters(next);
      history.replaceState(
        null,
        "",
        `${location.pathname}${query ? "?" + query : ""}${location.hash}`,
      );
    });
  }
  const people = data.people.filter((l) => isPublic(l, now)),
    roles = data.roles.filter((l) => isPublic(l, now));
  const postsView = filters.view === "posts";
  const publicPosts = posts.filter((p) => isPublic(p, now));
  const postMatches = filterPosts(publicPosts, filters, now);
  const listings =
    filters.view === "people"
      ? filterListings(people, filters)
      : filterListings(roles, filters);
  const count = postsView ? postMatches.length : listings.length;
  const unavailable = postsView ? postsUnavailable : data.unavailable;
  const active = Boolean(
    (postsView && filters.postType) ||
    filters.q ||
    filters.function ||
    filters.seniority ||
    filters.skills ||
    filters.regions.length ||
    filters.workModes.length,
  );
  function toggle(key: "regions" | "workModes", v: string) {
    update({
      [key]: filters[key].includes(v)
        ? filters[key].filter((x) => x !== v)
        : [...filters[key], v],
    });
  }
  const functionFilter = (
    <label className="filter-select">
      Function
      <select
        value={filters.function}
        onChange={(e) => update({ function: e.target.value })}
      >
        <option value="">All functions</option>
        {FUNCTIONS.map((s) => (
          <option key={s} value={optionKey(s)}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
  const filterFields = (
    <>
      {!postsView && (
        <label className="filter-select">
          Seniority
          <select
            value={filters.seniority}
            onChange={(e) => update({ seniority: e.target.value })}
          >
            <option value="">All levels</option>
            {SENIORITIES.map((s) => (
              <option key={s} value={optionKey(s)}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="filter-select">
        Skills
        <input
          value={filters.skills}
          onChange={(e) => update({ skills: e.target.value })}
          placeholder="e.g. React, Figma"
          maxLength={200}
        />
      </label>
      {!postsView && (
        <>
          <details className="filter-details">
            <summary>
              Region <span>{filters.regions.length || "Any"}</span>
            </summary>
            <div className="filter-popover">
              {REGIONS.map((r) => (
                <label key={r}>
                  <input
                    type="checkbox"
                    checked={filters.regions.includes(optionKey(r))}
                    onChange={() => toggle("regions", optionKey(r))}
                  />
                  {r}
                </label>
              ))}
            </div>
          </details>
          <details className="filter-details">
            <summary>
              Work mode <span>{filters.workModes.length || "Any"}</span>
            </summary>
            <div className="filter-popover">
              {WORK_MODES.map((r) => (
                <label key={r}>
                  <input
                    type="checkbox"
                    checked={filters.workModes.includes(optionKey(r))}
                    onChange={() => toggle("workModes", optionKey(r))}
                  />
                  {r}
                </label>
              ))}
            </div>
          </details>
        </>
      )}
    </>
  );
  return (
    <section
      id="directory"
      className={`directory container ${postsView ? "directory-posts" : ""}`}
      aria-label="Community directory"
    >
      {data.demo && (
        <p className="notice demo-notice">
          {postsView
            ? "Development preview · Shared posts link to their original sources. Sharing is disabled."
            : "Development preview · All people and teams below are fictional. Publishing is disabled."}
        </p>
      )}
      {postsView && new URLSearchParams(initialQuery).get("shared") === "1" && (
        <p className="notice" role="status">
          Post shared.{" "}
          <Link href="/manage" className="text-link">
            Manage your posts →
          </Link>
        </p>
      )}
      <div className="directory-heading">
        <div className="tabs" role="group" aria-label="Directory view">
          <button
            aria-pressed={filters.view === "people"}
            onClick={() => update({ view: "people", postType: "" })}
          >
            People <span>{data.unavailable ? "—" : people.length}</span>
          </button>
          <button
            aria-pressed={filters.view === "roles"}
            onClick={() => update({ view: "roles", postType: "" })}
          >
            Hiring now <span>{data.unavailable ? "—" : roles.length}</span>
          </button>
          <button
            aria-pressed={postsView}
            onClick={() =>
              update({
                view: "posts",
                seniority: "",
                regions: [],
                workModes: [],
              })
            }
          >
            Posts <span>{postsUnavailable ? "—" : publicPosts.length}</span>
          </button>
        </div>
        <span className="directory-aside">
          A good next chapter starts with a hello.
        </span>
      </div>
      <div className="search-row">
        <label className="search-box">
          <Icon name="search" />
          <span className="sr-only">Search directory</span>
          <input
            type="search"
            placeholder={
              filters.view === "people"
                ? "A name, role, skill, or place…"
                : postsView
                  ? "Find a name, role, skill, or post…"
                  : "A company, role, skill, or place…"
            }
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            maxLength={200}
          />
          {filters.q && (
            <button onClick={() => update({ q: "" })} aria-label="Clear search">
              <Icon name="close" />
            </button>
          )}
        </label>
        {postsView && (
          <div className="post-desktop-function">{functionFilter}</div>
        )}
        <button
          className={`button button-outline mobile-filter ${postsView ? "posts-filter" : ""}`}
          onClick={() => setDrawer(true)}
        >
          <Icon name="filter" />
          Filters{active && <span aria-hidden="true"> •</span>}
        </button>
      </div>
      {!postsView && (
        <div className="desktop-filter-bar">
          {functionFilter}
          <details
            className="more-filters"
            open={
              Boolean(
                filters.skills ||
                filters.regions.length ||
                filters.workModes.length ||
                filters.seniority,
              ) || undefined
            }
          >
            <summary>
              <Icon name="filter" />
              {postsView ? "Skills" : "More filters"}
            </summary>
            <div className="desktop-filters">{filterFields}</div>
          </details>
        </div>
      )}
      {drawer && (
        <div className="sheet-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget) setDrawer(false);
        }}>
          <FilterSheet onClose={() => setDrawer(false)}>
            {functionFilter}
            {filterFields}
            <button className="button" onClick={() => setDrawer(false)}>
              Show {count} {count === 1 ? "result" : "results"}
              <Icon name="arrow" />
            </button>
          </FilterSheet>
        </div>
      )}
      {postsView && (
        <div className="post-toolbar">
          <div className="post-kinds" role="group" aria-label="Post type">
            {[["", "All posts"], ...Object.entries(POST_KINDS)].map(
              ([value, label]) => (
                <button
                  key={value}
                  aria-pressed={filters.postType === value}
                  onClick={() => update({ postType: value })}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <Link href="/add/post" className="text-link">
            Share a post <Icon name="plus" />
          </Link>
        </div>
      )}
      <div className="results-meta" aria-live="polite">
        <p>
          {unavailable ? (
            "Results aren’t available right now."
          ) : (
            <>
              {count}{" "}
              {postsView
                ? count === 1
                  ? "post"
                  : "posts"
                : filters.view === "people"
                  ? listings.length === 1
                    ? "person"
                    : "people"
                  : listings.length === 1
                    ? "role"
                    : "roles"}
              {active
                ? " matching your search"
                : postsView
                  ? " shared by the community"
                  : filters.view === "people"
                    ? " ready for a new chapter"
                    : " looking for good people"}
            </>
          )}
        </p>
        {active ? (
          <button
            className="text-button"
            onClick={() => update({ ...EMPTY_FILTERS, view: filters.view })}
          >
            Clear filters
          </button>
        ) : (
          <span>
            {postsView
              ? "Open the original for the latest update."
              : "Good people. Real opportunities."}
          </span>
        )}
      </div>
      {unavailable ? (
        <div className="empty-state" role="status">
          <h3>A little pause.</h3>
          <p>We couldn’t load the directory. Please try again in a moment.</p>
          <button
            className="button button-outline"
            onClick={() => location.reload()}
          >
            Try again
          </button>
        </div>
      ) : postsView && postMatches.length ? (
        <div className="listing-grid post-grid">
          {postMatches.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : !postsView && listings.length ? (
        <div className={`listing-grid ${pending ? "updating" : ""}`}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : !active && filters.view === "people" && !data.demo ? (
        <ExampleProfile />
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name={active ? "search" : "heart"} />
          </span>
          <h3>
            {active
              ? "No matches just yet."
              : postsView
                ? "A good post deserves to be found."
                : filters.view === "people"
                  ? "Someone great will be here soon."
                  : "The next opportunity starts here."}
          </h3>
          <p>
            {active
              ? "Try a broader search or clear a filter. The right connection might be one click away."
              : postsView
                ? "Share a public LinkedIn post so the next person can find it."
                : filters.view === "people"
                  ? "Looking for your next team? Be the first to add yourself."
                  : "Hiring PandaDoc people? Share an opportunity with the community."}
          </p>
          {active ? (
            <button
              className="button button-outline"
              onClick={() => update({ ...EMPTY_FILTERS, view: filters.view })}
            >
              Clear filters
            </button>
          ) : (
            <Link
              className="button"
              href={
                postsView
                  ? "/add/post"
                  : filters.view === "people"
                    ? "/add/person"
                    : "/add/role"
              }
            >
              {postsView
                ? "Share a post"
                : filters.view === "people"
                  ? "Add yourself"
                  : "Share a role"}
              <Icon name="arrow" />
            </Link>
          )}
        </div>
      )}
      <aside className="community-strip">
        <div>
          <span className="eyebrow">MAKE A CONNECTION</span>
          <h3>
            {postsView
              ? "Found another useful post?"
              : "Know someone who should be here?"}
          </h3>
          <p>
            {postsView
              ? "Keep it findable for the next person."
              : "A small share can open a big door."}
          </p>
        </div>
        <Link
          href={postsView ? "/add/post" : "/add/role"}
          className="button button-outline"
        >
          {postsView ? "Share a post" : "We’re hiring"}
          <Icon name="arrow" />
        </Link>
      </aside>
    </section>
  );
}
function FilterSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const el = document.querySelector<HTMLDialogElement>("#filter-dialog");
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      id="filter-dialog"
      aria-labelledby="filter-title"
      className="filter-sheet"
      onCancel={onClose}
    >
      <div className="sheet-title">
        <h2 id="filter-title">Find your people</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close filters"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
