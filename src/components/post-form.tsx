"use client";
import { useActionState, useState } from "react";
import { savePost } from "@/app/posts/actions";
import { initialState } from "@/lib/action-types";
import { POST_KINDS, type CommunityPost } from "@/lib/posts";
import { FUNCTIONS } from "@/lib/constants";
import { Icon } from "./icon";
import { SpamTrap } from "./spam-trap";
export function PostForm({
  post,
  demo = false,
  guest = false,
}: {
  post?: CommunityPost;
  demo?: boolean;
  guest?: boolean;
}) {
  const [state, action, pending] = useActionState(
    savePost.bind(null, post?.id || null),
    initialState,
  );
  const [values, setValues] = useState<Record<string, string>>({
    url: post?.url || "",
    title: post?.title || "",
    author_name: post?.author_name || "",
    role_label: post?.role_label || "",
    function: post?.function || "",
    skills: post?.skills.join(", ") || "",
    note: post?.note || "",
    kind: post?.kind || "looking",
  });
  const [confirmed, setConfirmed] = useState(false);
  function input(name: string, label: string, max = 140, required = false) {
    return (
      <label className="field">
        <span>
          {label} {!required && <small>(optional)</small>}
        </span>
        <input
          name={name}
          required={required}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          maxLength={max}
          aria-invalid={Boolean(state.errors?.[name])}
        />
        {state.errors?.[name] && (
          <span className="field-error">{state.errors[name]?.[0]}</span>
        )}
      </label>
    );
  }
  return (
    <form action={action} className="form-panel post-form">
      <SpamTrap />
      {demo && (
        <p className="notice">Fictional preview. Sharing is disabled.</p>
      )}
      {state.message && (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      )}
      <div className="form-grid post-identity-fields">
        {input("author_name", "Person’s name", 100, values.kind === "looking")}
        {input("role_label", "Role", 120)}
      </div>
      <label className="field">
        LinkedIn post link
        <input
          name="url"
          type="url"
          required
          placeholder="https://www.linkedin.com/posts/…"
          value={values.url}
          onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
          maxLength={2048}
          aria-describedby="post-link-hint"
          aria-invalid={Boolean(state.errors?.url)}
        />
        <small id="post-link-hint">
          Paste a public post or lnkd.in share link
        </small>
        {state.errors?.url && (
          <span className="field-error">{state.errors.url[0]}</span>
        )}
      </label>
      {!post && <input type="hidden" name="kind" value="looking" />}
      <details
        className="post-extra"
        open={
          Boolean(
            state.errors &&
            Object.keys(state.errors).some(
              (k) =>
                !["url", "confirmation", "author_name", "role_label"].includes(
                  k,
                ),
            ),
          ) || undefined
        }
      >
        <summary>
          Add skills or a note <span className="hint">(optional)</span>
        </summary>
        <p className="hint">
          Use only details the person chose to share publicly. These help people
          find the right post.
        </p>
        {post && (
          <fieldset className="choices">
            <legend>What kind of post is it?</legend>
            <div className="choice-options">
              {Object.entries(POST_KINDS).map(([kind, label]) => (
                <label key={kind}>
                  <input
                    type="radio"
                    name="kind"
                    value={kind}
                    checked={values.kind === kind}
                    onChange={() => setValues((v) => ({ ...v, kind }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="form-grid">
          {input("title", "Short title")}
          <label className="field">
            Specialty <small>(optional)</small>
            <select
              name="function"
              value={values.function}
              onChange={(e) =>
                setValues((v) => ({ ...v, function: e.target.value }))
              }
            >
              <option value="">Not specified</option>
              {FUNCTIONS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {input("skills", "Skills, comma-separated", 204)}
          <label className="field full-width">
            Your short note <small>(optional)</small>
            <textarea
              name="note"
              value={values.note}
              onChange={(e) =>
                setValues((v) => ({ ...v, note: e.target.value }))
              }
              maxLength={240}
              rows={3}
            />
            <small>Up to 240 characters; don’t copy the original post</small>
            {state.errors?.note && (
              <span className="field-error">{state.errors.note[0]}</span>
            )}
          </label>
        </div>
      </details>
      <label className="checkbox-label consent">
        <input
          type="checkbox"
          name="confirmation"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        {values.kind === "looking"
          ? "This is their public job-search post, and the details above are accurate."
          : "This is a publicly shared post, and the details above are accurate."}
      </label>
      {state.errors?.confirmation && (
        <p className="field-error">{state.errors.confirmation[0]}</p>
      )}
      <div className="form-footer">
        <button className="button" disabled={demo || pending}>
          {pending ? "Saving…" : post ? "Save changes" : "Add someone"}
          <Icon name="arrow" />
        </button>
        <p>
          {guest
            ? "Public for 30 days. Use Report listing to request a correction or removal. Up to 5 guest posts per hour."
            : "Public for 30 days. You can edit or remove it any time."}
        </p>
      </div>
    </form>
  );
}
