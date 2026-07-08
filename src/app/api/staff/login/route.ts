import { NextResponse } from "next/server";
import {
  STAFF_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
  isDashboardProtected,
  staffSessionToken,
  verifyStaffPassword,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDashboardProtected()) {
    return NextResponse.json({ ok: true, protected: false });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const password = typeof body === "object" && body !== null ? (body as { password?: unknown }).password : undefined;
  if (typeof password !== "string" || !verifyStaffPassword(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_COOKIE, staffSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
