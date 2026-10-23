import { privacyHoldActive } from "@/lib/privacy-hold";
import { PrivacyHold } from "@/components/privacy-hold";
import { getPosts } from "@/lib/post-data";
import { getDirectory } from "@/lib/data";
import { Directory } from "@/components/directory";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (privacyHoldActive()) return <PrivacyHold />;
  const [data, postData, params] = await Promise.all([
    getDirectory(),
    getPosts(),
    searchParams,
  ]);
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((s) => query.append(k, s));
    else if (v) query.set(k, v);
  });
  const rolesView = query.get("view") === "roles";
  return (
    <>
      <section className="people-intro container" aria-labelledby="home-title">
        <p className="eyebrow">PEOPLE I’D HIRE AGAIN · PANDADOC COMMUNITY</p>
        <h1 id="home-title">
          {rolesView ? (
            <>
              Find your <em>next team.</em>
            </>
          ) : (
            <>
              Good people.
              <br />
              <em>Easy to find.</em>
            </>
          )}
        </h1>
        <p>
          {rolesView
            ? "Opportunities shared by teams in the community."
            : "Find people from the PandaDoc community by name, role, or skill. Open their post or profile and start a conversation."}
        </p>
      </section>
      <Directory
        key={query.toString()}
        data={data}
        initialQuery={query.toString()}
        initialNow={data.asOf}
        posts={postData.posts}
        postsUnavailable={postData.unavailable}
      />
    </>
  );
}
