import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";
export async function allowAction(action: string, max: number) {
  if (!process.env.CRON_SECRET || !process.env.SUPABASE_SECRET_KEY)
    return false;
  const h = await headers();
  // Vercel overwrites x-vercel-forwarded-for at the edge. Never store raw addresses.
  const address = (
    h.get("x-vercel-forwarded-for") ||
    h.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim();
  const fingerprint = createHmac("sha256", process.env.CRON_SECRET)
    .update(address)
    .digest("hex");
  const { data, error } = await supabaseAdmin().rpc("consume_limit", {
    p_fingerprint: fingerprint,
    p_action: action,
    p_max: max,
  });
  return !error && data === true;
}
