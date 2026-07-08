import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  isStaffAuthenticated: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({
  getStore: vi.fn(),
}));

import { GET } from "@/app/api/submissions/route";
import { isStaffAuthenticated } from "@/lib/auth";
import { getStore } from "@/lib/storage";

describe("GET /api/submissions", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(isStaffAuthenticated).mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with submissions and the active backend when authenticated", async () => {
    vi.mocked(isStaffAuthenticated).mockResolvedValue(true);
    const list = vi.fn().mockResolvedValue([{ id: "1" }]);
    vi.mocked(getStore).mockReturnValue({
      list,
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });

    const res = await GET();
    const data = (await res.json()) as { submissions: unknown; backend: string };
    expect(res.status).toBe(200);
    expect(data.submissions).toEqual([{ id: "1" }]);
    expect(data.backend).toBe("local-json");
  });

  it("returns 500 when the store throws", async () => {
    vi.mocked(isStaffAuthenticated).mockResolvedValue(true);
    vi.mocked(getStore).mockReturnValue({
      list: vi.fn().mockRejectedValue(new Error("boom")),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
