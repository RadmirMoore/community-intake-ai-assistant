import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  clientIpFrom: vi.fn(() => "1.2.3.4"),
}));
vi.mock("@/lib/triage", () => ({
  triageIntake: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({
  getStore: vi.fn(),
}));

import { POST } from "@/app/api/intake/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { triageIntake } from "@/lib/triage";
import { getStore } from "@/lib/storage";
import type { Triage } from "@/lib/types";

const validBody = {
  fullName: "Jordan Rivera",
  message: "Looking for help finding a food pantry near me this week.",
  consent: true,
};

const fakeTriage: Triage = {
  category: "food",
  urgency: "medium",
  summary: "Requesting food pantry information.",
  suggestedFollowUp: "Thanks for reaching out.",
  recommendedActions: [],
  safetyFlags: [],
  requiresImmediateAttention: false,
  confidence: 0.8,
  model: "test-model",
  generatedByAI: true,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/intake", () => {
  const create = vi.fn();

  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(triageIntake).mockResolvedValue(fakeTriage);
    create.mockReset().mockResolvedValue({
      id: "1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      status: "new",
      input: validBody,
      triage: fakeTriage,
      staffNotes: "",
    });
    vi.mocked(getStore).mockReturnValue({
      create,
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
  });

  it("returns 201 and stores the submission on a valid request", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      input: expect.objectContaining({ fullName: "Jordan Rivera" }),
      triage: fakeTriage,
    });
  });

  it("returns 422 on an invalid body", async () => {
    const res = await POST(makeRequest({ fullName: "", message: "short" }));
    expect(res.status).toBe(422);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 429 with a Retry-After header when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 42 });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 500 when triage fails", async () => {
    vi.mocked(triageIntake).mockRejectedValue(new Error("boom"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it("validates against the submitted locale, returning Spanish error messages", async () => {
    const res = await POST(makeRequest({ ...validBody, message: "short", locale: "es" }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { issues: { fieldErrors: Record<string, string[]> } };
    expect(data.issues.fieldErrors.message?.[0]).toMatch(/Cuéntanos/);
  });

  it("falls back to English for an unrecognized locale", async () => {
    const res = await POST(makeRequest({ ...validBody, message: "short", locale: "fr" }));
    expect(res.status).toBe(422);
    const data = (await res.json()) as { issues: { fieldErrors: Record<string, string[]> } };
    expect(data.issues.fieldErrors.message?.[0]).toMatch(/Tell us a little more/);
  });
});
