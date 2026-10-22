"use client";
import { useActionState, useState } from "react";
import { saveListing } from "@/app/actions";
import { initialState } from "@/lib/action-types";
import {
  FUNCTIONS,
  SENIORITIES,
  REGIONS,
  WORK_MODES,
  type EntityType,
} from "@/lib/constants";
import type { Candidate, Role } from "@/lib/types";
import { Icon } from "./icon";
export function ListingForm({
  kind,
  listing,
  demo = false,
}: {
  kind: EntityType;
  listing?: Candidate | Role;
  demo?: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveListing.bind(null, kind, listing?.id || null),
    initialState,
  );
  const [note, setNote] = useState(listing?.note || "");
  const person = kind === "candidate";
  const defaults = (listing || {}) as unknown as Record<string, unknown>;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(defaults)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => [k, String(v)]),
    ),
  );
  const [regions, setRegions] = useState<string[]>(listing?.regions || []);
  const [modes, setModes] = useState<string[]>(listing?.work_modes || []);
  const [relocation, setRelocation] = useState(Boolean(defaults.relocation));
  const [consent, setConsent] = useState(false);
  const [skills, setSkills] = useState(listing?.skills.join(", ") || "");
  const change = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));
  function field(
    name: string,
    label: string,
    opts: {
      optional?: boolean;
      url?: boolean;
      placeholder?: string;
      max?: number;
    } = {},
  ) {
    const error = state.errors?.[name]?.[0];
    return (
      <label className="field" key={name} htmlFor={name}>
        <span>
          {label}
          {opts.optional && <small> (optional)</small>}
        </span>
        <input
          id={name}
          name={name}
          type={opts.url ? "url" : "text"}
          value={values[name] || ""}
          onChange={(e) => change(name, e.target.value)}
          placeholder={opts.placeholder}
          maxLength={opts.max || 120}
          required={!opts.optional}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {error && (
          <span id={`${name}-error`} className="field-error">
            {error}
          </span>
        )}
      </label>
    );
  }
  function choices(
    name: "regions" | "work_modes",
    label: string,
    values: readonly string[],
  ) {
    return (
      <fieldset className="choices full-width">
        <legend>
          {label} <span className="hint">· choose all that apply</span>
        </legend>
        <div className="choice-options">
          {values.map((v) => (
            <label key={v}>
              <input
                type="checkbox"
                name={name}
                value={v}
                checked={(name === "regions" ? regions : modes).includes(v)}
                onChange={(e) => {
                  const setter = name === "regions" ? setRegions : setModes;
                  setter((old) =>
                    e.target.checked ? [...old, v] : old.filter((x) => x !== v),
                  );
                }}
              />
              {v}
            </label>
          ))}
        </div>
        {state.errors?.[name] && (
          <p className="field-error" role="alert">
            {state.errors[name]?.[0]}
          </p>
        )}
      </fieldset>
    );
  }
  return (
    <form action={action} className="form-panel">
      {demo && (
        <p className="notice">
          Read-only development preview. Sign in and publishing need Supabase
          configuration.
        </p>
      )}
      {state.message && (
        <div className="notice notice-error form-status" role="alert">
          {state.message}
        </div>
      )}
      <div className="form-grid">
        <h2 className="form-section-title full-width">
          {person ? "A little about you" : "The opportunity"}
        </h2>
        {person ? (
          <>
            {field("full_name", "Full name", { max: 100 })}
            {field("linkedin_url", "LinkedIn URL", {
              url: true,
              placeholder: "https://www.linkedin.com/in/…",
              max: 2048,
            })}
            {field("target_role", "Target role", {
              placeholder: "e.g. Senior Product Designer",
            })}
            {field("pandadoc_role", "PandaDoc role", { optional: true })}
          </>
        ) : (
          <>
            {field("company_name", "Company name", { max: 100 })}
            {field("contact_name", "Contact name", { max: 100 })}
            {field("role_title", "Role title", {
              placeholder: "e.g. Senior Software Engineer",
            })}
            {field("vacancy_url", "Vacancy URL", {
              url: true,
              placeholder: "https://…",
              max: 2048,
            })}
          </>
        )}
        <label className="field">
          Function
          <select
            name="function"
            value={values.function || ""}
            onChange={(e) => change("function", e.target.value)}
            required
          >
            <option value="" disabled>
              Choose a function
            </option>
            {FUNCTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          {state.errors?.function && (
            <span className="field-error">{state.errors.function[0]}</span>
          )}
        </label>
        <label className="field">
          Seniority
          <select
            name="seniority"
            value={values.seniority || ""}
            onChange={(e) => change("seniority", e.target.value)}
            required
          >
            <option value="" disabled>
              Choose a level
            </option>
            {SENIORITIES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          {state.errors?.seniority && (
            <span className="field-error">{state.errors.seniority[0]}</span>
          )}
        </label>
        {field("location", "Location", {
          placeholder: "City, country — or remote",
        })}
        <label className="field">
          Skills
          <input
            name="skills"
            required
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="TypeScript, React, PostgreSQL"
            maxLength={420}
            aria-describedby="skills-help"
            aria-invalid={Boolean(state.errors?.skills)}
          />
          <small id="skills-help">
            Comma-separated, up to 10. Keep it specific.
          </small>
          {state.errors?.skills && (
            <span className="field-error">{state.errors.skills[0]}</span>
          )}
        </label>
        {choices("regions", "Regions", REGIONS)}
        {choices("work_modes", "Work mode", WORK_MODES)}
        <details
          className="listing-extras full-width"
          open={
            Boolean(
              state.errors &&
              [
                "note",
                "company_website",
                "contact_linkedin_url",
                "visa_support",
                "hiring_post_url",
                "open_to_work_post_url",
              ].some((key) => state.errors?.[key]),
            ) || undefined
          }
        >
          <summary>
            A little more <span className="hint">(optional)</span>
          </summary>
          <div className="form-grid">
            {person ? (
              <>
                <label className="checkbox-label full-width">
                  <input
                    name="relocation"
                    type="checkbox"
                    checked={relocation}
                    onChange={(e) => setRelocation(e.target.checked)}
                  />
                  I’m open to relocating.
                </label>
                <div className="full-width">
                  {field("open_to_work_post_url", "OpenToWork LinkedIn post", {
                    optional: true,
                    url: true,
                    max: 2048,
                  })}
                </div>
              </>
            ) : (
              <>
                {field("company_website", "Company website", {
                  optional: true,
                  url: true,
                  max: 2048,
                })}
                {field("contact_linkedin_url", "Contact LinkedIn", {
                  optional: true,
                  url: true,
                  max: 2048,
                })}
                {field("visa_support", "Visa / relocation support", {
                  optional: true,
                  max: 160,
                })}
                {field("hiring_post_url", "Hiring LinkedIn post", {
                  optional: true,
                  url: true,
                  max: 2048,
                })}
              </>
            )}
            <label className="field full-width" htmlFor="note">
              A short note
              <textarea
                id="note"
                name="note"
                maxLength={240}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  person
                    ? "What would you love to work on next?"
                    : "What should someone know about this opportunity?"
                }
                rows={3}
              />
              <small>{note.length}/240 characters · plain text</small>
              {state.errors?.note && (
                <span className="field-error">{state.errors.note[0]}</span>
              )}
            </label>
          </div>
        </details>
        <label className="checkbox-label consent full-width">
          <input
            type="checkbox"
            name="consent"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          {person
            ? "I currently work or previously worked at PandaDoc and I want this profile to be publicly visible on People I’d Hire Again."
            : "This is a genuine opportunity and I’m happy to hear from PandaDoc people interested in the role."}
        </label>
        {state.errors?.consent && (
          <p className="field-error full-width">{state.errors.consent[0]}</p>
        )}
      </div>
      <div className="form-footer">
        <button className="button" disabled={pending || demo}>
          {pending
            ? "Saving…"
            : listing
              ? "Save changes"
              : person
                ? "Publish my profile"
                : "Publish this role"}
          <Icon name="arrow" />
        </button>
        <p>
          Your login email stays private.
          <br />
          {listing
            ? "Editing keeps the current visibility and expiry."
            : "Public for 30 days. Edit, hide, or delete any time."}
        </p>
      </div>
    </form>
  );
}
