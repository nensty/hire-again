import type { CommunityPost } from "@/lib/posts";
import { POST_KINDS } from "@/lib/posts";
import { Icon } from "./icon";
import { ReportForm } from "./report-form";

export function PostCard({ post }: { post: CommunityPost }) {
  const initials = post.author_name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <article
      className={`post-card ${post.kind === "community" ? "discussion-row" : ""}`}
    >
      <div className="post-identity">
        <span className="post-monogram" aria-hidden="true">
          {initials || <Icon name="link" />}
        </span>
        <div>
          <h3>
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              {post.author_name || post.title}
            </a>
          </h3>
          {post.author_name && (
            <p className="post-role">{post.role_label || post.title}</p>
          )}
          {post.note && <p className="post-note">{post.note}</p>}
        </div>
      </div>
      <div className="post-focus">
        <span className="post-function">
          {post.function || POST_KINDS[post.kind]}
        </span>
        {post.skills.length > 0 && <p>{post.skills.slice(0, 3).join(" · ")}</p>}
        {post.kind !== "looking" && post.function && (
          <span className="post-kind-label">{POST_KINDS[post.kind]}</span>
        )}
      </div>
      <div className="post-actions">
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="post-open"
        >
          Read on LinkedIn <Icon name="external" />
        </a>
        <p className="post-added">
          Added{" "}
          {new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }).format(new Date(post.created_at))}
        </p>
        <ReportForm kind="post" id={post.id} />
      </div>
    </article>
  );
}
