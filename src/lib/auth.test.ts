import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDashboardProtected,
  readStaffNameHeader,
  staffSessionToken,
  STAFF_NAME_HEADER,
  verifyStaffPassword,
} from "@/lib/auth";

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

describe("readStaffNameHeader", () => {
  function requestWith(value: string | undefined) {
    const headers = new Headers();
    if (value !== undefined) headers.set(STAFF_NAME_HEADER, value);
    return new Request("http://localhost/api/submissions/1", { headers });
  }

  it("returns undefined when the header is absent", () => {
    expect(readStaffNameHeader(requestWith(undefined))).toBeUndefined();
  });

  it("trims and decodes the header value", () => {
    expect(readStaffNameHeader(requestWith(encodeURIComponent("  José  ")))).toBe("José");
  });

  it("treats a blank header as absent", () => {
    expect(readStaffNameHeader(requestWith("   "))).toBeUndefined();
  });

  it("caps the length so a very long header can't bloat storage", () => {
    const long = "x".repeat(200);
    expect(readStaffNameHeader(requestWith(long))?.length).toBe(80);
  });
});
