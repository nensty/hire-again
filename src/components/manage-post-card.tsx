import Link from "next/link";
import { changePost } from "@/app/posts/actions";
import { isPublic } from "@/lib/expiry";
import type { CommunityPost } from "@/lib/posts";
export function ManagePostCard({
  post,
  paused = false,
}: {
  post: CommunityPost;
  paused?: boolean;
}) {
  const visible = isPublic(post);
  const status =
    post.status === "active" && !visible
      ? "Expired"
      : post.status === "active"
        ? paused
          ? "Publication paused"
          : "Public"
        : post.status === "hidden"
          ? "Hidden"
          : "Closed";
  const fields = (action: string) => (
    <>
      <input type="hidden" name="id" value={post.id} />
      <input type="hidden" name="action" value={action} />
    </>
  );
  return (
    <article className="manage-card">
      <div className="manage-card-top">
        <div>
          <h3>{post.title}</h3>
          <p>{post.author_name || "Shared LinkedIn post"}</p>
        </div>
        <span className={`status-pill ${visible ? "active" : ""}`}>
          {status}
        </span>
      </div>
      <div className="manage-actions">
        <a
          className="button button-outline"
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read original
        </a>
        {!paused && (
          <>
            <Link
              className="button button-outline"
              href={`/add/post?edit=${post.id}`}
            >
              Edit
            </Link>
          </>
        )}
        <form action={changePost}>
          {fields(paused || visible ? "hide" : "show")}
          <button className="button button-outline">
            {paused || visible ? "Hide" : "Show for 30 days"}
          </button>
        </form>
        {!paused && visible && (
          <form action={changePost}>
            {fields("renew")}
            <button className="button button-outline">Renew 30 days</button>
          </form>
        )}
        <details className="post-delete">
          <summary className="text-button">Delete</summary>
          <form action={changePost}>
            {fields("delete")}
            <label className="checkbox-label">
              <input type="checkbox" required />
              Permanently remove this shared link.
            </label>
            <button className="button button-danger">Delete post</button>
          </form>
        </details>
      </div>
    </article>
  );
}
