import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { demoPeople } from "../src/lib/demo";
import { makeToken, verifyToken } from "../src/lib/tokens";
const stubs = vi.hoisted(() => ({
  rpc: vi.fn(),
  send: vi.fn(),
  from: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ rpc: stubs.rpc, from: stubs.from }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: stubs.send };
  },
}));
vi.mock("@/lib/env", () => ({ siteUrl: () => "https://example.com" }));
vi.mock("next/cache", () => ({ revalidateTag: stubs.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import { GET } from "../src/app/api/cron/route";
import { actOnReminder } from "../src/app/renew/actions";
const secret = "s".repeat(32);
const expiry = "2026-11-20T12:00:00+00:00";
const delivery = {
  delivery_id: "delivery-1",
  entity_type: "candidate",
  entity_id: demoPeople[0].id,
  listing_expires_at: expiry,
  email: "fictional@example.invalid",
  title: "Engineer",
};
function request(auth = true) {
  return new NextRequest("https://example.com/api/cron", {
    headers: auth ? { authorization: `Bearer ${secret}` } : {},
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
  vi.stubEnv("CRON_SECRET", secret);
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  vi.stubEnv("RESEND_API_KEY", "test-only");
  vi.stubEnv("EMAIL_FROM", "Fictional <fictional@example.invalid>");
  stubs.send.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("secured lifecycle endpoint", () => {
  it("refuses unauthorized requests before any maintenance", async () => {
    const r = await GET(request(false));
    expect(r.status).toBe(401);
    expect(stubs.rpc).not.toHaveBeenCalled();
  });
  it("runs cleanup without email credentials and reports the missing integration", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    stubs.rpc.mockResolvedValue({ error: null });
    const r = await GET(request());
    expect(r.status).toBe(503);
    expect(stubs.rpc).toHaveBeenCalledWith("retention_cleanup");
    expect(stubs.send).not.toHaveBeenCalled();
  });
  it("uses durable claims and a stable provider idempotency key; acknowledges only after delivery", async () => {
    stubs.rpc
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ data: [delivery], error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const response = GET(request());
    await vi.advanceTimersByTimeAsync(600);
    const r = await response;
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ sent: 1, failed: 0, pending: false });
    expect(stubs.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: delivery.email,
        subject: "Still looking for your next team?",
      }),
      { idempotencyKey: "reminder/delivery-1" },
    );
    expect(stubs.rpc).toHaveBeenCalledWith("complete_reminder", {
      p_id: "delivery-1",
    });
    const text = stubs.send.mock.calls[0][0].text;
    const token = text.match(/https:\/\/example.com\/renew\?t=(\S+)/)[1];
    expect(verifyToken(token, secret)?.id).toBe(delivery.entity_id);
  });
  it("does not mark failed emails sent", async () => {
    stubs.rpc
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ data: [delivery], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    stubs.send.mockResolvedValue({ error: { name: "rate_limit_exceeded" } });
    const response = GET(request());
    await vi.advanceTimersByTimeAsync(600);
    const r = await response;
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ sent: 0, failed: 1 });
    expect(stubs.rpc).not.toHaveBeenCalledWith(
      "complete_reminder",
      expect.anything(),
    );
  });
});
describe("signed, versioned one-click listing controls", () => {
  it("rejects invalid bearer tokens without touching the database", async () => {
    const f = new FormData();
    f.set("token", "tampered");
    f.set("action", "renew");
    await expect(actOnReminder(f)).rejects.toThrow(
      "redirect:/renew?result=invalid",
    );
    expect(stubs.from).not.toHaveBeenCalled();
  });
  it("requires the exact expiry cycle and excludes closed records", async () => {
    const q = { update: vi.fn(), eq: vi.fn(), neq: vi.fn(), select: vi.fn() };
    q.update.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.neq.mockReturnValue(q);
    q.select.mockResolvedValue({
      data: [{ id: delivery.entity_id }],
      error: null,
    });
    stubs.from.mockReturnValue(q);
    const token = makeToken(
      {
        kind: "candidate",
        id: delivery.entity_id,
        version: expiry,
        until: Date.now() + 86400000,
      },
      secret,
    );
    const f = new FormData();
    f.set("token", token);
    f.set("action", "renew");
    await expect(actOnReminder(f)).rejects.toThrow(
      "redirect:/renew?result=renewed",
    );
    expect(q.eq).toHaveBeenCalledWith("expires_at", expiry);
    expect(q.eq).toHaveBeenCalledWith("id", delivery.entity_id);
    expect(q.neq).toHaveBeenCalledWith("status", "closed");
    expect(q.update).toHaveBeenCalledWith({
      status: "active",
      expires_at: "2026-11-19T12:00:00.000Z",
    });
    q.select.mockResolvedValue({ data: [], error: null });
    await expect(actOnReminder(f)).rejects.toThrow(
      "redirect:/renew?result=invalid",
    );
  });
});
