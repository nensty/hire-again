"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl, isDemo } from "@/lib/env";
import {
  candidateSchema,
  roleSchema,
  loginSchema,
  formValues,
  safeNext,
  reportSchema,
} from "@/lib/validation";
import { ENTITY_TABLE, slugify, type EntityType } from "@/lib/constants";
import { allowAction } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/action-types";
export async function sendLogin(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: "Please check your email address.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  const client = await supabaseServer();
  if (!client || isDemo())
    return {
      message: "Email sign-in isn’t connected yet. Please come back soon.",
    };
  if (
    process.env.CRON_SECRET &&
    process.env.SUPABASE_SECRET_KEY &&
    !(await allowAction("login", 5))
  )
    return { message: "A few too many requests. Please try again later." };
  let result;
  try {
    result = await client.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(parsed.data.next))}`,
      },
    });
  } catch {
    return {
      message: "We couldn’t send your link. Please try again in a moment.",
    };
  }
  if (result.error)
    return {
      message:
        "We couldn’t send your link. Please wait a moment and try again.",
    };
  return {
    message:
      "Check your inbox. Your sign-in link is on its way. Open it in this browser to continue.",
    sent: true,
  };
}
export async function signOut() {
  const client = await supabaseServer();
  await client?.auth.signOut();
  redirect("/");
}
export async function saveListing(
  kind: EntityType,
  id: string | null,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!["candidate", "role"].includes(kind) || isDemo())
    return { message: "Publishing is disabled in the development preview." };
  const parsed = (
    kind === "candidate" ? candidateSchema : roleSchema
  ).safeParse(formValues(form));
  if (!parsed.success)
    return {
      message: "A few details need your attention.",
      errors: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), [i.message]]),
      ),
    };
  const client = await supabaseServer();
  if (!client)
    return {
      message: "Publishing isn’t connected yet. Please come back soon.",
    };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return { message: "Your session has ended. Sign in again to publish." };
  if (id && !z.uuid().safeParse(id).success)
    return { message: "We couldn’t find that listing." };
  const { consent: _consent, ...values } = parsed.data;
  void _consent;
  const title =
    "full_name" in values
      ? values.full_name
      : `${values.company_name}-${values.role_title}`;
  const slug = `${slugify(title)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
  let query;
  if (id)
    query = client
      .from(ENTITY_TABLE[kind])
      .update(values)
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("slug")
      .single();
  else
    query = client
      .from(ENTITY_TABLE[kind])
      .insert({ ...values, owner_id: user.id, slug })
      .select("slug")
      .single();
  const { data, error } = await query;
  if (error || !data)
    return {
      message:
        error?.code === "23505" && kind === "candidate"
          ? "You already have a profile. Open Manage listing to edit or renew it."
          : "We couldn’t save your listing. Please try again.",
    };
  revalidateTag("directory", { expire: 0 });
  revalidatePath("/manage");
  redirect(
    id
      ? "/manage?notice=saved"
      : `/published?kind=${kind}&slug=${encodeURIComponent(data.slug)}`,
  );
}
export async function changeListing(form: FormData) {
  const parsed = z
    .object({
      kind: z.enum(["candidate", "role"]),
      id: z.uuid(),
      action: z.enum(["hide", "show", "renew", "close", "delete"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || isDemo()) redirect("/manage?notice=error");
  const client = await supabaseServer();
  if (!client) redirect("/login");
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { kind, id, action } = parsed.data;
  const table = client.from(ENTITY_TABLE[kind]);
  const query =
    action === "delete"
      ? table.delete()
      : table.update(
          action === "hide"
            ? { status: "hidden" }
            : action === "close"
              ? { status: "closed" }
              : {
                  status: "active",
                  expires_at: new Date(
                    Date.now() + 30 * 86400000,
                  ).toISOString(),
                },
        );
  const { data, error } = await query
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id");
  if (error || !data?.length) redirect("/manage?notice=error");
  revalidateTag("directory", { expire: 0 });
  revalidatePath("/manage");
  redirect(
    `/manage?notice=${action === "delete" ? "deleted" : action === "renew" ? "renewed" : "saved"}`,
  );
}
export async function reportListing(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (form.get("website_confirm"))
    return {
      message: "Thank you. Your report has been received.",
      success: true,
    };
  const parsed = reportSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Choose a reason for your report." };
  if (isDemo())
    return { message: "Reports are disabled in the development preview." };
  if (!(await allowAction("report", 5)))
    return {
      message:
        "We couldn’t receive your report right now. Please try again later.",
    };
  const admin = supabaseAdmin();
  const { data: listing } = await admin
    .from(ENTITY_TABLE[parsed.data.entity_type])
    .select("id")
    .eq("id", parsed.data.entity_id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!listing) return { message: "This listing is no longer public." };
  const { error } = await admin.from("reports").insert(parsed.data);
  return error
    ? { message: "We couldn’t receive your report. Please try again." }
    : { message: "Thank you. Your report has been received.", success: true };
}
