import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  clientIpFrom: vi.fn(() => "1.2.3.4"),
}));
vi.mock("@/lib/storage", () => ({
  getStore: vi.fn(),
}));

import { GET } from "@/app/api/status/[id]/route";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/storage";
import type { Submission } from "@/lib/types";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req() {
  return new Request("http://localhost/api/status/1");
}

function mockStore(get: (id: string) => Promise<Submission | null>) {
  vi.mocked(getStore).mockReturnValue({
    get,
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    backend: "local-json",
  });
}

const baseSubmission: Submission = {
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  status: "in_review",
  input: {
    fullName: "Jordan Rivera",
    email: "jordan@example.com",
    phone: "555-0100",
    preferredContact: "either",
    zipCode: "94110",
    message: "Looking for help finding a food pantry near me.",
    consent: true,
  },
  triage: {
    category: "food",
    urgency: "medium",
    summary: "Requesting food pantry information.",
    suggestedFollowUp: "Thanks for reaching out.",
    recommendedActions: ["Share food pantry hours."],
    safetyFlags: ["Some internal safety note"],
    requiresImmediateAttention: false,
    confidence: 0.8,
    model: "claude-sonnet-5",
    generatedByAI: true,
  },
  staffNotes: "Called back, left a voicemail.",
  reviewedBy: "Alicia",
};

describe("GET /api/status/[id]", () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    // Anchor "now" at the fixture's createdAt so the link-expiry check below
    // doesn't make every other test in this file start failing once real
    // wall-clock time drifts more than 90 days past that fixed timestamp.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseSubmission.createdAt));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the exact same 404 shape for a missing id and a malformed id", async () => {
    mockStore(vi.fn().mockResolvedValue(null));
    const missingRes = await GET(req(), ctx("00000000-0000-0000-0000-000000000000"));
    const missingBody = await missingRes.json();

    mockStore(vi.fn().mockRejectedValue(new Error('invalid input syntax for type uuid: "not-a-uuid"')));
    const malformedRes = await GET(req(), ctx("not-a-uuid"));
    const malformedBody = await malformedRes.json();

    expect(missingRes.status).toBe(404);
    expect(malformedRes.status).toBe(404);
    expect(malformedBody).toEqual(missingBody);
  });

  it("returns status and a null reply when nothing has been published", async () => {
    mockStore(vi.fn().mockResolvedValue(baseSubmission));
    const res = await GET(req(), ctx("1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      status: "in_review",
      createdAt: baseSubmission.createdAt,
      reply: null,
    });
  });

  it("returns the published reply when one exists", async () => {
    mockStore(
      vi.fn().mockResolvedValue({
        ...baseSubmission,
        publishedReply: {
          message: "Here's an update on your request.",
          publishedAt: "2026-01-02T00:00:00.000Z",
          publishedBy: "Alicia",
        },
      }),
    );
    const res = await GET(req(), ctx("1"));
    const body = await res.json();

    expect(body.reply).toEqual({
      message: "Here's an update on your request.",
      publishedAt: "2026-01-02T00:00:00.000Z",
    });
  });

  it("never exposes the original message, contact info, staff notes, triage internals, or who reviewed/published it", async () => {
    mockStore(
      vi.fn().mockResolvedValue({
        ...baseSubmission,
        publishedReply: {
          message: "Reply text",
          publishedAt: "2026-01-02T00:00:00.000Z",
          publishedBy: "Alicia",
        },
      }),
    );
    const res = await GET(req(), ctx("1"));
    const body = await res.json();

    expect(body).not.toHaveProperty("input");
    expect(body).not.toHaveProperty("staffNotes");
    expect(body).not.toHaveProperty("triage");
    expect(body).not.toHaveProperty("reviewedBy");
    expect(body.reply).not.toHaveProperty("publishedBy");
  });

  it("sets Cache-Control: no-store", async () => {
    mockStore(vi.fn().mockResolvedValue(baseSubmission));
    const res = await GET(req(), ctx("1"));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 429 with a Retry-After header when rate-limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const res = await GET(req(), ctx("1"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("uses a looser rate limit than the other public routes", async () => {
    mockStore(vi.fn().mockResolvedValue(baseSubmission));
    await GET(req(), ctx("1"));
    expect(checkRateLimit).toHaveBeenCalledWith("status:1.2.3.4", 30, 10 * 60 * 1000);
  });

  it("still works just under the 90-day link expiry", async () => {
    mockStore(vi.fn().mockResolvedValue(baseSubmission));
    vi.setSystemTime(new Date(baseSubmission.createdAt).getTime() + 89 * 24 * 60 * 60 * 1000);
    const res = await GET(req(), ctx("1"));
    expect(res.status).toBe(200);
  });

  it("404s the same way as a nonexistent id once the link is past the 90-day expiry", async () => {
    mockStore(vi.fn().mockResolvedValue(null));
    const missingRes = await GET(req(), ctx("00000000-0000-0000-0000-000000000000"));
    const missingBody = await missingRes.json();

    mockStore(vi.fn().mockResolvedValue(baseSubmission));
    vi.setSystemTime(new Date(baseSubmission.createdAt).getTime() + 91 * 24 * 60 * 60 * 1000);
    const expiredRes = await GET(req(), ctx("1"));
    const expiredBody = await expiredRes.json();

    expect(expiredRes.status).toBe(404);
    expect(expiredBody).toEqual(missingBody);
  });
});
