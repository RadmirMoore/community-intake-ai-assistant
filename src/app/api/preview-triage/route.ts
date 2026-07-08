import { NextResponse } from "next/server";
import { isPreviewPresetId, PREVIEW_PRESETS } from "@/lib/preview-presets";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";
import { triageIntake } from "@/lib/triage";
import type { IntakeInput } from "@/lib/types";

export const runtime = "nodejs";

// Tighter than /api/intake's default: this is one click from the homepage
// with no consent gate and no persisted value per call, so it's a more
// attractive target for casual API-cost abuse. Four presets exist; 3/10min
// still lets a real visitor click through all of them with room to spare.
const PREVIEW_RATE_LIMIT_MAX = 3;
const PREVIEW_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = await checkRateLimit(
    `preview-triage:${clientIpFrom(request)}`,
    PREVIEW_RATE_LIMIT_MAX,
    PREVIEW_RATE_LIMIT_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many preview requests. Please wait a few minutes and try again." },
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

  // Only a presetId is ever accepted — never a free-text message — so this
  // endpoint can't be used to run arbitrary text through Claude by calling
  // it directly instead of clicking a button in the UI.
  const presetId = typeof body === "object" && body !== null ? (body as { presetId?: unknown }).presetId : undefined;
  if (!isPreviewPresetId(presetId)) {
    return NextResponse.json({ error: "Unknown preset." }, { status: 400 });
  }

  const preset = PREVIEW_PRESETS[presetId];
  // Synthetic contact value only — the real form now requires at least one
  // of email/phone, and this demo submission should reflect what it can
  // actually produce. Contact fields don't affect triage classification.
  const input: IntakeInput = {
    fullName: "Demo Visitor",
    email: "demo@example.org",
    phone: "",
    preferredContact: "either",
    zipCode: "",
    message: preset.message,
    consent: true,
  };

  try {
    const triage = await triageIntake(input);
    return NextResponse.json({ triage });
  } catch (error) {
    console.error("Preview triage failed:", error);
    return NextResponse.json({ error: "We could not run the preview. Please try again." }, { status: 500 });
  }
}
