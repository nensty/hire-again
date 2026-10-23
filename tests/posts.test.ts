import { describe, it, expect } from "vitest";
import {
  normalizePostUrl,
  postSchema,
  filterPosts,
  type CommunityPost,
} from "../src/lib/posts";
import { parsePostList, suggestPostTags } from "../src/lib/post-import";
import { readFilters, writeFilters, EMPTY_FILTERS } from "../src/lib/filters";
import seed from "../src/data/demo-posts.json";
const posts = seed as CommunityPost[];
const now = Date.parse("2026-10-22T12:00:00Z");
describe("sourced post collection", () => {
  it("uses eight fictional fixtures without candidate-profile creation", () => {
    expect(posts).toHaveLength(8);
    expect(posts.find((p) => p.author_name === "Jamie Example")?.url).toBe(
      "https://www.linkedin.com/posts/fictional-demo-7-000000000",
    );
    expect(
      posts.find((p) => p.author_name === "Taylor Example")?.skills,
    ).toContain("Python");
    expect(posts[0].author_name).toBeNull();
    expect(posts.every((p) => !("linkedin_url" in p))).toBe(true);
  });
  it("normalizes tracking and safety wrappers locally, preserving comment anchors", () => {
    expect(
      normalizePostUrl(
        "https://linkedin.com/posts/example-123/?utm_source=share&commentUrn=urn%3Ali%3Acomment%3A123#junk",
      ),
    ).toBe(
      "https://www.linkedin.com/posts/example-123?commentUrn=urn%3Ali%3Acomment%3A123",
    );
    expect(
      normalizePostUrl(
        "https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffictional-demo-7-000000000&urlhash=unused",
      ),
    ).toBe("https://www.linkedin.com/posts/fictional-demo-7-000000000");
  });
  it("rejects profiles, deceptive hosts, unsafe schemes and non-LinkedIn safety redirects", () => {
    for (const url of [
      "https://linkedin.com/in/person",
      "https://linkedin.com.evil.com/posts/example",
      "javascript:alert(1)",
      "https://example.com/post",
      "https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fevil.com",
    ])
      expect(() => normalizePostUrl(url)).toThrow();
  });
  it("requires a public-post confirmation, with metadata optional and no fetched details", () => {
    const result = postSchema.parse({
      url: posts[0].url,
      kind: "community",
      skills: [],
      confirmation: true,
    });
    expect(result.title).toBe("Shared LinkedIn post");
    expect(result.author_name).toBeNull();
    expect(
      postSchema.safeParse({ ...result, confirmation: false }).success,
    ).toBe(false);
    expect(
      postSchema.safeParse({
        ...result,
        confirmation: true,
        skills: Array(6).fill("SQL"),
      }).success,
    ).toBe(false);
  });
  it("finds a lost engineering-manager post by name and role, and respects function/kind filters", () => {
    expect(
      filterPosts(
        posts,
        {
          q: "Jamie manager",
          function: "engineering",
          skills: "",
          postType: "looking",
        },
        now,
      ).map((p) => p.author_name),
    ).toEqual(["Jamie Example"]);
    expect(
      filterPosts(
        posts,
        {
          q: "",
          function: "qa-automation",
          skills: "automation",
          postType: "",
        },
        now,
      ),
    ).toHaveLength(2);
    expect(
      filterPosts(
        posts,
        { q: "", function: "", skills: "", postType: "community" },
        now,
      ),
    ).toHaveLength(1);
  });
  it("never returns hidden or expired posts, regardless of cache or cron timing", () => {
    const f = { q: "", function: "", skills: "", postType: "" };
    expect(
      filterPosts(
        posts.map((p) => ({ ...p, status: "hidden" })),
        f,
        now,
      ),
    ).toHaveLength(0);
    expect(
      filterPosts(posts, f, Date.parse("2026-11-21T00:00:00Z")),
    ).toHaveLength(0);
  });
  it("round-trips post query state and removes incompatible people-only filters", () => {
    const f = {
      ...EMPTY_FILTERS,
      view: "posts" as const,
      postType: "looking",
      q: "manager",
      function: "engineering",
    };
    expect(readFilters(new URLSearchParams(writeFilters(f)))).toEqual(f);
    const decoded = readFilters(
      new URLSearchParams(
        "view=posts&seniority=senior&region=europe&work-mode=remote",
      ),
    );
    expect(decoded.seniority).toBe("");
    expect(decoded.regions).toEqual([]);
    expect(decoded.workModes).toEqual([]);
    expect(writeFilters(EMPTY_FILTERS)).toContain("view=people");
  });
});
describe("paste once, review, share", () => {
  it("extracts names/roles, decodes safety links, and deduplicates visible Markdown targets", () => {
    const text =
      "Morgan Example - SDET / Automation Engineer / Quality Engineer  If you’re looking for a strong professional, see [https://www.linkedin.com/posts/fictional-demo-2-000000000](https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fwww.linkedin.com%2Fposts%2Ffictional-demo-2-000000000&urlhash=unused)\n\nTaylor Example - Senior Backend Engineer (Python)  https://www.linkedin.com/posts/fictional-demo-4-000000000\n\nhttps://www.linkedin.com/posts/fictional-demo-2-000000000";
    const result = parsePostList(text);
    expect(result.posts).toHaveLength(2);
    expect(result.duplicates).toBe(1);
    expect(result.posts[0].author_name).toBe("Morgan Example");
    expect(result.posts[0].role_label).toBe(
      "SDET / Automation Engineer / Quality Engineer",
    );
    expect(result.posts[0].function).toBe("QA / Automation");
    expect(result.posts[1].skills).toEqual(["Python"]);
  });
  it("leaves unknown people/roles blank rather than inventing them", () => {
    const parsed = parsePostList(
      "https://www.linkedin.com/posts/fictional-demo-1-000000000",
    );
    expect(parsed.posts[0].author_name).toBe("");
    expect(parsed.posts[0].role_label).toBe("");
    expect(parsed.posts[0].kind).toBe("community");
    expect(suggestPostTags("Senior Engineering Manager").function).toBe(
      "Engineering",
    );
    expect(suggestPostTags("Unknown").skills).toEqual([]);
  });
  it("ignores unrelated links and never fetches or imports profile pages", () => {
    const parsed = parsePostList(
      "https://example.com\nhttps://www.linkedin.com/in/person\nhttps://www.linkedin.com/posts/fictional-demo-1-000000000",
    );
    expect(parsed.posts).toHaveLength(1);
    expect(parsed.ignored).toBe(2);
  });
});
