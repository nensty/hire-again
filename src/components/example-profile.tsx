import Link from "next/link";
import { Icon } from "./icon";

// A display-only illustration: never stored, matched, or counted as a listing.
export function ExampleProfile() {
  return (
    <section className="example-preview" aria-labelledby="example-profile-title">
      <div className="example-intro">
        <span className="eyebrow">A LITTLE INSPIRATION</span>
        <h2 id="example-profile-title">Your next chapter could look like this.</h2>
        <p>
          No public profiles yet. Here’s a fictional example of what yours could
          look like — a few skills, what you’re looking for, and a way to say hello.
        </p>
        <p className="hint">This example is not included in community counts.</p>
        <Link href="/add/person" className="button">
          Add yourself <Icon name="arrow" />
        </Link>
      </div>
      <article className="listing-card example-card" aria-label="Fictional example profile">
        <div className="card-top">
          <span className="eyebrow">Engineering</span>
          <span className="example-badge">Fictional example</span>
        </div>
        <h3>Alex Example</h3>
        <p className="card-role">Senior Software Engineer</p>
        <p className="card-history">Example former role: Software Engineer at PandaDoc</p>
        <div className="skills">
          {["TypeScript", "React", "Node.js", "PostgreSQL"].map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <div className="card-meta">
          <span><Icon name="pin" />Warsaw, Poland</span>
          <span>Remote · Senior · Europe</span>
        </div>
        <p className="example-note">
          I love making complex products feel simple. Looking for a thoughtful
          team where I can build useful things and keep learning.
        </p>
        <div className="card-footer">
          <span className="hint">Illustration only · no real contact details</span>
        </div>
      </article>
    </section>
  );
}
