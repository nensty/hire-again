import { privacyHoldActive } from "@/lib/privacy-hold";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { ManagePostCard } from "@/components/manage-post-card";
import type { CommunityPost } from "@/lib/posts";
import { ManageCard } from "@/components/manage-card";
import { signOut } from "../actions";
import type { Candidate, Role } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Manage your listings" };
export default async function Manage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const paused = privacyHoldActive();
  const client = await supabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!user || !client)
    return (
      <div className="container narrow page-content">
        <LoginForm next="/manage" />
      </div>
    );
  const [peopleResult, rolesResult, postsResult, params] = await Promise.all([
    client.from("candidate_profiles").select("*").eq("owner_id", user.id),
    client
      .from("hiring_roles")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    client
      .from("community_posts")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    searchParams,
  ]);
  if (peopleResult.error || rolesResult.error)
    return (
      <div className="container narrow page-content">
        <div className="notice notice-error">
          We couldn’t load your listings. Please refresh in a moment.
        </div>
      </div>
    );
  const people = peopleResult.data as Candidate[],
    roles = rolesResult.data as Role[];
  const notices: Record<string, string> = {
    paused:
      "Publication is paused during the privacy review. You can hide or delete your own records.",
    saved: "Your changes are saved.",
    renewed: paused
      ? "Publication is paused during the privacy review."
      : "A fresh 30 days. Your listing is public again.",
    deleted: "Your listing has been deleted.",
    missing: "We couldn’t find that listing.",
    error: "We couldn’t make that change. Please try again.",
  };
  if (params.notice && !notices[params.notice]) redirect("/manage");
  return (
    <div className="container narrow page-content">
      <div className="manage-header">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h1>Your listings.</h1>
        </div>
        <form action={signOut}>
          <button className="text-button">Sign out</button>
        </form>
      </div>
      <p className="page-intro">
        {paused
          ? "Publication through the site is paused. You can hide or delete records belonging to this account."
          : "Keep things current. Everything here is yours to edit, hide, renew, or remove."}
      </p>
      {params.notice && (
        <p
          className={`notice ${["missing", "error"].includes(params.notice) ? "notice-error" : ""}`}
          role="status"
          style={{ marginTop: 25 }}
        >
          {notices[params.notice]}
        </p>
      )}
      <section className="manage-section">
        <h2>Your profile</h2>
        {people.length ? (
          people.map((p) => (
            <ManageCard key={p.id} listing={p} paused={paused} />
          ))
        ) : (
          <div className="notice">
            {paused ? (
              "No profile is stored for this account."
            ) : (
              <>
                Ready for a new chapter?{" "}
                <Link className="text-link" href="/add/person">
                  Add yourself →
                </Link>
              </>
            )}
          </div>
        )}
      </section>
      <section className="manage-section">
        <h2>Posts you’ve shared</h2>
        {postsResult.error ? (
          <p className="notice">
            We couldn’t load your shared posts. Please try again shortly.
          </p>
        ) : (
          (postsResult.data as CommunityPost[]).map((post) => (
            <ManagePostCard key={post.id} post={post} paused={paused} />
          ))
        )}
        {!paused && (
          <div className="action-row">
            <Link className="button button-outline" href="/add/post">
              Share a LinkedIn post →
            </Link>
          </div>
        )}
      </section>
      <section className="manage-section">
        <h2>Your hiring roles</h2>
        {roles.map((r) => (
          <ManageCard key={r.id} listing={r} paused={paused} />
        ))}
        {!paused && (
          <div className="action-row">
            <Link className="button button-outline" href="/add/role">
              Share {roles.length ? "another" : "a"} role →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
