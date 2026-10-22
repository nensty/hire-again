import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";
import { LoginForm } from "@/components/login-form";
import { SharePost } from "@/components/share-post";
import { PostForm } from "@/components/post-form";
import type { CommunityPost } from "@/lib/posts";
export const metadata = { title: "Share a LinkedIn post" };
export default async function AddPost({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  if (edit && !z.uuid().safeParse(edit).success)
    redirect("/manage?notice=missing");
  const client = await supabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!user && !isDemo())
    return (
      <div className="container narrow page-content">
        <Link className="back-link" href="/?view=posts#directory">
          ← Back to posts
        </Link>
        <LoginForm next={`/add/post${edit ? `?edit=${edit}` : ""}`} />
      </div>
    );
  let post: CommunityPost | undefined;
  if (edit && user && client) {
    const { data, error } = await client
      .from("community_posts")
      .select("*")
      .eq("id", edit)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error || !data) redirect("/manage?notice=missing");
    post = data;
  }
  return (
    <div className="container narrow page-content">
      <Link
        href={edit ? "/manage" : "/?view=posts#directory"}
        className="back-link"
      >
        ← {edit ? "Back to your posts" : "Back to posts"}
      </Link>
      <span className="eyebrow">KEEP A GOOD CONNECTION FINDABLE</span>
      <h1>
        {edit
          ? "Update your shared post."
          : "A good post deserves to be found."}
      </h1>
      <p className="page-intro">
        Paste a public LinkedIn post. People can find it here and read the
        original on LinkedIn. This shares a link, not a candidate profile.
      </p>
      {post ? (
        <PostForm post={post} demo={isDemo()} />
      ) : (
        <SharePost demo={isDemo()} />
      )}
    </div>
  );
}
