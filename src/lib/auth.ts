import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Staff access control for the dashboard and its APIs.
 *
 * Zero-config demo mode: when DASHBOARD_PASSWORD is not set, the dashboard is
 * open so the whole workflow can be evaluated without any setup. For any real
 * deployment, set DASHBOARD_PASSWORD — intake data is sensitive.
 *
 * The session cookie stores a SHA-256 digest derived from the password, never
 * the password itself. Rotating the password invalidates all sessions.
 */

export const STAFF_COOKIE = "staff_session";
export const STAFF_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // one work day

export function isDashboardProtected(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

/** Digest stored in the session cookie. Bound to the current password. */
export function staffSessionToken(): string {
  return createHash("sha256")
    .update(`staff-session:${process.env.DASHBOARD_PASSWORD ?? ""}`)
    .digest("hex");
}

/** Constant-time password check against DASHBOARD_PASSWORD. */
export function verifyStaffPassword(candidate: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * True when the request may access staff-only data: either the dashboard is
 * unprotected (demo mode) or the session cookie carries a valid token.
 */
export async function isStaffAuthenticated(): Promise<boolean> {
  if (!isDashboardProtected()) return true;
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(staffSessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
