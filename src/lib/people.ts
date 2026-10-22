import type { Candidate } from "./types";
import type { CommunityPost } from "./posts";
import { normalizePostUrl } from "./posts";
import { isPublic } from "./expiry";
import { optionKey } from "./constants";

export interface PersonResult {
  id: string;
  name: string;
  role: string;
  function: string | null;
  skills: string[];
  profile?: Candidate;
  post?: CommunityPost;
}
function sourceKey(url: string | null) {
  try {
    return url ? normalizePostUrl(url) : null;
  } catch {
    return null;
  }
}
export function collectPeople(
  profiles: Candidate[],
  posts: CommunityPost[],
  now: number,
): PersonResult[] {
  const visible = profiles.filter((p) => isPublic(p, now));
  // Only an explicit reference to the same source can connect a profile and a
  // post. Matching names alone must never merge two people's identities.
  const linked = new Set(
    visible
      .map((p) => {
        const url = sourceKey(p.open_to_work_post_url);
        return url ? `${url}|${p.full_name.trim().toLowerCase()}` : null;
      })
      .filter(Boolean),
  );
  return [
    ...visible.map((profile) => ({
      id: `profile-${profile.id}`,
      name: profile.full_name,
      role: profile.target_role,
      function: profile.function,
      skills: profile.skills,
      profile,
    })),
    ...posts
      .filter(
        (post) =>
          isPublic(post, now) &&
          post.kind === "looking" &&
          !linked.has(
            `${sourceKey(post.url)}|${post.author_name?.trim().toLowerCase()}`,
          ),
      )
      .map((post) => ({
        id: `post-${post.id}`,
        name: post.author_name || post.title,
        role:
          post.role_label ||
          (post.author_name ? post.title : "Looking for work · shared post"),
        function: post.function,
        skills: post.skills,
        post,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
export function searchPeople(
  people: PersonResult[],
  query: string,
  field: string,
) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return people.filter((person) => {
    const haystack = [
      person.name,
      person.role,
      person.function,
      ...person.skills,
      person.profile?.location,
      person.profile?.pandadoc_role,
      person.profile?.seniority,
      person.profile?.note,
      person.post?.note,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!field || optionKey(person.function || "") === field) &&
      terms.every((term) => haystack.includes(term))
    );
  });
}
