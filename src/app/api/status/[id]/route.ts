import { NextResponse } from "next/server";
import { checkRateLimit, clientIpFrom } from "@/lib/rate-limit";
import { getStore } from "@/lib/storage";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Looser than the other public routes, not stricter. This doesn't gate a paid
// API call or a zero-friction cost target — it's a cheap read, and a genuine
// requester may check back several times over hours or days. The real
// defense against enumeration is the submission id's own keyspace (a v4 UUID,
// ~122 bits of entropy) — this limiter only blunts scripted scraping.
const STATUS_RATE_LIMIT_MAX = 30;
const STATUS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// The id doubles as a bearer token — anyone who has it (a shared device,
// browser history, a screenshot) can read this submission's status
// indefinitely otherwise. Bounding how long the link works at all trades a
// little convenience for a real ceiling on that exposure; 90 days covers any
// realistic case-resolution timeline for this kind of request. See
// docs/RESPONSIBLE_AI.md.
const STATUS_LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// A fresh NextResponse each call, not a shared module-level instance —
// response bodies are single-read streams, so reusing one Response object
// across multiple actual requests would break after the first read.
function notFound() {
  return NextResponse.json({ error: "We couldn't find a request with that code." }, { status: 404 });
}

export async function GET(request: Request, { params }: RouteContext) {
  const limit = await checkRateLimit(
    `status:${clientIpFrom(request)}`,
    STATUS_RATE_LIMIT_MAX,
    STATUS_RATE_LIMIT_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many status checks. Please wait a few minutes and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) },
      },
    );
  }

  const { id } = await params;

  // A malformed (non-UUID) id must 404 exactly like a well-formed id with no
  // match — Supabase's `.eq("id", id)` throws on invalid UUID input instead
  // of returning null, and letting that reach a distinct error response would
  // make the status code itself an oracle for "is this a validly-formatted
  // id." One code path handles both cases identically.
  let submission;
  try {
    submission = await getStore().get(id);
  } catch {
    return notFound();
  }
  if (!submission) {
    return notFound();
  }

  // Past the TTL, the link stops working entirely (same 404 as "never
  // existed") rather than showing stale info under a confusing "still
  // reviewing" label — this is a hard expiry, not a soft one.
  const age = Date.now() - new Date(submission.createdAt).getTime();
  if (age > STATUS_LINK_TTL_MS) {
    return notFound();
  }

  // Explicit allowlist, never a spread of `submission` — this is a public,
  // unauthenticated response. The original message, contact info, staff
  // notes, triage internals, and who reviewed/published stay server-side.
  return NextResponse.json(
    {
      status: submission.status,
      createdAt: submission.createdAt,
      reply: submission.publishedReply
        ? {
            message: submission.publishedReply.message,
            publishedAt: submission.publishedReply.publishedAt,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
