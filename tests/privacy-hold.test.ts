import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const stubs = vi.hoisted(() => ({
  server: vi.fn(),
  admin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  send: vi.fn(),
  create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: stubs.server }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: stubs.admin }));
vi.mock("@supabase/supabase-js", () => ({ createClient: stubs.create }));
vi.mock("@/lib/rate-limit", () => ({ allowAction: vi.fn() }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: stubs.send };
  },
}));
import { privacyHoldActive } from "../src/lib/privacy-hold";
import { getDirectory } from "../src/lib/data";
import { getPosts } from "../src/lib/post-data";
import { saveListing, changeListing } from "../src/app/actions";
import { savePost, importPosts, changePost } from "../src/app/posts/actions";
import { actOnReminder } from "../src/app/renew/actions";
import { GET } from "../src/app/api/cron/route";
import { makeToken } from "../src/lib/tokens";
const id = "10000000-0000-4000-8000-000000000001";
const secret = "s".repeat(32);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("CRON_SECRET", secret);
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.invalid");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("EMAIL_FROM", "test@example.invalid");
  stubs.server.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from: stubs.from,
  });
  stubs.admin.mockReturnValue({ rpc: stubs.rpc, from: stubs.from });
  stubs.rpc.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
function form(action: string, kind?: string) {
  const f = new FormData();
  f.set("id", id);
  f.set("action", action);
  if (kind) f.set("kind", kind);
  return f;
}
function query() {
  const q = {
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    select: vi.fn(),
  };
  q.update.mockReturnValue(q);
  q.delete.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.neq.mockReturnValue(q);
  q.select.mockResolvedValue({ data: [{ id }], error: null });
  stubs.from.mockReturnValue(q);
  return q;
}
describe("default privacy hold", () => {
  it("returns no public data, even in demo mode, before consulting caches or the database", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(privacyHoldActive()).toBe(true);
    const [d, p] = await Promise.all([getDirectory(), getPosts()]);
    expect(d.people).toEqual([]);
    expect(d.roles).toEqual([]);
    expect(p.posts).toEqual([]);
    expect(stubs.server).not.toHaveBeenCalled();
    expect(stubs.create).not.toHaveBeenCalled();
  });
  it("blocks profile, role, single-post and bulk submissions before any database access", async () => {
    for (const result of [
      await saveListing("candidate", null, { message: "" }, new FormData()),
      await saveListing("role", id, { message: "" }, new FormData()),
      await savePost(null, { message: "" }, new FormData()),
      await savePost(id, { message: "" }, new FormData()),
      await importPosts({ message: "" }, new FormData()),
    ])
      expect(result.message).toContain("paused");
    expect(stubs.server).not.toHaveBeenCalled();
    expect(stubs.admin).not.toHaveBeenCalled();
  });
  it("rejects show/renew through direct action calls, including signed reminder links", async () => {
    for (const action of ["show", "renew"]) {
      await expect(changeListing(form(action, "candidate"))).rejects.toThrow(
        "redirect:/manage?notice=paused",
      );
      await expect(changePost(form(action))).rejects.toThrow(
        "redirect:/manage?notice=paused",
      );
    }
    const f = form("renew");
    f.set(
      "token",
      makeToken(
        {
          kind: "candidate",
          id,
          version: "2026-11-20T00:00:00Z",
          until: Date.now() + 86400000,
        },
        secret,
      ),
    );
    await expect(actOnReminder(f)).rejects.toThrow(
      "redirect:/manage?notice=paused",
    );
    expect(stubs.server).not.toHaveBeenCalled();
    expect(stubs.admin).not.toHaveBeenCalled();
  });
  it("preserves owner-checked hide and delete operations", async () => {
    for (const action of ["hide", "delete"]) {
      let q = query();
      await expect(changeListing(form(action, "candidate"))).rejects.toThrow(
        /redirect:\/manage\?notice=/,
      );
      expect(q.eq).toHaveBeenCalledWith("owner_id", "owner");
      q = query();
      await expect(changePost(form(action))).rejects.toThrow(
        /redirect:\/manage\?notice=/,
      );
      expect(q.eq).toHaveBeenCalledWith("owner_id", "owner");
    }
  });
  it("keeps retention cleanup but does not claim reminders or send automatic emails", async () => {
    const response = await GET(
      new NextRequest("https://example.invalid/api/cron", {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      cleanup: true,
      reminders: "paused",
    });
    expect(stubs.rpc).toHaveBeenCalledTimes(1);
    expect(stubs.rpc).toHaveBeenCalledWith("retention_cleanup");
    expect(stubs.send).not.toHaveBeenCalled();
  });
});
