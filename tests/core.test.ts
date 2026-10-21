import { describe, it, expect } from "vitest";
import { demoPeople, demoRoles } from "../src/lib/demo";
import { match, matchingRoles } from "../src/lib/matching";
import {
  EMPTY_FILTERS,
  filterListings,
  readFilters,
  writeFilters,
} from "../src/lib/filters";
import {
  candidateSchema,
  roleSchema,
  normalizeUrl,
  safeNext,
} from "../src/lib/validation";
import { DAY, isPublic, reminderDue, renewalExpiry } from "../src/lib/expiry";
import { makeToken, verifyToken } from "../src/lib/tokens";
import { reminderEmail } from "../src/lib/email";
describe("matching", () => {
  it("ranks relevant active-compatible roles and gives reasons without percentages", () => {
    const result = matchingRoles(demoPeople[0], demoRoles);
    expect(result[0].item.company_name).toBe("Northstar Studio");
    expect(result[0].label).toBe("Strong overlap");
    expect(result[0].reasons).toContain("Figma");
  });
  it("rejects unrelated functions, incompatible regions, and work modes", () => {
    expect(match(demoPeople[1], demoRoles[0]).score).toBe(0);
    expect(
      match({ ...demoPeople[0], regions: ["US / Canada"] }, demoRoles[0]).score,
    ).toBe(0);
    expect(
      match({ ...demoPeople[0], work_modes: ["On-site"] }, demoRoles[0]).score,
    ).toBe(0);
  });
  it("allows worldwide, flexible preferences, and Europe/EU overlap", () => {
    expect(
      match({ ...demoPeople[0], regions: ["EU / EEA"] }, demoRoles[0]).score,
    ).toBeGreaterThan(0);
    expect(
      match(
        {
          ...demoPeople[0],
          regions: ["Worldwide"],
          work_modes: ["Flexible"],
          seniority: "Flexible",
        },
        demoRoles[0],
      ).score,
    ).toBeGreaterThan(0);
  });
});
describe("search and shareable filters", () => {
  it("combines name/skill/location terms, function, and multi-valued preferences", () => {
    expect(
      filterListings(demoPeople, {
        ...EMPTY_FILTERS,
        q: "sam typescript warsaw",
        function: "engineering",
        regions: ["europe"],
        workModes: ["remote"],
      }),
    ).toHaveLength(1);
    expect(
      filterListings(demoPeople, {
        ...EMPTY_FILTERS,
        q: "sam",
        function: "design",
      }),
    ).toHaveLength(0);
  });
  it("matches companies and ANDs skill terms", () => {
    expect(
      filterListings(demoRoles, {
        ...EMPTY_FILTERS,
        skills: "react, postgres",
        q: "fieldwork",
      }),
    ).toHaveLength(1);
    expect(
      filterListings(demoRoles, { ...EMPTY_FILTERS, skills: "react, figma" }),
    ).toHaveLength(0);
  });
  it("round trips all query state including repeated params and encoded characters", () => {
    const f = {
      ...EMPTY_FILTERS,
      view: "roles" as const,
      q: "C++ & SaaS",
      seniority: "senior",
      regions: ["europe", "uk"],
      workModes: ["remote", "hybrid"],
      skills: "SQL, dbt",
    };
    expect(readFilters(new URLSearchParams(writeFilters(f)))).toEqual(f);
  });
  it("defaults invalid view and bounds search input", () => {
    expect(readFilters(new URLSearchParams("view=foo")).view).toBe("people");
    expect(
      readFilters(new URLSearchParams({ q: "a".repeat(500) })).q,
    ).toHaveLength(200);
  });
});
describe("validation", () => {
  const person = { ...demoPeople[0], consent: true };
  it("accepts and normalizes a profile, deduplicates skills", () => {
    const result = candidateSchema.parse({
      ...person,
      linkedin_url: "linkedin.com/in/example#section",
      skills: [" React ", "react", "SQL"],
    });
    expect(result.linkedin_url).toBe("https://linkedin.com/in/example");
    expect(result.skills).toEqual(["react", "SQL"]);
  });
  it("requires self-publication consent, preferences, and at most ten skills", () => {
    expect(
      candidateSchema.safeParse({ ...person, consent: false }).success,
    ).toBe(false);
    expect(candidateSchema.safeParse({ ...person, regions: [] }).success).toBe(
      false,
    );
    expect(
      candidateSchema.safeParse({ ...person, skills: Array(11).fill("x") })
        .success,
    ).toBe(false);
    expect(
      candidateSchema.safeParse({ ...person, note: "x".repeat(241) }).success,
    ).toBe(false);
  });
  it("rejects deceptive LinkedIn hosts and unsafe protocols", () => {
    for (const url of [
      "https://linkedin.com.evil.com/in/x",
      "javascript:alert(1)",
      "https://evil.com",
    ])
      expect(
        candidateSchema.safeParse({ ...person, linkedin_url: url }).success,
      ).toBe(false);
    expect(() => normalizeUrl("http://example.com")).toThrow();
    expect(() => normalizeUrl("https://user:pass@example.com")).toThrow();
  });
  it("requires a genuine role with a vacancy and contact name", () => {
    expect(
      roleSchema.safeParse({ ...demoRoles[0], consent: true }).success,
    ).toBe(true);
    expect(
      roleSchema.safeParse({
        ...demoRoles[0],
        consent: true,
        vacancy_url: "",
        contact_name: "",
      }).success,
    ).toBe(false);
  });
  it("contains redirects within the app", () => {
    for (const url of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "/auth/callback",
      "/login",
      "/x\r\nfoo",
      "/\t/evil.com",
      "///evil.com",
    ])
      expect(safeNext(url)).toBe("/manage");
    expect(safeNext("/add/person?edit=123")).toBe("/add/person?edit=123");
  });
});
describe("expiry and reminders", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  it("hides listings at the exact expiry boundary without cron", () => {
    expect(
      isPublic(
        { status: "active", expires_at: new Date(now).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      isPublic(
        { status: "hidden", expires_at: new Date(now + DAY).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      isPublic(
        { status: "active", expires_at: new Date(now + 1).toISOString() },
        now,
      ),
    ).toBe(true);
  });
  it("sends one reminder inside the five-day window", () => {
    const row = {
      status: "active",
      expires_at: new Date(now + 5 * DAY).toISOString(),
      reminder_sent_at: null,
    };
    expect(reminderDue(row, now)).toBe(true);
    expect(
      reminderDue(
        { ...row, reminder_sent_at: new Date(now).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      reminderDue(
        { ...row, expires_at: new Date(now + 6 * DAY).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(renewalExpiry(now)).toBe(new Date(now + 30 * DAY).toISOString());
  });
  it("signs bounded versioned renewal links and rejects tampering", () => {
    const key = "x".repeat(32),
      payload = {
        kind: "candidate" as const,
        id: demoPeople[0].id,
        version: new Date(now).toISOString(),
        until: now + DAY,
      };
    const token = makeToken(payload, key);
    expect(verifyToken(token, key, now)).toEqual(payload);
    expect(verifyToken(token + "x", key, now)).toBeNull();
    expect(verifyToken(token, "y".repeat(32), now)).toBeNull();
    expect(verifyToken(token, key, now + DAY)).toBeNull();
    expect(verifyToken(token, key.slice(1), now)).toBeNull();
  });
  it("uses the exact transactional email subjects and plain text", () => {
    expect(
      reminderEmail("candidate", "Designer", "https://example.com/renew")
        .subject,
    ).toBe("Still looking for your next team?");
    expect(
      reminderEmail("role", "Engineer", "https://example.com/renew").subject,
    ).toBe("Still hiring?");
    expect(
      reminderEmail("candidate", "<script>", "https://example.com/renew").text,
    ).toContain("https://example.com/renew");
  });
});
