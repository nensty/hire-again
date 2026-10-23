import { privacyHoldActive } from "@/lib/privacy-hold";
import { PrivacyHold } from "@/components/privacy-hold";
import Link from "next/link";
import { verifyToken } from "@/lib/tokens";
import { actOnReminder } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Keep your listing current",
  referrer: "no-referrer" as const,
};
export default async function Renew({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; result?: string }>;
}) {
  if (privacyHoldActive()) return <PrivacyHold />;
  const { t, result } = await searchParams;
  const payload = t ? verifyToken(t, process.env.CRON_SECRET || "") : null;
  if (result === "renewed" || result === "hidden")
    return (
      <div className="container narrow page-content success">
        <h1>
          {result === "renewed"
            ? "Here’s to your next chapter."
            : "Quietly tucked away."}
        </h1>
        <p>
          {result === "renewed"
            ? "Your listing is public for another 30 days."
            : "Your listing is hidden from the directory."}
        </p>
        <div className="action-row">
          <Link href="/manage" className="button">
            Manage listing
          </Link>
        </div>
      </div>
    );
  if (!payload)
    return (
      <div className="container narrow page-content">
        <div className="empty-state">
          <h1 className="page-title">Let’s start fresh.</h1>
          <p>
            This link has expired or your listing has changed. Sign in to manage
            it.
          </p>
          <Link href="/manage" className="button">
            Manage your listing
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container narrow page-content success">
      <span className="eyebrow">A QUICK CHECK-IN</span>
      <h1>
        {payload.kind === "candidate"
          ? "Still looking for your next team?"
          : "Still hiring?"}
      </h1>
      <p>
        One click keeps your listing public for another 30 days. Or hide it
        until you’re ready.
      </p>
      <p className="hint">Opening this page does not change your listing.</p>
      <form action={actOnReminder} className="action-row">
        <input type="hidden" name="token" value={t} />
        <button className="button" name="action" value="renew">
          Keep it public for 30 days
        </button>
        <button className="button button-outline" name="action" value="hide">
          Hide my listing
        </button>
      </form>
    </div>
  );
}
