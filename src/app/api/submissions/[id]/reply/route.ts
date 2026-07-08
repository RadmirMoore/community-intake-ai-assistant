import { NextResponse } from "next/server";
import { isStaffAuthenticated, readStaffNameHeader } from "@/lib/auth";
import { getStore } from "@/lib/storage";
import { publishReplySchema } from "@/lib/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Publish (or revise) a staff-reviewed reply visible to the requester via /status/[id]. */
export async function POST(request: Request, { params }: RouteContext) {
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

  const parsed = publishReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const updated = await getStore().update(id, {
      publishedReply: {
        message: parsed.data.message,
        publishedAt: new Date().toISOString(),
        publishedBy: readStaffNameHeader(request),
      },
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error("Failed to publish reply:", error);
    return NextResponse.json({ error: "Failed to publish reply." }, { status: 500 });
  }
}

/** Retract a published reply — e.g. it was published in error or is out of date. */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;

  try {
    const updated = await getStore().update(id, {
      publishedReply: null,
      actor: readStaffNameHeader(request),
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error("Failed to unpublish reply:", error);
    return NextResponse.json({ error: "Failed to unpublish reply." }, { status: 500 });
  }
}
