import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { CopyButton } from "@/components/copy-button";
export const metadata = { title: "You’re in" };
export default async function Published({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; slug?: string }>;
}) {
  const { kind, slug } = await searchParams;
  const client = await supabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!user || !client) redirect("/login");
  if (!["candidate", "role"].includes(kind || "") || !slug) redirect("/manage");
  const person = kind === "candidate";
  const { data } = await client
    .from(person ? "candidate_profiles" : "hiring_roles")
    .select("id")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) redirect("/manage");
  const path = `/${person ? "people" : "roles"}/${slug}`;
  return (
    <div className="container narrow success">
      <span className="eyebrow">A NEW CONNECTION STARTS HERE</span>
      <h1>{person ? "You’re in. ❤️" : "Your role is out there. ❤️"}</h1>
      <p>
        {person
          ? "Your people can find you now. Here’s to what comes next."
          : "Good people can find this opportunity now."}
      </p>
      <p>
        Your listing is public for 30 days. We’ll email you before it expires.
      </p>
      <div className="action-row">
        <Link href={path} className="button">
          View {person ? "profile" : "role"}
        </Link>
        <CopyButton path={path} />
        <Link href="/manage" className="button button-outline">
          Manage {person ? "profile" : "role"}
        </Link>
      </div>
    </div>
  );
}
