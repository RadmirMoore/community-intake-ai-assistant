import { NextResponse } from "next/server";
import { isStaffAuthenticated, readStaffNameHeader } from "@/lib/auth";
import { getStore } from "@/lib/storage";
import { statusUpdateSchema } from "@/lib/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const submission = await getStore().get(id);
  if (!submission) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ submission });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const updated = await getStore().update(id, {
      ...parsed.data,
      actor: readStaffNameHeader(request),
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error("Failed to update submission:", error);
    return NextResponse.json({ error: "Failed to update submission." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;

  try {
    const deleted = await getStore().delete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return NextResponse.json({ error: "Failed to delete submission." }, { status: 500 });
  }
}
