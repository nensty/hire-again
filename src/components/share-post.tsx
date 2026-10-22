"use client";
import Link from "next/link";
import { useState, useActionState } from "react";
import { PostForm } from "./post-form";
import { importPosts } from "@/app/posts/actions";
import { initialState } from "@/lib/action-types";
import { FUNCTIONS } from "@/lib/constants";
import { POST_KINDS, type PostKind } from "@/lib/posts";
import {
  parsePostList,
  suggestPostTags,
  type PostDraft,
} from "@/lib/post-import";
export function SharePost({ demo = false }: { demo?: boolean }) {
  const [bulk, setBulk] = useState(false);
  const [listKey, setListKey] = useState(0);
  return (
    <>
      <div
        className="share-mode"
        role="group"
        aria-label="Share one post or a list"
      >
        <button aria-pressed={!bulk} onClick={() => setBulk(false)}>
          One post
        </button>
        <button aria-pressed={bulk} onClick={() => setBulk(true)}>
          Paste a list
        </button>
      </div>
      {bulk ? (
        <BulkPostForm
          key={listKey}
          demo={demo}
          onNew={() => setListKey((k) => k + 1)}
        />
      ) : (
        <PostForm demo={demo} />
      )}
    </>
  );
}
function BulkPostForm({ demo, onNew }: { demo: boolean; onNew: () => void }) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<PostDraft[] | null>(null);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, action, pending] = useActionState(importPosts, initialState);
  function review() {
    const result = parsePostList(text);
    if (!result.posts.length) {
      setMessage(
        "No LinkedIn post links found. Paste the post URLs or the comments containing them.",
      );
      return;
    }
    if (result.posts.length > 50) {
      setMessage("Please split this into groups of up to 50 posts.");
      return;
    }
    setDrafts(result.posts);
    setMessage(
      `${result.posts.length} unique post${result.posts.length === 1 ? "" : "s"} found.${result.duplicates ? ` ${result.duplicates} duplicate links skipped.` : ""}${result.ignored ? ` ${result.ignored} unrelated links ignored.` : ""}`,
    );
  }
  if (state.success)
    return (
      <div className="form-panel">
        <h2 className="form-section-title">Your collection is up to date.</h2>
        <p role="status" className="notice">
          {state.message}
        </p>
        <div className="action-row">
          <Link className="button" href="/?view=posts#directory">
            View posts →
          </Link>
          <button className="button button-outline" onClick={onNew}>
            Share another list
          </button>
        </div>
      </div>
    );
  if (!drafts)
    return (
      <div className="form-panel">
        <label className="field">
          Posts or comments
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={30000}
            rows={8}
            placeholder={
              "Alex Example - Engineering Manager\nhttps://www.linkedin.com/posts/…\n\nAnother person - Product Designer\nhttps://lnkd.in/…"
            }
          />
          <small>
            Paste several links with names and roles, separated by a blank line.
            Nothing is fetched from LinkedIn.
          </small>
        </label>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button className="button" onClick={review} disabled={!text.trim()}>
          Review posts →
        </button>
      </div>
    );
  function update(
    index: number,
    field: "author_name" | "role_label",
    value: string,
  ) {
    setDrafts((rows) =>
      rows!.map((r, i) =>
        i === index
          ? {
              ...r,
              [field]: value,
              ...(field === "role_label"
                ? {
                    title: value || "Shared LinkedIn post",
                    ...suggestPostTags(value),
                  }
                : {}),
            }
          : r,
      ),
    );
  }
  return (
    <form action={action} className="form-panel">
      <h2 className="form-section-title">A quick check before sharing</h2>
      <p className="hint">
        Names and roles come from your pasted text. Correct anything that
        doesn’t look right.
      </p>
      <p className="notice" role="status">
        {state.message || message}
      </p>
      <input type="hidden" name="posts" value={JSON.stringify(drafts)} />
      <div className="import-list">
        {drafts.map((post, i) => (
          <fieldset key={post.url} className="import-row">
            <legend>Post {i + 1}</legend>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Read original ↗
            </a>
            <div className="form-grid">
              <label className="field">
                Person / team name
                <input
                  value={post.author_name}
                  onChange={(e) => update(i, "author_name", e.target.value)}
                  maxLength={100}
                />
              </label>
              <label className="field">
                Role
                <input
                  value={post.role_label}
                  onChange={(e) => update(i, "role_label", e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="field">
                Post type
                <select
                  value={post.kind}
                  onChange={(e) =>
                    setDrafts((rows) =>
                      rows!.map((row, index) =>
                        index === i
                          ? { ...row, kind: e.target.value as PostKind }
                          : row,
                      ),
                    )
                  }
                >
                  {Object.entries(POST_KINDS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Function
                <select
                  value={post.function}
                  onChange={(e) =>
                    setDrafts((rows) =>
                      rows!.map((row, index) =>
                        index === i
                          ? {
                              ...row,
                              function: e.target.value as PostDraft["function"],
                            }
                          : row,
                      ),
                    )
                  }
                >
                  <option value="">Not specified</option>
                  {FUNCTIONS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            {post.function && (
              <p className="hint">
                Suggested function: {post.function}
                {post.skills.length ? ` · ${post.skills.join(", ")}` : ""}
              </p>
            )}
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setDrafts((rows) => rows!.filter((_, n) => n !== i))
              }
            >
              Remove from this list
            </button>
          </fieldset>
        ))}
      </div>
      <label className="checkbox-label consent">
        <input
          type="checkbox"
          name="confirmation"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        These are publicly shared posts, and I’ve checked the details above.
      </label>
      <div className="action-row">
        <button
          className="button"
          disabled={pending || demo || !drafts.length || state.success}
        >
          {pending
            ? "Sharing…"
            : `Share ${drafts.length} post${drafts.length === 1 ? "" : "s"}`}
        </button>
        <button
          className="button button-outline"
          type="button"
          onClick={() => {
            setDrafts(null);
            setConfirmed(false);
          }}
        >
          Back to pasted list
        </button>
        {state.success && (
          <Link href="/?view=posts#directory" className="button button-outline">
            View posts →
          </Link>
        )}
      </div>
      {demo && (
        <p className="hint">Sharing is disabled in the fictional preview.</p>
      )}
    </form>
  );
}
