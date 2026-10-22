import type { CommunityPost } from "@/lib/posts";
import { POST_KINDS } from "@/lib/posts";
import { Icon } from "./icon";
import { ReportForm } from "./report-form";
export function PostCard({ post }: { post: CommunityPost }) {
  return (
    <article className="listing-card post-card">
      <div className="card-top">
        <span className="eyebrow">{POST_KINDS[post.kind]}</span>
        <span className="post-source">LinkedIn</span>
      </div>
      <h3>
        <a href={post.url} target="_blank" rel="noopener noreferrer">
          {post.author_name || post.title}
        </a>
      </h3>
      {post.author_name && (
        <p className="card-role">{post.role_label || post.title}</p>
      )}
      {post.note && <p className="post-note">{post.note}</p>}
      {post.skills.length > 0 && (
        <div className="skills">
          {post.skills.slice(0, 5).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      <p className="post-date">
        Added{" "}
        {new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(new Date(post.created_at))}
        {post.function ? ` · ${post.function}` : ""}
      </p>
      <div className="card-footer">
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          Read on LinkedIn
          <Icon name="external" />
        </a>
        <span className="hint">Original source</span>
      </div>
      <ReportForm kind="post" id={post.id} />
    </article>
  );
}
