import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  isStaffAuthenticated: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({
  getStore: vi.fn(),
}));

import { DELETE, POST } from "@/app/api/submissions/[id]/reply/route";
import { isStaffAuthenticated } from "@/lib/auth";
import { getStore } from "@/lib/storage";
import type { Submission } from "@/lib/types";
import type { UpdateSubmissionArgs } from "@/lib/storage/store";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, body?: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/submissions/1/reply", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function mockStore(
  overrides: {
    update?: (id: string, args: UpdateSubmissionArgs) => Promise<Submission | null>;
  } = {},
) {
  vi.mocked(getStore).mockReturnValue({
    update: overrides.update ?? vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    backend: "local-json",
  });
}

beforeEach(() => {
  vi.mocked(isStaffAuthenticated).mockResolvedValue(true);
});

describe("POST /api/submissions/[id]/reply", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(isStaffAuthenticated).mockResolvedValue(false);
    const res = await POST(req("POST", { message: "Hi there" }), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("returns 422 on an empty message", async () => {
    const res = await POST(req("POST", { message: "" }), ctx("1"));
    expect(res.status).toBe(422);
  });

  it("returns 422 on a message over 4000 characters", async () => {
    const res = await POST(req("POST", { message: "x".repeat(4001) }), ctx("1"));
    expect(res.status).toBe(422);
  });

  it("publishes the reply with attribution from X-Staff-Name", async () => {
    const update = vi.fn().mockResolvedValue({ id: "1" });
    mockStore({ update });

    const res = await POST(
      req("POST", { message: "Here's an update on your request." }, { "X-Staff-Name": "Jordan" }),
      ctx("1"),
    );

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith("1", {
      publishedReply: expect.objectContaining({
        message: "Here's an update on your request.",
        publishedBy: "Jordan",
      }),
    });
  });

  it("returns 404 when the submission doesn't exist", async () => {
    mockStore({ update: vi.fn().mockResolvedValue(null) });
    const res = await POST(req("POST", { message: "Hi" }), ctx("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/submissions/[id]/reply", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(isStaffAuthenticated).mockResolvedValue(false);
    const res = await DELETE(req("DELETE"), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("clears the published reply to null", async () => {
    const update = vi.fn().mockResolvedValue({ id: "1", publishedReply: null });
    mockStore({ update });

    const res = await DELETE(req("DELETE"), ctx("1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith("1", { publishedReply: null, actor: undefined });
  });

  it("returns 404 when the submission doesn't exist", async () => {
    mockStore({ update: vi.fn().mockResolvedValue(null) });
    const res = await DELETE(req("DELETE"), ctx("missing"));
    expect(res.status).toBe(404);
  });
});
