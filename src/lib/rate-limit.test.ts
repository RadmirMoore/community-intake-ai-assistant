import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientIpFrom, resetRateLimiter } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows requests under the limit", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit("ip-1", 5)).allowed).toBe(true);
    }
  });

  it("blocks the request over the limit and reports retry time", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit("ip-2", 3);
    const result = await checkRateLimit("ip-2", 3);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks clients independently", async () => {
    for (let i = 0; i < 3; i++) await checkRateLimit("ip-3", 3);
    expect((await checkRateLimit("ip-3", 3)).allowed).toBe(false);
    expect((await checkRateLimit("ip-4", 3)).allowed).toBe(true);
  });

  it("frees the window once old hits expire", async () => {
    expect((await checkRateLimit("ip-5", 1, 0)).allowed).toBe(true);
    // windowMs of 0 means the previous hit is already outside the window
    expect((await checkRateLimit("ip-5", 1, 0)).allowed).toBe(true);
  });

  it("keeps different routes from the same IP in separate buckets when the caller scopes the key", async () => {
    // clientId is an opaque bucket key shared verbatim across every caller —
    // callers must prefix it per-route (e.g. `intake:${ip}`) or two routes
    // hitting the same IP would silently share one counter and steal each
    // other's budget. This guards that contract, not just IP independence.
    const ip = "203.0.113.9";
    for (let i = 0; i < 3; i++) await checkRateLimit(`intake:${ip}`, 3);
    expect((await checkRateLimit(`intake:${ip}`, 3)).allowed).toBe(false);
    expect((await checkRateLimit(`status:${ip}`, 3)).allowed).toBe(true);
  });
});

describe("clientIpFrom", () => {
  it("uses the first hop of x-forwarded-for", () => {
    const request = new Request("http://localhost/api/intake", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientIpFrom(request)).toBe("203.0.113.7");
  });

  it("falls back to 'unknown' without the header", () => {
    const request = new Request("http://localhost/api/intake");
    expect(clientIpFrom(request)).toBe("unknown");
  });
});
