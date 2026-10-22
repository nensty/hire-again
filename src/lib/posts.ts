import { z } from "zod";
import { FUNCTIONS, optionKey } from "./constants";
import { normalizeUrl } from "./validation";
import { isPublic } from "./expiry";

export const POST_KINDS = {
  looking: "Looking for work",
  hiring: "Hiring",
  community: "Community",
} as const;
export type PostKind = keyof typeof POST_KINDS;
export interface CommunityPost {
  id: string;
  url: string;
  title: string;
  author_name: string | null;
  role_label: string | null;
  function: (typeof FUNCTIONS)[number] | null;
  skills: string[];
  kind: PostKind;
  note: string | null;
  status: "active" | "hidden" | "closed";
  expires_at: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}
export function normalizePostUrl(value: string) {
  let url = new URL(normalizeUrl(value));
  // Decode LinkedIn's own safety wrapper locally. Never fetch redirects or use browser cookies.
  if (
    ["linkedin.com", "www.linkedin.com"].includes(url.hostname) &&
    url.pathname === "/safety/go/"
  ) {
    const target = url.searchParams.get("url");
    if (!target) throw new Error("Missing post link.");
    url = new URL(normalizeUrl(target));
  }
  const linkedIn = ["linkedin.com", "www.linkedin.com"].includes(url.hostname);
  const short = url.hostname === "lnkd.in";
  if (
    (!linkedIn && !short) ||
    (linkedIn &&
      !/^\/(posts\/[^/]+|feed\/update\/[^/]+|pulse\/[^/]+)/.test(
        url.pathname,
      )) ||
    (short && !/^\/(?:p\/)?[A-Za-z0-9_-]+\/?$/.test(url.pathname))
  )
    throw new Error("Use a LinkedIn post link or lnkd.in share link.");
  if (linkedIn) url.hostname = "www.linkedin.com";
  const keep = new URLSearchParams();
  for (const name of ["commentUrn", "replyUrn"]) {
    const value = url.searchParams.get(name);
    if (value) keep.set(name, value);
  }
  url.search = keep.toString();
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);
export const postSchema = z
  .object({
    url: z
      .string()
      .trim()
      .max(2048)
      .transform((value, ctx) => {
        try {
          return normalizePostUrl(value);
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Use a LinkedIn post link or lnkd.in share link.",
          });
          return z.NEVER;
        }
      }),
    title: z
      .string()
      .trim()
      .max(140)
      .optional()
      .transform((v) => v || "Shared LinkedIn post"),
    author_name: optional(100),
    role_label: optional(120),
    function: z
      .union([z.enum(FUNCTIONS), z.literal("")])
      .optional()
      .transform((v) => v || null),
    skills: z
      .array(z.string().trim().min(1).max(40))
      .max(5, "Use up to 5 skills.")
      .transform((v) => [
        ...new Map(v.map((s) => [s.toLowerCase(), s])).values(),
      ]),
    kind: z.enum(["looking", "hiring", "community"]),
    note: optional(240),
    confirmation: z.literal(true, {
      error: "Please confirm this is a publicly shared post.",
    }),
  })
  .refine((post) => post.kind !== "looking" || Boolean(post.author_name), {
    path: ["author_name"],
    message: "Add the person’s name so others can find them.",
  });
export function filterPosts(
  posts: CommunityPost[],
  filters: { q: string; function: string; skills: string; postType: string },
  now = Date.now(),
) {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  const skills = filters.skills
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return posts.filter((p) => {
    const haystack = [
      p.title,
      p.author_name,
      p.role_label,
      p.function,
      p.note,
      POST_KINDS[p.kind],
      ...p.skills,
    ]
      .join(" ")
      .toLowerCase();
    return (
      isPublic(p, now) &&
      terms.every((t) => haystack.includes(t)) &&
      (!filters.function ||
        (p.function && optionKey(p.function) === filters.function)) &&
      (!filters.postType || p.kind === filters.postType) &&
      skills.every((s) => p.skills.some((t) => t.toLowerCase().includes(s)))
    );
  });
}
