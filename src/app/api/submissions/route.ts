import { NextResponse } from "next/server";
import { isStaffAuthenticated } from "@/lib/auth";
import { getStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const store = getStore();
  try {
    const submissions = await store.list();
    return NextResponse.json({ submissions, backend: store.backend });
  } catch (error) {
    console.error("Failed to list submissions:", error);
    return NextResponse.json({ error: "Failed to load submissions." }, { status: 500 });
  }
}
