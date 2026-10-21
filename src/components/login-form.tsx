"use client";
import { useActionState } from "react";
import { sendLogin } from "@/app/actions";
import { initialState } from "@/lib/action-types";
import { Icon } from "./icon";
export function LoginForm({ next = "/manage" }: { next?: string }) {
  const [state, action, pending] = useActionState(sendLogin, initialState);
  return (
    <form action={action} className="form-panel login-panel">
      <span className="eyebrow">YOUR NEXT CHAPTER</span>
      <h1>
        A little hello.
        <br />A new beginning.
      </h1>
      <p>
        Use your email to publish or manage your listing. No password needed.
      </p>
      {state.message && (
        <div
          className={`notice ${state.sent ? "" : "notice-error"}`}
          role="status"
          style={{ marginTop: 20 }}
        >
          {state.message}
        </div>
      )}
      <input type="hidden" name="next" value={next} />
      <label className="field">
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          maxLength={254}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
        {state.errors?.email && (
          <span id="email-error" className="field-error">
            {state.errors.email[0]}
          </span>
        )}
      </label>
      <button className="button" disabled={pending}>
        {pending
          ? "Sending your link…"
          : state.sent
            ? "Send another link"
            : "Email me a sign-in link"}
        <Icon name="arrow" />
      </button>
      <p className="hint">
        Your email stays private. It is never shown on your listing. By
        publishing, you agree to make the information you submit publicly
        visible.
      </p>
    </form>
  );
}
