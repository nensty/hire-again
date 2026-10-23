import { describe, expect, it } from "vitest";
import { collectPeople, searchPeople } from "../src/lib/people";
import { demoPeople } from "../src/lib/demo";
import { postSchema, type CommunityPost } from "../src/lib/posts";
import source from "../src/data/demo-posts.json";
const now = Date.parse("2026-10-22T12:00:00Z");
const posts = source as CommunityPost[];
const profiles = demoPeople.map((p) => ({
  ...p,
  expires_at: "2026-11-21T00:00:00Z",
}));
describe("one list of people", () => {
  it("shows profiles and job-search posts together, without counting a discussion or vacancy as a person", () => {
    const people = collectPeople(
      profiles,
      [...posts, { ...posts[1], id: "hiring", kind: "hiring" }],
      now,
    );
    expect(people).toHaveLength(13);
    expect(people.filter((p) => p.profile)).toHaveLength(6);
    expect(people.filter((p) => p.post)).toHaveLength(7);
    expect(people.some((p) => p.name === "Shared LinkedIn discussion")).toBe(
      false,
    );
    expect(
      searchPeople(people, "Jamie manager", "").map((p) => p.name),
    ).toEqual(["Jamie Example"]);
    expect(searchPeople(people, "Alex Morgan", "")[0].profile?.slug).toBe(
      "alex-morgan-demo",
    );
  });
  it("filters hidden and expired sources before combining them, with no visibility dependence on cron", () => {
    expect(
      collectPeople(
        profiles.map((p) => ({ ...p, status: "hidden" })),
        posts.map((p) => ({ ...p, status: "closed" })),
        now,
      ),
    ).toHaveLength(0);
    expect(
      collectPeople(profiles, posts, Date.parse("2026-11-21T00:00:00Z")),
    ).toHaveLength(0);
  });
  it("combines duplicate references only for the same explicit source and matching name, preserving the owner-published profile", () => {
    const target = posts.find((p) => p.author_name === "Jamie Example")!;
    const profile = {
      ...profiles[0],
      full_name: target.author_name!,
      open_to_work_post_url: target.url + "?utm_source=share",
    };
    const merged = collectPeople([profile], [target], now);
    expect(merged).toHaveLength(1);
    expect(merged[0].profile).toBe(profile);
    expect(
      collectPeople(
        [{ ...profile, full_name: "Different person" }],
        [target],
        now,
      ),
    ).toHaveLength(2);
    expect(
      collectPeople(
        [{ ...profile, open_to_work_post_url: null }],
        [target],
        now,
      ),
    ).toHaveLength(2);
    expect(
      collectPeople([{ ...profile, status: "hidden" }], [target], now)[0].post,
    ).toBe(target);
  });
  it("searches skills and specialties across both sources", () => {
    const people = collectPeople(profiles, posts, now);
    expect(searchPeople(people, "", "qa-automation")).toHaveLength(3);
    expect(
      searchPeople(people, "SDET", "qa-automation").map((p) => p.name),
    ).toEqual(["Morgan Example"]);
    expect(
      searchPeople(people, "Python", "engineering").map((p) => p.name),
    ).toEqual(["Taylor Example"]);
  });
  it("requires a name for a new looking-for-work post so the entry can be found", () => {
    const payload = {
      url: posts[1].url,
      kind: "looking",
      skills: [],
      confirmation: true,
    };
    expect(postSchema.safeParse(payload).success).toBe(false);
    expect(
      postSchema.safeParse({ ...payload, author_name: "Public Example" })
        .success,
    ).toBe(true);
    expect(
      postSchema.safeParse({ ...payload, kind: "community" }).success,
    ).toBe(true);
  });
});
