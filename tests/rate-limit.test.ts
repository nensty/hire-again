import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const stubs = vi.hoisted(() => ({ headers: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: stubs.headers }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ rpc: stubs.rpc }),
}));
import { allowAction } from "../src/lib/rate-limit";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  vi.stubEnv("VERCEL", "1");
  stubs.headers.mockResolvedValue(
    new Headers({ "x-vercel-forwarded-for": "192.0.2.10" }),
  );
  stubs.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("durable rate limit boundaries", () => {
  it("uses a keyed hash of the edge address, ignoring spoofed forwarding headers", async () => {
    for (const address of ["198.51.100.1", "198.51.100.2"]) {
      stubs.headers.mockResolvedValue(
        new Headers({
          "x-vercel-forwarded-for": "192.0.2.10",
          "x-forwarded-for": address,
        }),
      );
      expect(await allowAction("guest-post", 5)).toBe(true);
    }
    const expected = {
      p_fingerprint: createHmac("sha256", "test-secret")
        .update("192.0.2.10")
        .digest("hex"),
      p_action: "guest-post",
      p_max: 5,
    };
    expect(stubs.rpc).toHaveBeenNthCalledWith(1, "consume_limit", expected);
    expect(stubs.rpc).toHaveBeenNthCalledWith(2, "consume_limit", expected);
  });
  it("shares a conservative bucket outside Vercel even when all forwarding headers are forged", async () => {
    vi.stubEnv("VERCEL", "");
    for (const address of ["198.51.100.1", "198.51.100.2"]) {
      stubs.headers.mockResolvedValue(
        new Headers({
          "x-vercel-forwarded-for": address,
          "x-forwarded-for": address,
        }),
      );
      expect(await allowAction("guest-post", 5)).toBe(true);
    }
    expect(stubs.rpc.mock.calls[0][1]).toEqual(stubs.rpc.mock.calls[1][1]);
  });
  it("fails closed for missing secrets, exhausted quotas, database errors, and network exceptions", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(await allowAction("guest-post", 5)).toBe(false);
    expect(stubs.rpc).not.toHaveBeenCalled();
    vi.stubEnv("CRON_SECRET", "test-secret");
    stubs.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await allowAction("guest-post", 5)).toBe(false);
    stubs.rpc.mockResolvedValueOnce({
      data: true,
      error: { code: "unavailable" },
    });
    expect(await allowAction("guest-post", 5)).toBe(false);
    stubs.rpc.mockRejectedValueOnce(new Error("network"));
    expect(await allowAction("guest-post", 5)).toBe(false);
  });
});
