import { NextResponse } from "next/server";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";
import { getStore } from "@/lib/storage";
import { triageIntake } from "@/lib/triage";
import { intakeInputSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = checkRateLimit(clientIpFrom(request));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "You have submitted several requests in a short time. Please wait a few minutes and try again — your earlier requests were received.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = intakeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const triage = await triageIntake(parsed.data);
    const submission = await getStore().create({ input: parsed.data, triage });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Intake processing failed:", error);
    return NextResponse.json(
      { error: "We could not process this request. Please try again." },
      { status: 500 },
    );
  }
}
