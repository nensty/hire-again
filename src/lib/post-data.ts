import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { publicConfig, isDemo } from "./env";
import { isPublic } from "./expiry";
import type { CommunityPost } from "./posts";
import sharedPosts from "@/data/shared-posts.json";
export const POST_COLUMNS =
  "id,url,title,author_name,role_label,function,skills,kind,note,status,expires_at,created_at,updated_at,closed_at";

function orderPosts(posts: CommunityPost[]) {
  return posts.sort(
    (a, b) =>
      Number(a.kind === "community") - Number(b.kind === "community") ||
      Date.parse(b.created_at) - Date.parse(a.created_at) ||
      (a.author_name || a.title).localeCompare(b.author_name || b.title),
  );
}
const cachedPosts = unstable_cache(
  async () => {
    const c = publicConfig();
    if (!c) return [];
    const client = createClient(c.url, c.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const rows: CommunityPost[] = [];
    const now = new Date().toISOString();
    for (let start = 0; ; start += 1000) {
      const { data, error } = await client
        .from("community_posts")
        .select(POST_COLUMNS)
        .eq("status", "active")
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .order("id")
        .range(start, start + 999);
      if (error) throw new Error("Posts unavailable");
      rows.push(...(data as CommunityPost[]));
      if (data.length < 1000) return rows;
    }
  },
  ["community-posts-v1"],
  { revalidate: 60, tags: ["posts"] },
);
export async function getPosts(): Promise<{
  posts: CommunityPost[];
  unavailable: boolean;
}> {
  if (isDemo()) {
    return {
      posts: orderPosts(
        (sharedPosts as CommunityPost[]).map((p) => ({
          ...p,
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        })),
      ),
      unavailable: false,
    };
  }
  if (!publicConfig())
    return {
      posts: orderPosts(
        (sharedPosts as CommunityPost[]).filter((p) => isPublic(p)),
      ),
      unavailable: false,
    };
  try {
    return {
      posts: orderPosts((await cachedPosts()).filter((p) => isPublic(p))),
      unavailable: false,
    };
  } catch {
    return { posts: [], unavailable: true };
  }
}
