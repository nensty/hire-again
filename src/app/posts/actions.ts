"use server";
import { redirect } from "next/navigation";
import { revalidateTag, revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";
import { postSchema } from "@/lib/posts";
import type { ActionState } from "@/lib/action-types";
export async function savePost(
  id: string | null,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isDemo())
    return { message: "Sharing is disabled in the fictional preview." };
  const parsed = postSchema.safeParse({
    ...Object.fromEntries(form),
    skills: String(form.get("skills") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    confirmation: form.get("confirmation") === "on",
  });
  if (!parsed.success)
    return {
      message: "Please check the highlighted details.",
      errors: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), [i.message]]),
      ),
    };
  if (id && !z.uuid().safeParse(id).success)
    return { message: "We couldn’t find that post." };
  const client = await supabaseServer();
  if (!client)
    return { message: "Sharing isn’t connected yet. Please come back soon." };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { message: "Please sign in again to share this post." };
  const { confirmation: _, ...values } = parsed.data;
  void _;
  const query = id
    ? client
        .from("community_posts")
        .update(values)
        .eq("id", id)
        .eq("owner_id", user.id)
    : client.from("community_posts").insert({ ...values, owner_id: user.id });
  const { data, error } = await query.select("id").single();
  if (error || !data)
    return {
      message:
        error?.code === "23505"
          ? "That post is already in the collection. You can find it in Posts."
          : "We couldn’t save this post. Please try again.",
    };
  revalidateTag("posts", { expire: 0 });
  revalidatePath("/manage");
  redirect(id ? "/manage?notice=saved" : "/?view=posts&shared=1#directory");
}
export async function changePost(form: FormData) {
  const parsed = z
    .object({
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
  const { id, action } = parsed.data;
  const query =
    action === "delete"
      ? client.from("community_posts").delete()
      : client
          .from("community_posts")
          .update(
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
  revalidateTag("posts", { expire: 0 });
  revalidatePath("/manage");
  redirect(
    `/manage?notice=${action === "delete" ? "deleted" : action === "renew" ? "renewed" : "saved"}`,
  );
}

export async function importPosts(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (isDemo())
    return { message: "Sharing is disabled in the fictional preview." };
  if (form.get("confirmation") !== "on")
    return { message: "Please confirm these are publicly shared posts." };
  const raw = form.get("posts");
  if (typeof raw !== "string" || raw.length > 100000)
    return { message: "Paste up to 50 posts at a time." };
  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    return { message: "We couldn’t read that list. Please review it again." };
  }
  const parsed = z
    .array(postSchema)
    .min(1)
    .max(50)
    .safeParse(
      Array.isArray(rows)
        ? rows.map((r) => ({ ...r, confirmation: true }))
        : rows,
    );
  if (!parsed.success)
    return {
      message:
        "Some details need a quick check. Keep each name under 100 characters, role under 120, and use up to five skills.",
    };
  const client = await supabaseServer();
  if (!client)
    return { message: "Sharing isn’t connected yet. Please come back soon." };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { message: "Please sign in again to share these posts." };
  let saved = 0,
    duplicate = 0,
    failed = 0;
  for (const row of new Map(parsed.data.map((r) => [r.url, r])).values()) {
    const { confirmation: _, ...values } = row;
    void _;
    const { error } = await client
      .from("community_posts")
      .insert({ ...values, owner_id: user.id });
    if (!error) saved++;
    else if (error.code === "23505") duplicate++;
    else failed++;
  }
  if (saved) {
    revalidateTag("posts", { expire: 0 });
    revalidatePath("/manage");
  }
  return {
    message: `${saved} post${saved === 1 ? "" : "s"} shared.${duplicate ? ` ${duplicate} already in the collection.` : ""}${failed ? ` ${failed} couldn’t be saved; retrying will safely skip posts already shared.` : ""}`,
    success: failed === 0,
  };
}
