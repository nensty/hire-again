vi.mock("@/lib/privacy-hold", () => ({
  privacyHoldActive: () => false,
  PRIVACY_HOLD_MESSAGE: "Paused",
}));
import { beforeEach, describe, it, expect, vi } from "vitest";
import { demoPeople, demoRoles } from "../src/lib/demo";
const stubs = vi.hoisted(() => ({
  getUser: vi.fn(),
  otp: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  revalidate: vi.fn(),
  demo: false,
  client: true,
  allow: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () =>
    stubs.client
      ? {
          auth: {
            getUser: stubs.getUser,
            signInWithOtp: stubs.otp,
            signOut: stubs.signOut,
          },
          from: stubs.from,
        }
      : null,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ from: stubs.from }),
}));
vi.mock("@/lib/rate-limit", () => ({ allowAction: stubs.allow }));
vi.mock("@/lib/env", () => ({
  isDemo: () => stubs.demo,
  siteUrl: () => "https://example.com",
}));
vi.mock("next/cache", () => ({
  revalidateTag: stubs.revalidate,
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import {
  saveListing,
  changeListing,
  sendLogin,
  reportListing,
  signOut,
} from "../src/app/actions";
const state = { message: "" };
function candidateForm() {
  const p = demoPeople[0];
  const f = new FormData();
  for (const [k, v] of Object.entries(p)) {
    if (Array.isArray(v)) {
      if (k === "skills") f.set(k, v.join(","));
      else v.forEach((t) => f.append(k, t));
    } else if (v !== null) f.set(k, String(v));
  }
  f.set("consent", "on");
  f.set("relocation", "on");
  return f;
}
function query(result: { data: unknown; error: unknown }) {
  const q = {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };
  for (const key of [
    "insert",
    "update",
    "delete",
    "select",
    "eq",
    "gt",
  ] as const)
    q[key].mockReturnValue(q);
  q.single.mockResolvedValue(result);
  q.maybeSingle.mockResolvedValue(result);
  q.then.mockImplementation((resolve: (r: typeof result) => unknown) =>
    Promise.resolve(result).then(resolve),
  );
  stubs.from.mockReturnValue(q);
  return q;
}
beforeEach(() => {
  vi.clearAllMocks();
  stubs.demo = false;
  stubs.client = true;
  stubs.getUser.mockResolvedValue({ data: { user: { id: "owner-123" } } });
  stubs.otp.mockResolvedValue({ error: null });
  stubs.allow.mockResolvedValue(true);
});
describe("publishing and ownership boundaries", () => {
  it("validates on the server before writing and retains readable errors", async () => {
    const f = candidateForm();
    f.delete("consent");
    expect(
      (await saveListing("candidate", null, state, f)).errors?.consent,
    ).toBeTruthy();
    expect(stubs.from).not.toHaveBeenCalled();
  });
  it("uses the authenticated owner and stable random readable slug on insert", async () => {
    const q = query({ data: { slug: "alex-morgan-12345678" }, error: null });
    await expect(
      saveListing("candidate", null, state, candidateForm()),
    ).rejects.toThrow(
      "redirect:/published?kind=candidate&slug=alex-morgan-12345678",
    );
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "owner-123",
        slug: expect.stringMatching(/^alex-morgan-[a-f0-9]{8}$/),
        linkedin_url: "https://www.linkedin.com/",
      }),
    );
    expect(q.insert.mock.calls[0][0]).not.toHaveProperty("consent");
    expect(stubs.revalidate).toHaveBeenCalled();
  });
  it("edits only matching owner/id and never replaces slug or expiry", async () => {
    const q = query({ data: { slug: "stable-slug" }, error: null });
    await expect(
      saveListing("candidate", demoPeople[0].id, state, candidateForm()),
    ).rejects.toThrow("redirect:/manage?notice=saved");
    expect(q.eq).toHaveBeenCalledWith("owner_id", "owner-123");
    expect(q.eq).toHaveBeenCalledWith("id", demoPeople[0].id);
    expect(q.update.mock.calls[0][0]).not.toHaveProperty("slug");
    expect(q.update.mock.calls[0][0]).not.toHaveProperty("expires_at");
  });
  it("gives a useful duplicate-profile state and refuses expired sessions", async () => {
    query({ data: null, error: { code: "23505" } });
    expect(
      (await saveListing("candidate", null, state, candidateForm())).message,
    ).toContain("already have a profile");
    stubs.getUser.mockResolvedValue({ data: { user: null } });
    expect(
      (await saveListing("candidate", null, state, candidateForm())).message,
    ).toContain("session has ended");
  });
  it("bounds every management mutation by owner, rejects missing rows, and supports delete", async () => {
    const q = query({ data: [{ id: demoRoles[0].id }], error: null });
    const f = new FormData();
    f.set("kind", "role");
    f.set("id", demoRoles[0].id);
    f.set("action", "hide");
    await expect(changeListing(f)).rejects.toThrow(
      "redirect:/manage?notice=saved",
    );
    expect(q.update).toHaveBeenCalledWith({ status: "hidden" });
    expect(q.eq).toHaveBeenCalledWith("owner_id", "owner-123");
    f.set("action", "delete");
    await expect(changeListing(f)).rejects.toThrow(
      "redirect:/manage?notice=deleted",
    );
    expect(q.delete).toHaveBeenCalled();
    query({ data: [], error: null });
    await expect(changeListing(f)).rejects.toThrow(
      "redirect:/manage?notice=error",
    );
  });
  it("blocks all preview writes", async () => {
    stubs.demo = true;
    expect(
      (await saveListing("candidate", null, state, candidateForm())).message,
    ).toContain("disabled");
    expect(stubs.from).not.toHaveBeenCalled();
  });
});
describe("authentication and reports", () => {
  it("sends passwordless email with a contained redirect, without exposing account state", async () => {
    const f = new FormData();
    f.set("email", "fictional@example.invalid");
    f.set("next", "//evil.com");
    expect((await sendLogin(state, f)).sent).toBe(true);
    expect(stubs.otp).toHaveBeenCalledWith({
      email: "fictional@example.invalid",
      options: {
        emailRedirectTo: "https://example.com/auth/callback?next=%2Fmanage",
      },
    });
    stubs.otp.mockResolvedValue({ error: { message: "raw provider failure" } });
    const result = await sendLogin(state, f);
    expect(result.message).not.toContain("raw provider");
    expect(result.sent).toBeUndefined();
  });
  it("handles disconnected sign-in and signs out through Supabase", async () => {
    stubs.client = false;
    const f = new FormData();
    f.set("email", "fictional@example.invalid");
    expect((await sendLogin(state, f)).message).toContain("isn’t connected");
    stubs.client = true;
    await expect(signOut()).rejects.toThrow("redirect:/");
    expect(stubs.signOut).toHaveBeenCalled();
  });
  it("requires a valid reason, rate limit, and a public record before reporting", async () => {
    const f = new FormData();
    f.set("entity_type", "candidate");
    f.set("entity_id", demoPeople[0].id);
    f.set("reason", "Other");
    stubs.allow.mockResolvedValue(false);
    expect((await reportListing(state, f)).success).toBeUndefined();
    expect(stubs.from).not.toHaveBeenCalled();
    stubs.allow.mockResolvedValue(true);
    const q = query({ data: { id: demoPeople[0].id }, error: null });
    expect((await reportListing(state, f)).success).toBe(true);
    expect(q.eq).toHaveBeenCalledWith("status", "active");
    expect(q.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(q.insert).toHaveBeenCalledWith({
      entity_type: "candidate",
      entity_id: demoPeople[0].id,
      reason: "Other",
    });
  });
});
