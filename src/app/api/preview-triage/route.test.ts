import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  clientIpFrom: vi.fn(() => "1.2.3.4"),
}));
vi.mock("@/lib/triage", () => ({
  triageIntake: vi.fn(),
}));

import { POST } from "@/app/api/preview-triage/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { triageIntake } from "@/lib/triage";
import type { Triage } from "@/lib/types";

const fakeTriage: Triage = {
  category: "housing",
  urgency: "medium",
  summary: "Requesting help with a lease non-renewal.",
  suggestedFollowUp: "Thanks for reaching out.",
  recommendedActions: [],
  safetyFlags: [],
  requiresImmediateAttention: false,
  confidence: 0.8,
  model: "test-model",
  generatedByAI: true,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/preview-triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/preview-triage", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockReset().mockResolvedValue({ allowed: true });
    vi.mocked(triageIntake).mockReset().mockResolvedValue(fakeTriage);
  });

  it("returns 200 with the triage for a valid preset", async () => {
    const res = await POST(makeRequest({ presetId: "housing-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ triage: fakeTriage });
  });

  it("synthesizes a placeholder identity with consent, never the caller's data", async () => {
    await POST(makeRequest({ presetId: "housing-1" }));
    expect(triageIntake).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Demo Visitor",
        consent: true,
        message: expect.stringContaining("landlord"),
      }),
    );
  });

  it("rejects an unknown presetId without calling triageIntake", async () => {
    const res = await POST(makeRequest({ presetId: "not-a-real-preset" }));
    expect(res.status).toBe(400);
    expect(triageIntake).not.toHaveBeenCalled();
  });

  it("rejects a request that sends free-text message instead of a presetId", async () => {
    const res = await POST(makeRequest({ message: "anything a caller wants to run through Claude" }));
    expect(res.status).toBe(400);
    expect(triageIntake).not.toHaveBeenCalled();
  });

  it("returns 429 with a Retry-After header when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 120 });
    const res = await POST(makeRequest({ presetId: "housing-1" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(triageIntake).not.toHaveBeenCalled();
  });

  it("uses a stricter rate limit than the real intake endpoint", async () => {
    await POST(makeRequest({ presetId: "housing-1" }));
    expect(checkRateLimit).toHaveBeenCalledWith("1.2.3.4", 3, 10 * 60 * 1000);
  });

  it("returns 500 when triage fails", async () => {
    vi.mocked(triageIntake).mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest({ presetId: "housing-1" }));
    expect(res.status).toBe(500);
  });

  it("never imports @/lib/storage", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(
      path.join(process.cwd(), "src/app/api/preview-triage/route.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/@\/lib\/storage/);
  });
});
