import { beforeEach, describe, it, expect, vi } from "vitest";
const stubs = vi.hoisted(() => ({
  user: vi.fn(),
  from: vi.fn(),
  demo: false,
  client: true,
  revalidate: vi.fn(),
  admin: vi.fn(),
  guestFrom: vi.fn(),
  allow: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ isDemo: () => stubs.demo }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () =>
    stubs.client ? { auth: { getUser: stubs.user }, from: stubs.from } : null,
}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: stubs.admin }));
vi.mock("@/lib/rate-limit", () => ({ allowAction: stubs.allow }));
vi.mock("next/cache", () => ({
  revalidateTag: stubs.revalidate,
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error(`redirect:${p}`);
  },
}));
import { savePost, changePost, importPosts } from "../src/app/posts/actions";
const id = "10000000-0000-4000-8000-000000000001",
  state = { message: "" };
function query(result: { data: unknown; error: unknown }) {
  const q = {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  };
  for (const k of ["insert", "update", "delete", "eq", "select"] as const)
    q[k].mockReturnValue(q);
  q.single.mockResolvedValue(result);
  q.then.mockImplementation((resolve: (r: typeof result) => unknown) =>
    Promise.resolve(result).then(resolve),
  );
  stubs.from.mockReturnValue(q);
  return q;
}
function form() {
  const f = new FormData();
  f.set("url", "https://lnkd.in/p/test-link?utm_source=share");
  f.set("kind", "community");
  f.set("confirmation", "on");
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  stubs.demo = false;
  stubs.client = true;
  stubs.user.mockResolvedValue({ data: { user: { id: "owner-1" } } });
  stubs.admin.mockImplementation(() => ({ from: stubs.guestFrom }));
  stubs.allow.mockResolvedValue(true);
});
describe("post write boundaries", () => {
  it("needs explicit public-post confirmation before writing", async () => {
    const f = form();
    f.delete("confirmation");
    expect((await savePost(null, state, f)).errors?.confirmation).toBeTruthy();
    expect(stubs.from).not.toHaveBeenCalled();
  });
  it("stores normalized source URLs and the authenticated owner without scraping metadata", async () => {
    const q = query({ data: { id }, error: null });
    await expect(savePost(null, state, form())).rejects.toThrow(
      "redirect:/?view=posts&shared=1#directory",
    );
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://lnkd.in/p/test-link",
        owner_id: "owner-1",
        author_name: null,
        title: "Shared LinkedIn post",
      }),
    );
    expect(q.insert.mock.calls[0][0]).not.toHaveProperty("confirmation");
  });
  it("edits and removes only the authenticated owner’s records", async () => {
    const q = query({ data: { id }, error: null });
    await expect(savePost(id, state, form())).rejects.toThrow(
      "redirect:/manage?notice=saved",
    );
    expect(q.eq).toHaveBeenCalledWith("owner_id", "owner-1");
    const f = new FormData();
    f.set("id", id);
    f.set("action", "delete");
    q.then.mockImplementation((resolve: (r: unknown) => unknown) =>
      Promise.resolve({ data: [{ id }], error: null }).then(resolve),
    );
    await expect(changePost(f)).rejects.toThrow(
      "redirect:/manage?notice=deleted",
    );
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", id);
  });
  it("handles duplicate URLs, expired sessions and disconnected services calmly", async () => {
    query({ data: null, error: { code: "23505" } });
    expect((await savePost(null, state, form())).message).toContain(
      "already in the collection",
    );
    stubs.user.mockResolvedValue({ data: { user: null } });
    expect((await savePost(id, state, form())).message).toContain(
      "sign in again",
    );
    stubs.client = false;
    expect((await savePost(null, state, form())).message).toContain(
      "isn’t connected",
    );
  });
  it("blocks demo writes and malformed identifiers", async () => {
    stubs.demo = true;
    expect((await savePost(null, state, form())).message).toContain("disabled");
    stubs.demo = false;
    expect((await savePost("bad-id", state, form())).message).toContain(
      "couldn’t find",
    );
    expect(stubs.from).not.toHaveBeenCalled();
  });
  it("imports a reviewed list with per-record ownership, accurate duplicate counts, and safe retry feedback", async () => {
    const q = query({ data: null, error: null });
    q.then
      .mockImplementationOnce((resolve: (r: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve),
      )
      .mockImplementationOnce((resolve: (r: unknown) => unknown) =>
        Promise.resolve({ error: { code: "23505" } }).then(resolve),
      )
      .mockImplementationOnce((resolve: (r: unknown) => unknown) =>
        Promise.resolve({ error: { code: "network" } }).then(resolve),
      );
    const f = new FormData();
    f.set("confirmation", "on");
    f.set(
      "posts",
      JSON.stringify(
        ["one", "two", "three"].map((x) => ({
          url: `https://lnkd.in/p/${x}`,
          kind: "community",
          skills: [],
        })),
      ),
    );
    const result = await importPosts(state, f);
    expect(result.message).toContain("1 post shared.");
    expect(result.message).toContain("1 already");
    expect(result.message).toContain("1 couldn’t be saved");
    expect(result.success).toBe(false);
    expect(q.insert).toHaveBeenCalledTimes(3);
    expect(
      q.insert.mock.calls.every(([row]) => row.owner_id === "owner-1"),
    ).toBe(true);
    expect(stubs.revalidate).toHaveBeenCalledWith("posts", { expire: 0 });
  });
  it("rejects missing confirmation, oversized lists, and malformed bulk payloads before writes", async () => {
    const f = new FormData();
    f.set("posts", "[]");
    expect((await importPosts(state, f)).message).toContain("confirm");
    f.set("confirmation", "on");
    f.set("posts", "invalid");
    expect((await importPosts(state, f)).message).toContain("couldn’t read");
    f.set(
      "posts",
      JSON.stringify(
        Array(51).fill({
          url: "https://lnkd.in/p/test",
          kind: "community",
          skills: [],
        }),
      ),
    );
    expect((await importPosts(state, f)).message).toContain("details");
    expect(stubs.from).not.toHaveBeenCalled();
  });
});

describe("guest sharing without exposing database privileges", () => {
  beforeEach(() => stubs.user.mockResolvedValue({ data: { user: null } }));
  function guestQuery() {
    const q = query({ data: { id }, error: null });
    stubs.from.mockReset();
    stubs.guestFrom.mockReturnValue(q);
    return q;
  }
  function bulk(count: number) {
    const f = new FormData();
    f.set("confirmation", "on");
    f.set(
      "posts",
      JSON.stringify(
        Array.from({ length: count }, (_, i) => ({
          url: `https://lnkd.in/p/guest-${i}`,
          kind: "community",
          skills: [],
        })),
      ),
    );
    return f;
  }
  it("creates only an ownerless validated link after quota approval, ignoring forged identity and status fields", async () => {
    const q = guestQuery();
    const f = form();
    f.set("owner_id", "attacker");
    f.set("status", "hidden");
    f.set("expires_at", "2099-01-01");
    await expect(savePost(null, state, f)).rejects.toThrow(
      "redirect:/?view=posts&shared=guest#directory",
    );
    expect(stubs.allow).toHaveBeenCalledWith("guest-post", 5);
    expect(stubs.from).not.toHaveBeenCalled();
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: null,
        url: "https://lnkd.in/p/test-link",
      }),
    );
    expect(q.insert.mock.calls[0][0]).not.toHaveProperty("status");
    expect(q.insert.mock.calls[0][0]).not.toHaveProperty("expires_at");
    expect(q.update).not.toHaveBeenCalled();
  });
  it("never gives a guest privileged edit or deletion access", async () => {
    expect((await savePost(id, state, form())).message).toContain(
      "sign in again",
    );
    const f = new FormData();
    f.set("id", id);
    f.set("action", "delete");
    await expect(changePost(f)).rejects.toThrow("redirect:/login");
    expect(stubs.admin).not.toHaveBeenCalled();
    expect(stubs.guestFrom).not.toHaveBeenCalled();
  });
  it("blocks honeypots, unavailable service credentials, and rejected quota before inserts", async () => {
    const f = form();
    f.set("website_confirm", "bot");
    expect((await savePost(null, state, f)).message).toContain(
      "couldn’t share",
    );
    const b = bulk(1);
    b.set("website_confirm", "bot");
    expect((await importPosts(state, b)).message).toContain("couldn’t share");
    expect(stubs.admin).not.toHaveBeenCalled();
    stubs.admin.mockImplementationOnce(() => {
      throw new Error("Not configured");
    });
    expect((await savePost(null, state, form())).message).toContain(
      "isn’t connected",
    );
    stubs.allow.mockResolvedValue(false);
    expect((await savePost(null, state, form())).message).toContain(
      "hourly limit",
    );
    expect(stubs.guestFrom).not.toHaveBeenCalled();
  });
  it("meters every link in a guest list and reports partial saves without erasing the review", async () => {
    const q = guestQuery();
    stubs.allow.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const result = await importPosts(state, bulk(3));
    expect(result.success).toBe(false);
    expect(result.message).toContain("1 post shared.");
    expect(result.message).toContain("2 couldn’t be saved");
    expect(result.message).toContain("hourly limit");
    expect(q.insert).toHaveBeenCalledTimes(1);
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: null }),
    );
    expect(stubs.allow).toHaveBeenCalledTimes(2);
  });
  it("rejects larger guest lists before invoking privileged writes", async () => {
    expect((await importPosts(state, bulk(6))).message).toContain(
      "up to 5 posts",
    );
    expect(stubs.admin).not.toHaveBeenCalled();
    expect(stubs.allow).not.toHaveBeenCalled();
  });
});
