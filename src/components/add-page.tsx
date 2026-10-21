import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";
import { ListingForm } from "./listing-form";
import { LoginForm } from "./login-form";
import { ENTITY_TABLE, type EntityType } from "@/lib/constants";
import type { Candidate, Role } from "@/lib/types";
export async function AddPage({
  kind,
  edit,
}: {
  kind: EntityType;
  edit?: string;
}) {
  const person = kind === "candidate";
  const next = `/add/${person ? "person" : "role"}${edit ? `?edit=${encodeURIComponent(edit)}` : ""}`;
  const client = await supabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  let listing: Candidate | Role | undefined;
  if (!user && !isDemo())
    return (
      <div className="container narrow page-content">
        <Link href="/" className="back-link">
          ← Back to the community
        </Link>
        <LoginForm next={next} />
      </div>
    );
  if (user && client) {
    if (edit) {
      const { data } = await client
        .from(ENTITY_TABLE[kind])
        .select("*")
        .eq("id", edit)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!data) redirect("/manage?notice=missing");
      listing = data;
    } else if (person) {
      const { data } = await client
        .from("candidate_profiles")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data) redirect(`/add/person?edit=${data.id}`);
    }
  }
  return (
    <div className="container narrow page-content">
      <Link href={edit ? "/manage" : "/"} className="back-link">
        ← {edit ? "Back to your listings" : "Back to the community"}
      </Link>
      <span className="eyebrow">
        {person ? "YOUR PEOPLE ARE HERE" : "GOOD TEAMS, GOOD PEOPLE"}
      </span>
      <h1>
        {edit
          ? "A little update."
          : person
            ? "Your next chapter starts here."
            : "Make room for someone great."}
      </h1>
      <p className="page-intro">
        {person
          ? "Tell the community what you’re looking for. No CV, no long story. Just you and what comes next."
          : "Share a real opportunity. The right person might already be here."}
      </p>
      <ListingForm kind={kind} listing={listing} demo={isDemo()} />
    </div>
  );
}
