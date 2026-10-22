import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";
import { LoginForm } from "@/components/login-form";
import { SharePost } from "@/components/share-post";
import { PostForm } from "@/components/post-form";
import type { CommunityPost } from "@/lib/posts";
export const metadata = { title: "Add someone" };
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
  if (edit && !user && !isDemo())
    return (
      <div className="container narrow page-content">
        <Link className="back-link" href="/?view=posts#directory">
          ← Back to people
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
        ← {edit ? "Back to your posts" : "Back to people"}
      </Link>
      <span className="eyebrow">ADD SOMEONE TO THE LIST</span>
      <h1>{edit ? "Update your shared post." : "Help someone get found."}</h1>
      <p className="page-intro">
        Add their name and public job-search post. A role or skill helps the
        right team find them.
      </p>
      {!edit && (
        <p className="post-self-link">
          Adding yourself?{" "}
          <Link href="/add/person">Create your own profile</Link>.
        </p>
      )}
      {!user && !edit && (
        <p className="guest-sharing-note">
          No account needed.{" "}
          <Link href="/login?next=%2Fadd%2Fpost">Sign in</Link> if you’d like to
          edit or remove your posts later.
        </p>
      )}
      {post ? (
        <PostForm post={post} demo={isDemo()} />
      ) : (
        <SharePost demo={isDemo()} guest={!user} />
      )}
    </div>
  );
}
