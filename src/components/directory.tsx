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
import { ListingCard } from "./listing-card";
import { Icon } from "./icon";
export function Directory({
  data,
  initialQuery,
  initialNow,
}: {
  data: DirectoryData;
  initialQuery: string;
  initialNow: number;
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
  const listings =
    filters.view === "people"
      ? filterListings(people, filters)
      : filterListings(roles, filters);
  const active = Boolean(
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
  const filterFields = (
    <>
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
      <label className="filter-select">
        Skills
        <input
          value={filters.skills}
          onChange={(e) => update({ skills: e.target.value })}
          placeholder="e.g. React, Figma"
          maxLength={200}
        />
      </label>
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
  );
  return (
    <section
      id="directory"
      className="directory container"
      aria-label="Community directory"
    >
      {data.demo && (
        <p className="notice demo-notice">
          Development preview · All people and teams below are fictional.
          Publishing is disabled.
        </p>
      )}
      <div className="directory-heading">
        <div className="tabs" role="group" aria-label="Directory view">
          <button
            aria-pressed={filters.view === "people"}
            onClick={() => update({ view: "people" })}
          >
            People <span>{people.length}</span>
          </button>
          <button
            aria-pressed={filters.view === "roles"}
            onClick={() => update({ view: "roles" })}
          >
            Hiring now <span>{roles.length}</span>
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
        <button
          className="button button-outline mobile-filter"
          onClick={() => setDrawer(true)}
        >
          <Icon name="filter" />
          Filters{active ? " •" : ""}
        </button>
      </div>
      <div className="desktop-filters">{filterFields}</div>
      {drawer && (
        <div
          className="sheet-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawer(false);
          }}
        >
          <FilterSheet onClose={() => setDrawer(false)}>
            {filterFields}
            <button className="button" onClick={() => setDrawer(false)}>
              Show {listings.length} results
              <Icon name="arrow" />
            </button>
          </FilterSheet>
        </div>
      )}
      <div className="results-meta" aria-live="polite">
        <p>
          {listings.length}{" "}
          {filters.view === "people"
            ? listings.length === 1
              ? "person"
              : "people"
            : listings.length === 1
              ? "role"
              : "roles"}
          {active
            ? " matching your search"
            : filters.view === "people"
              ? " ready for a new chapter"
              : " looking for good people"}
        </p>
        {active ? (
          <button
            className="text-button"
            onClick={() => update({ ...EMPTY_FILTERS, view: filters.view })}
          >
            Clear filters
          </button>
        ) : (
          <span>Good people. Real opportunities.</span>
        )}
      </div>
      {data.unavailable ? (
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
      ) : listings.length ? (
        <div className={`listing-grid ${pending ? "updating" : ""}`}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name={active ? "search" : "heart"} />
          </span>
          <h3>
            {active
              ? "No matches just yet."
              : filters.view === "people"
                ? "Someone great will be here soon."
                : "The next opportunity starts here."}
          </h3>
          <p>
            {active
              ? "Try a broader search or clear a filter. The right connection might be one click away."
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
              href={filters.view === "people" ? "/add/person" : "/add/role"}
            >
              {filters.view === "people" ? "Add yourself" : "Share a role"}
              <Icon name="arrow" />
            </Link>
          )}
        </div>
      )}
      <aside className="community-strip">
        <div>
          <span className="eyebrow">MAKE A CONNECTION</span>
          <h3>Know someone who should be here?</h3>
          <p>A small share can open a big door.</p>
        </div>
        <Link href="/add/role" className="button button-outline">
          We’re hiring
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
