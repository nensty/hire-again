import { getPosts } from "@/lib/post-data";
import { getDirectory } from "@/lib/data";
import { Directory } from "@/components/directory";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
  if (!params.view && !data.people.length && postData.posts.length)
    query.set("view", "posts");
  return (
    <>
      <section
        className="discovery-intro container"
        aria-labelledby="home-title"
      >
        <div>
          <p className="eyebrow">THE PANDADOC COMMUNITY, CONNECTED</p>
          <h1 id="home-title">
            Find your next
            <br />
            <em>great teammate.</em>
          </h1>
        </div>
        <p className="discovery-intro-copy">
          Good people get lost in the feed. <br />
          Find their posts, explore their experience, and help them find what’s
          next.
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
