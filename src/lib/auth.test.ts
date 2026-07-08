import { beforeEach, describe, expect, it, vi } from "vitest";
import { isDashboardProtected, staffSessionToken, verifyStaffPassword } from "@/lib/auth";

describe("staff auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unprotected in zero-config demo mode", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "");
    expect(isDashboardProtected()).toBe(false);
  });

  it("is protected once a password is set", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "s3cret");
    expect(isDashboardProtected()).toBe(true);
  });

  it("accepts the correct password and rejects wrong ones", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "s3cret");
    expect(verifyStaffPassword("s3cret")).toBe(true);
    expect(verifyStaffPassword("wrong")).toBe(false);
    expect(verifyStaffPassword("")).toBe(false);
  });

  it("rejects everything when no password is configured", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "");
    expect(verifyStaffPassword("anything")).toBe(false);
  });

  it("derives a session token bound to the password", () => {
    vi.stubEnv("DASHBOARD_PASSWORD", "s3cret");
    const before = staffSessionToken();
    vi.stubEnv("DASHBOARD_PASSWORD", "rotated");
    const after = staffSessionToken();
    expect(before).not.toBe(after);
  });
});
