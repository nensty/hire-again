"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { changeListing } from "@/app/actions";
import type { Candidate, Role } from "@/lib/types";
import { isCandidate } from "@/lib/types";
import { isPublic } from "@/lib/expiry";
export function ManageCard({ listing }: { listing: Candidate | Role }) {
  const person = isCandidate(listing);
  const kind = person ? "candidate" : "role";
  const path = `/${person ? "people" : "roles"}/${listing.slug}`;
  const status =
    listing.status === "active" && !isPublic(listing)
      ? "expired"
      : listing.status;
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  function fields(action: string) {
    return (
      <>
        <input type="hidden" name="id" value={listing.id} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="action" value={action} />
      </>
    );
  }
  return (
    <article className="manage-card">
      <div className="manage-card-top">
        <div>
          <h3>{person ? listing.full_name : listing.role_title}</h3>
          <p>{person ? listing.target_role : listing.company_name}</p>
        </div>
        <span className={`status-pill ${status}`}>
          {status === "active"
            ? "Public"
            : status === "closed"
              ? person
                ? "Found a role"
                : "Filled"
              : status === "hidden"
                ? "Hidden"
                : "Expired"}
        </span>
      </div>
      <p>
        {status === "closed"
          ? "Closed"
          : status === "expired"
            ? "Expired"
            : "Expires"}{" "}
        {new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(
          new Date(
            status === "closed" && listing.closed_at
              ? listing.closed_at
              : listing.expires_at,
          ),
        )}
        {status === "active" ? " · visible to everyone" : ""}
      </p>
      <div className="manage-actions">
        {status === "active" && (
          <Link className="button button-outline" href={path}>
            View
          </Link>
        )}
        <Link
          className="button button-outline"
          href={`/add/${person ? "person" : "role"}?edit=${listing.id}`}
        >
          Edit
        </Link>
        <form action={changeListing}>
          {fields(status === "active" ? "hide" : "show")}
          <ActionButton>
            {status === "active" ? "Hide" : "Show for 30 days"}
          </ActionButton>
        </form>
        <form action={changeListing}>
          {fields("renew")}
          <ActionButton>Renew 30 days</ActionButton>
        </form>
        {status !== "closed" && (
          <form action={changeListing}>
            {fields("close")}
            <ActionButton>
              {person ? "I found my next role" : "Role filled"}
            </ActionButton>
          </form>
        )}
        <button
          className="button button-danger"
          onClick={() => {
            setConfirmed(false);
            dialog.current?.showModal();
          }}
        >
          Delete
        </button>
      </div>
      <dialog
        ref={dialog}
        className="delete-dialog"
        aria-labelledby={`delete-title-${listing.id}`}
      >
        <h2 id={`delete-title-${listing.id}`}>
          Delete this {person ? "profile" : "role"}?
        </h2>
        <p>
          This removes your listing permanently. You can always publish a new
          one later.
        </p>
        <form action={changeListing}>
          {fields("delete")}
          <label className="checkbox-label" style={{ marginTop: 18 }}>
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Yes, delete this listing.
          </label>
          <div className="action-row">
            <button
              type="button"
              className="button button-outline"
              onClick={() => dialog.current?.close()}
            >
              Keep it
            </button>
            <DeleteButton disabled={!confirmed} />
          </div>
        </form>
      </dialog>
    </article>
  );
}
function ActionButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-outline" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-danger" disabled={disabled || pending}>
      {pending ? "Deleting…" : "Delete permanently"}
    </button>
  );
}
