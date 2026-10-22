import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";
export async function allowAction(action: string, max: number) {
  if (!process.env.CRON_SECRET || !process.env.SUPABASE_SECRET_KEY)
    return false;
  try {
    const h = await headers();
    // Only Vercel's edge-overwritten address is trusted. Client-supplied
    // forwarded headers must not let guests reset their quota. Other hosts
    // share one conservative bucket until a trusted ingress is implemented.
    const address =
      process.env.VERCEL === "1"
        ? h.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown"
        : "unknown";
    const fingerprint = createHmac("sha256", process.env.CRON_SECRET)
      .update(address)
      .digest("hex");
    const { data, error } = await supabaseAdmin().rpc("consume_limit", {
      p_fingerprint: fingerprint,
      p_action: action,
      p_max: max,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
