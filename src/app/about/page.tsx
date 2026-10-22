import Link from "next/link";
export const metadata = { title: "About" };
export default function About() {
  return (
    <article className="container page-content legal">
      <span className="eyebrow">OUR LITTLE CORNER OF THE INTERNET</span>
      <h1>
        Good people.
        <br />
        Looking out for each other.
      </h1>
      <p>
        People I’d Hire Again is an independent, non-monetized community
        initiative for current and former PandaDoc people and teams who would
        love to hire them.
      </p>
      <h2>Find the person you lost in the feed.</h2>
      <p>
        Sometimes finding your next team starts with someone saying, “You should
        meet this person.” This is a place to make those introductions a little
        easier.
      </p>
      <p>
        Search one list by name, role, or skill, then open a person’s original
        post or profile to start a conversation. People can add their own
        profile, or share someone’s public job-search post. Both appear in the
        same list, with the source labeled on each entry.
      </p>
      <h2>Good posts, easy to find.</h2>
      <p>
        The community can also share links to public LinkedIn posts. Search by
        name, role, or skill, then open the original to read the latest
        information. A shared post is a source link, not a candidate profile or
        a claim that someone is still looking. Names and role labels come from
        the person sharing the link, and are not independently verified. No
        sign-in is needed to share a link. Sign in before sharing if you want to
        manage it later; guest posts can be reported for correction or removal.
      </p>
      <h2>Yours to manage.</h2>
      <p>
        For profiles, roles, and posts shared while signed in, you’re in
        control. Listings stay public for 30 days. Renew when you need more
        time, hide when you need a pause, or remove your listing whenever you
        like. No approval process. No waiting on an admin.
      </p>
      <p>
        Being listed is a self-declaration, not a verification of employment or
        a professional endorsement. Please use your own judgment when
        connecting.
      </p>
      <h2>Independent, with care.</h2>
      <p>
        Independent community initiative. Not affiliated with or endorsed by
        PandaDoc.
      </p>
      <div className="action-row">
        <Link href="/?view=people#directory" className="button">
          Meet the people →
        </Link>
        <Link href="/add/post" className="button button-outline">
          Add someone
        </Link>
      </div>
    </article>
  );
}
