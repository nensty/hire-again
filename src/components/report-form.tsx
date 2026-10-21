"use client";
import { useActionState } from "react";
import { reportListing } from "@/app/actions";
import { initialState } from "@/lib/action-types";
import type { EntityType } from "@/lib/constants";
export function ReportForm({ kind, id }: { kind: EntityType; id: string }) {
  const [state, action, pending] = useActionState(reportListing, initialState);
  return (
    <details className="report-form">
      <summary>Report listing</summary>
      <form action={action}>
        <input type="hidden" name="entity_type" value={kind} />
        <input type="hidden" name="entity_id" value={id} />
        <label className="sr-only" htmlFor="report-reason">
          Reason for reporting
        </label>
        <select id="report-reason" name="reason" required>
          <option value="">Choose a reason</option>
          {[
            "Outdated or filled",
            "Misleading information",
            "Spam or scam",
            "Privacy concern",
            "Other",
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <div hidden aria-hidden="true">
          <label>
            Leave empty
            <input name="website_confirm" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        {state.message && (
          <p role="status" className="hint">
            {state.message}
          </p>
        )}
        <button className="text-button" disabled={pending || state.success}>
          {pending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
