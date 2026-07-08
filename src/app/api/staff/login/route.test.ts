import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "@/app/api/staff/login/route";
import { STAFF_COOKIE } from "@/lib/auth";

function req(body: unknown) {
  return new Request("http://localhost/api/staff/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/staff/login", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ok without a cookie when the dashboard is unprotected", async () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "");
    const res = await POST(req({ password: "anything" }));
    const data = await res.json();
    expect(data).toEqual({ ok: true, protected: false });
    expect(res.cookies.get(STAFF_COOKIE)).toBeUndefined();
  });

  it("returns 401 on the wrong password", async () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "s3cret");
    const res = await POST(req({ password: "wrong" }));
    expect(res.status).toBe(401);
    expect(res.cookies.get(STAFF_COOKIE)).toBeUndefined();
  });

  it("sets a session cookie on the correct password", async () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "s3cret");
    const res = await POST(req({ password: "s3cret" }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(STAFF_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.value.length).toBeGreaterThan(0);
  });
});

describe("DELETE /api/staff/login", () => {
  it("clears the session cookie", async () => {
    const res = await DELETE();
    const cookie = res.cookies.get(STAFF_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
