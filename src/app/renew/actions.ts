"use server";
import { privacyHoldActive } from "@/lib/privacy-hold";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { verifyToken } from "@/lib/tokens";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ENTITY_TABLE } from "@/lib/constants";
export async function actOnReminder(form: FormData) {
  const payload = verifyToken(
    String(form.get("token") || ""),
    process.env.CRON_SECRET || "",
  );
  const action = form.get("action");
  if (!payload || !["renew", "hide"].includes(String(action)))
    redirect("/renew?result=invalid");
  if (privacyHoldActive() && action !== "hide")
    redirect("/manage?notice=paused");
  const update =
    action === "hide"
      ? { status: "hidden" }
      : {
          status: "active",
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
  const { data, error } = await supabaseAdmin()
    .from(ENTITY_TABLE[payload.kind])
    .update(update)
    .eq("id", payload.id)
    .eq("expires_at", payload.version)
    .neq("status", "closed")
    .select("id");
  if (error || !data?.length) redirect("/renew?result=invalid");
  revalidateTag("directory", { expire: 0 });
  redirect(`/renew?result=${action === "hide" ? "hidden" : "renewed"}`);
}
