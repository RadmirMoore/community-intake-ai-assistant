import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  isStaffAuthenticated: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({
  getStore: vi.fn(),
}));

import { DELETE, GET, PATCH } from "@/app/api/submissions/[id]/route";
import { isStaffAuthenticated } from "@/lib/auth";
import { getStore } from "@/lib/storage";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, body?: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/submissions/1", {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(isStaffAuthenticated).mockResolvedValue(true);
});

describe("GET /api/submissions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(isStaffAuthenticated).mockResolvedValue(false);
    const res = await GET(req("GET"), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when missing", async () => {
    vi.mocked(getStore).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
    const res = await GET(req("GET"), ctx("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with the submission when found", async () => {
    vi.mocked(getStore).mockReturnValue({
      get: vi.fn().mockResolvedValue({ id: "1" }),
      create: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
    const res = await GET(req("GET"), ctx("1"));
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/submissions/[id]", () => {
  it("returns 422 on an invalid body", async () => {
    const res = await PATCH(req("PATCH", { status: "bogus" }), ctx("1"));
    expect(res.status).toBe(422);
  });

  it("returns 200 and passes the update through on a valid body", async () => {
    const update = vi.fn().mockResolvedValue({ id: "1", status: "resolved" });
    vi.mocked(getStore).mockReturnValue({
      update,
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
    const res = await PATCH(req("PATCH", { status: "resolved" }), ctx("1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith("1", { status: "resolved" });
  });

  it("passes the X-Staff-Name header through as the actor", async () => {
    const update = vi.fn().mockResolvedValue({ id: "1", status: "resolved", reviewedBy: "Jordan" });
    vi.mocked(getStore).mockReturnValue({
      update,
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
    const res = await PATCH(
      req("PATCH", { status: "resolved" }, { "X-Staff-Name": "  Jordan  " }),
      ctx("1"),
    );
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith("1", { status: "resolved", actor: "Jordan" });
  });

  it("ignores a missing staff-name header", async () => {
    const update = vi.fn().mockResolvedValue({ id: "1", status: "resolved" });
    vi.mocked(getStore).mockReturnValue({
      update,
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
    await PATCH(req("PATCH", { status: "resolved" }), ctx("1"));
    expect(update).toHaveBeenCalledWith("1", { status: "resolved", actor: undefined });
  });

  it("returns 404 when the submission doesn't exist", async () => {
    vi.mocked(getStore).mockReturnValue({
      update: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      backend: "local-json",
    });
    const res = await PATCH(req("PATCH", { status: "resolved" }), ctx("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/submissions/[id]", () => {
  it("returns 200 ok when deleted", async () => {
    vi.mocked(getStore).mockReturnValue({
      delete: vi.fn().mockResolvedValue(true),
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      backend: "local-json",
    });
    const res = await DELETE(req("DELETE"), ctx("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 404 when not found", async () => {
    vi.mocked(getStore).mockReturnValue({
      delete: vi.fn().mockResolvedValue(false),
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      backend: "local-json",
    });
    const res = await DELETE(req("DELETE"), ctx("missing"));
    expect(res.status).toBe(404);
  });
});
