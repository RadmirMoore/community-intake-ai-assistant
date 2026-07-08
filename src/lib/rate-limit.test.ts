import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientIpFrom, resetRateLimiter } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("ip-1", 5).allowed).toBe(true);
    }
  });

  it("blocks the request over the limit and reports retry time", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip-2", 3);
    const result = checkRateLimit("ip-2", 3);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks clients independently", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip-3", 3);
    expect(checkRateLimit("ip-3", 3).allowed).toBe(false);
    expect(checkRateLimit("ip-4", 3).allowed).toBe(true);
  });

  it("frees the window once old hits expire", () => {
    expect(checkRateLimit("ip-5", 1, 0).allowed).toBe(true);
    // windowMs of 0 means the previous hit is already outside the window
    expect(checkRateLimit("ip-5", 1, 0).allowed).toBe(true);
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
