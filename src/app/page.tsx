import Link from "next/link";
import { getDirectory } from "@/lib/data";
import { Directory } from "@/components/directory";
import { Icon } from "@/components/icon";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [data, params] = await Promise.all([getDirectory(), searchParams]);
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((s) => query.append(k, s));
    else if (v) query.set(k, v);
  });
  const teams = new Set(
    data.roles.map((r) => r.company_name.trim().toLowerCase()),
  ).size;
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span className="tiny-spark">✳</span> GOOD PEOPLE. NEW CHAPTERS.
          </p>
          <h1>
            People I’d
            <br />
            <em>Hire Again.</em>
          </h1>
          <p className="hero-description">
            Great people from PandaDoc looking for their next team — and teams
            looking for them.
          </p>
          <p className="hero-support">
            A community-built space for PandaDoc people.
            <br className="desktop-break" /> No noise. Just good people finding
            each other.
          </p>
          <div className="hero-actions">
            <Link href="/#directory" className="button">
              Browse people
              <Icon name="arrow" />
            </Link>
            <Link
              href="/?view=roles#directory"
              className="button button-outline"
            >
              Browse roles
            </Link>
          </div>
          <p className="hero-small">
            Looking for your next chapter?{" "}
            <Link href="/add/person">
              Add yourself <span aria-hidden="true">↗</span>
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href="/add/role">We’re hiring ↗</Link>
          </p>
        </div>
        <div className="hero-aside">
          <div className="editorial-note">
            <div className="note-mark">“</div>
            <p>
              My people
              <br />
              are looking
              <br />
              <em>out for me.</em>
            </p>
            <span>THAT’S THE WHOLE IDEA.</span>
          </div>
          <div
            className="stats"
            aria-label={
              data.demo ? "Fictional preview counts" : "Live community counts"
            }
          >
            <div>
              <strong>{data.unavailable ? "—" : data.people.length}</strong>
              <span>People looking</span>
            </div>
            <div>
              <strong>{data.unavailable ? "—" : teams}</strong>
              <span>Teams hiring</span>
            </div>
            <div>
              <strong>{data.unavailable ? "—" : data.roles.length}</strong>
              <span>Open roles</span>
            </div>
          </div>
        </div>
      </section>
      <Directory
        key={query.toString()}
        data={data}
        initialQuery={query.toString()}
        initialNow={data.asOf}
      />
    </>
  );
}
